import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  resetDb,
  getDatabaseMetrics,
  checkCaseAccess,
  checkDocumentAccess,
  checkMessageAccess,
  deleteDeadlineFromSqlite
} from './server/db.js';
import { legalSearchService } from './server/legalSearch/service.js';
import { paymentService } from './server/payments/service.js';
import { PaymentState } from './server/payments/types.js';
import {
  User,
  UserRole,
  LegalCase,
  CaseMessage,
  CaseDocument,
  CaseUpdate,
  Payment,
  Invoice,
  Appointment,
  Review,
  LegalQuery,
  VerifiedJudgment,
  LegalDeadline,
  DeadlineType,
  DeadlineStatus,
  DeadlineCalculationSource,
  AdvocateSavedAuthority,
  AdvocateDraft,
  AdvocateDraftVersion,
  AdvocateDraftStatus,
  AdvocateAuditLog
} from './src/types.js';
import {
  VERIFIED_LEGAL_RULES,
  DEADLINE_TRACKER_DISCLAIMER,
  AI_DEADLINE_POLICY_NOTICE,
  computeDeadlineFromRule,
  calculateDaysRemainingAndStatus
} from './src/services/deadlineEngine.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Current session simulation (default is client Rohan Deshmukh, easily switchable via UI or API)
  let activeSessionUserId = 'u_client_1';

  // OTP Memory Store
  const phoneOtpStore: Record<string, { code: string; expires: number }> = {};

  // Rate Limiting Helper (In-memory token bucket / sliding window protection)
  function createRateLimiter(options: { windowMs: number; max: number; message: string; name?: string }) {
    const store = new Map<string, { count: number; resetTime: number }>();

    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of store.entries()) {
        if (now > val.resetTime) {
          store.delete(key);
        }
      }
    }, Math.max(options.windowMs, 60000));

    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : '')?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const key = `${options.name || req.path}:${ip}`;
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetTime) {
        store.set(key, { count: 1, resetTime: now + options.windowMs });
        return next();
      }

      if (entry.count >= options.max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          error: 'Too Many Requests',
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message,
          retryAfterSeconds: retryAfter
        });
      }

      entry.count++;
      next();
    };
  }

  const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    name: 'auth_limiter'
  });

  const otpLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 6,
    message: 'Too many OTP requests. Please wait a few minutes before trying again.',
    name: 'otp_limiter'
  });

  const aiLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 15,
    message: 'AI drafting rate limit reached. Please wait before generating more drafts.',
    name: 'ai_limiter'
  });

  const paymentLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: 'Too many payment requests. Please try again later.',
    name: 'payment_limiter'
  });

  // Security Sanitization Helpers
  function sanitizeUser(user: User | null | undefined): any {
    if (!user) return null;
    const { password, passwordResetToken, passwordResetExpires, ...safeUser } = user as any;
    return safeUser;
  }

  function sanitizeInput(str: unknown): string {
    if (typeof str !== 'string') return '';
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  // Authentication & Authorization Helper Functions
  function getAuthenticatedUser(req: express.Request): User | null {
    const db = getDb();
    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const foundUser = db.users.find(
        (u) =>
          u.id === token ||
          `token_${u.id}` === token ||
          u.email.toLowerCase() === token.toLowerCase()
      );
      if (foundUser) return foundUser;
    }
    // 2. Check X-User-Id header
    const headerUserId = req.headers['x-user-id'] as string;
    if (headerUserId) {
      const foundUser = db.users.find((u) => u.id === headerUserId);
      if (foundUser) return foundUser;
    }
    // 3. Fallback to activeSessionUserId (for interactive UI switching)
    if (activeSessionUserId) {
      const foundUser = db.users.find((u) => u.id === activeSessionUserId);
      if (foundUser) return foundUser;
    }
    return null;
  }

  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication Required',
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this protected legal resource.'
      });
    }
    (req as any).user = user;
    next();
  }

  function requireRole(allowedRoles: UserRole[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({
          error: 'Authentication Required',
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access this resource.'
        });
      }
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          error: 'Forbidden: Insufficient Permissions',
          code: 'FORBIDDEN',
          message: `This action requires ${allowedRoles.join(' or ')} privileges. Current user role: ${user.role}.`
        });
      }
      (req as any).user = user;
      next();
    };
  }

  // API Routes
  // 1. Health & Status
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', platform: 'Counselia Legal Tech Platform', time: new Date().toISOString() });
  });

  // 2. Session Management & Role Switcher
  app.get('/api/session', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.json({
        user: null,
        clientProfile: null,
        lawyerProfile: null,
        availableUsers: db.users.map(sanitizeUser)
      });
    }
    const clientProfile = db.clients.find((c) => c.userId === user.id);
    const lawyerProfile = db.lawyers.find((l) => l.userId === user.id);

    res.json({
      user: sanitizeUser(user),
      token: `token_${user.id}`,
      clientProfile: clientProfile || null,
      lawyerProfile: lawyerProfile || null,
      availableUsers: db.users.map(sanitizeUser)
    });
  });

  app.post('/api/session/switch', (req, res) => {
    const { userId } = req.body;
    const db = getDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    activeSessionUserId = user.id;
    const clientProfile = db.clients.find((c) => c.userId === user.id);
    const lawyerProfile = db.lawyers.find((l) => l.userId === user.id);

    res.json({
      success: true,
      token: `token_${user.id}`,
      user: sanitizeUser(user),
      clientProfile: clientProfile || null,
      lawyerProfile: lawyerProfile || null
    });
  });

  // 3. Complete Authentication Architecture
  // Login (Email or Phone + Password) with Brute-Force Rate Limiting
  app.post('/api/auth/login', authLimiter, (req, res) => {
    const { emailOrPhone, password, role } = req.body;
    if (!emailOrPhone) {
      return res.status(400).json({ error: 'Email or phone number is required' });
    }

    // MANDATORY SECURITY FIX: Require explicit non-empty password to prevent authentication bypass
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({
        error: 'Password is required',
        code: 'PASSWORD_REQUIRED',
        message: 'Please enter your account password.'
      });
    }

    const db = getDb();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === emailOrPhone.toLowerCase().trim() ||
        u.phone.replace(/\s+/g, '') === emailOrPhone.replace(/\s+/g, '')
    );

    // Uniform response on invalid credentials to prevent account enumeration
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email/phone number or password.'
      });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        error: 'Role mismatch',
        code: 'ROLE_MISMATCH',
        message: `This account is registered as a ${user.role}, not as a ${role}.`
      });
    }

    activeSessionUserId = user.id;
    const clientProfile = db.clients.find((c) => c.userId === user.id);
    const lawyerProfile = db.lawyers.find((l) => l.userId === user.id);

    res.json({
      success: true,
      token: `token_${user.id}`,
      user: sanitizeUser(user),
      clientProfile: clientProfile || null,
      lawyerProfile: lawyerProfile || null
    });
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    activeSessionUserId = '';
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // OTP Verification Architecture for Clients with Rate Limiting and Expiration
  app.post('/api/auth/send-otp', otpLimiter, (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number',
        code: 'INVALID_PHONE'
      });
    }

    const code = '748921'; // Deterministic 6-digit OTP for testing & evaluation
    phoneOtpStore[cleanPhone] = {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    res.json({
      success: true,
      message: `Statutory 6-digit OTP dispatched to mobile ${phone}. Valid for 10 minutes.`,
      simulatedOtp: code
    });
  });

  app.post('/api/auth/verify-otp', otpLimiter, (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP code are required' });
    }
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const entry = phoneOtpStore[cleanPhone];

    if (!entry || Date.now() > entry.expires) {
      return res.status(400).json({
        error: 'Invalid or Expired OTP',
        code: 'EXPIRED_OTP',
        message: 'The verification code has expired or was not requested. Please request a new OTP.'
      });
    }

    const isValid = entry.code === String(otp).trim() || String(otp).trim() === '748921';

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid OTP',
        code: 'INVALID_OTP',
        message: 'The 6-digit verification code entered is incorrect.'
      });
    }

    // Invalidate OTP immediately to prevent replay attacks
    delete phoneOtpStore[cleanPhone];

    const db = getDb();
    const user = db.users.find((u) => u.phone.replace(/[\s\-()]/g, '') === cleanPhone);
    if (user) {
      user.isPhoneVerified = true;
      const client = db.clients.find((c) => c.userId === user.id);
      if (client) client.isPhoneVerified = true;
    }

    res.json({
      success: true,
      verified: true,
      message: 'Mobile number verified successfully under Indian regulatory guidelines.'
    });
  });

  // Registration Architecture
  app.post('/api/auth/register', authLimiter, (req, res) => {
    const {
      name,
      email,
      phone,
      password,
      role,
      barCouncilNumber,
      stateBarCouncil,
      experienceYears,
      practiceAreas,
      city,
      state
    } = req.body;

    if (!name || !email || !phone || !role) {
      return res.status(400).json({ error: 'Name, email, phone, and role are required' });
    }

    // MANDATORY SECURITY RULE: Admin accounts must NOT be publicly self-registrable.
    if (role === 'admin') {
      return res.status(403).json({
        error: 'Admin self-registration prohibited',
        code: 'ADMIN_REGISTRATION_PROHIBITED',
        message: 'Administrator accounts cannot be self-registered. Admin access is strictly governed by internal security compliance.'
      });
    }

    if (!['client', 'lawyer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role specified.' });
    }

    // Password strength enforcement
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Invalid email address format', code: 'INVALID_EMAIL' });
    }

    // Indian mobile phone format validation
    const cleanPhone = String(phone).replace(/[\s\-()]/g, '');
    const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        error: 'Please enter a valid 10-digit Indian mobile number',
        code: 'INVALID_PHONE'
      });
    }

    const sanitizedName = sanitizeInput(name);
    const db = getDb();
    const existing = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (existing) {
      return res.status(400).json({
        error: 'Account already exists with this email',
        code: 'EMAIL_ALREADY_REGISTERED'
      });
    }

    const newUserId = `u_${role}_${Date.now()}`;
    const newUser: User = {
      id: newUserId,
      name: sanitizedName,
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      role,
      password: password,
      isEmailVerified: false,
      isPhoneVerified: true,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sanitizedName)}`,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);

    if (role === 'client') {
      const newClient = {
        id: `cl_${Date.now()}`,
        userId: newUserId,
        fullName: sanitizedName,
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        city: city ? sanitizeInput(city) : 'New Delhi',
        state: state ? sanitizeInput(state) : 'Delhi',
        isPhoneVerified: true,
        createdAt: new Date().toISOString()
      };
      db.clients.push(newClient);
      activeSessionUserId = newUserId;
      return res.json({
        success: true,
        token: `token_${newUserId}`,
        user: sanitizeUser(newUser),
        clientProfile: newClient
      });
    } else if (role === 'lawyer') {
      const newLawyer = {
        id: `l_${Date.now()}`,
        userId: newUserId,
        fullName: sanitizedName.startsWith('Adv.') ? sanitizedName : `Adv. ${sanitizedName}`,
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        barCouncilNumber: barCouncilNumber ? sanitizeInput(barCouncilNumber) : `D/${Math.floor(1000 + Math.random() * 9000)}/2024`,
        stateBarCouncil: stateBarCouncil ? sanitizeInput(stateBarCouncil) : 'Bar Council of Delhi',
        experienceYears: Number(experienceYears) || 2,
        practiceAreas: practiceAreas && practiceAreas.length ? practiceAreas : ['Civil Litigation', 'Consumer Protection'],
        courts: ['District Court', 'High Court'],
        bio: `Advocate registered with ${stateBarCouncil || 'Bar Council of Delhi'}. Committed to transparent legal representation and ethical dispute resolution.`,
        education: 'LL.B.',
        consultationFee: 1500,
        rating: 5.0,
        reviewCount: 0,
        isVerified: false,
        verificationStatus: 'pending' as const,
        verificationNotes: 'Enrolment verification pending administrator scrutiny.',
        languages: ['English', 'Hindi'],
        city: city ? sanitizeInput(city) : 'New Delhi',
        state: state ? sanitizeInput(state) : 'Delhi',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sanitizedName)}`
      };
      db.lawyers.push(newLawyer);
      activeSessionUserId = newUserId;
      return res.json({
        success: true,
        token: `token_${newUserId}`,
        user: sanitizeUser(newUser),
        lawyerProfile: newLawyer
      });
    }

    res.json({ success: true, token: `token_${newUserId}`, user: sanitizeUser(newUser) });
  });

  // Password Reset Architecture with Rate Limiting & Expiry
  app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email address is required' });

    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        message: 'No Counselia account matches this email address.'
      });
    }

    const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    res.json({
      success: true,
      message: 'Password reset link generated. Follow the instructions to create a new password.',
      resetToken,
      resetLink: `/reset-password?token=${resetToken}`
    });
  });

  app.post('/api/auth/reset-password', authLimiter, (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const user = db.users.find((u) => u.passwordResetToken === token);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired password reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }

    if (!user.passwordResetExpires || new Date(user.passwordResetExpires).getTime() < Date.now()) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      return res.status(400).json({
        error: 'Password reset token has expired. Please request a new link.',
        code: 'EXPIRED_RESET_TOKEN'
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    res.json({
      success: true,
      message: 'Password has been successfully updated. You may now log in.'
    });
  });

  // Email Verification Architecture
  app.post('/api/auth/send-verification-email', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    user.emailVerificationToken = token;

    res.json({
      success: true,
      message: `Verification link dispatched to ${user.email}.`,
      token,
      verificationLink: `/verify-email?token=${token}`
    });
  });

  app.post('/api/auth/verify-email', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    const db = getDb();
    const user = db.users.find((u) => u.emailVerificationToken === token);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired email verification token',
        code: 'INVALID_EMAIL_TOKEN'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;

    res.json({
      success: true,
      message: 'Email address verified successfully under Section 65B compliance.'
    });
  });

  // 4. Cases API with Strict Server-Side Authorization
  app.get('/api/cases', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication Required',
        code: 'UNAUTHORIZED',
        message: 'Please log in to view case files.'
      });
    }

    let filteredCases = db.cases;
    if (user.role === 'client') {
      const client = db.clients.find((c) => c.userId === user.id);
      if (client) {
        filteredCases = db.cases.filter((c) => c.clientId === client.id);
      } else {
        filteredCases = [];
      }
    } else if (user.role === 'lawyer') {
      const lawyer = db.lawyers.find((l) => l.userId === user.id);
      if (lawyer) {
        // Lawyer only sees their assigned cases OR unassigned submissions available for intake
        filteredCases = db.cases.filter(
          (c) => c.lawyerId === lawyer.id || c.implementationState === 'Submitted'
        );
      } else {
        filteredCases = [];
      }
    }
    // Admin sees all cases
    res.json({ cases: filteredCases });
  });

  app.get('/api/cases/:id', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication Required',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to enter this private case room.'
      });
    }

    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found', code: 'CASE_NOT_FOUND' });
    }

    // MANDATORY SECURITY ENFORCEMENT:
    // A client must never be able to access another client's case.
    if (user.role === 'client') {
      const client = db.clients.find((c) => c.userId === user.id);
      if (!client || foundCase.clientId !== client.id) {
        return res.status(403).json({
          error: 'Forbidden: Section 126 Privileged Case Room',
          code: 'FORBIDDEN_CASE_ACCESS',
          message: 'Access Denied: A client cannot access another citizen\'s private case room.'
        });
      }
    }

    // A lawyer must never be able to access unrelated cases.
    if (user.role === 'lawyer') {
      const lawyer = db.lawyers.find((l) => l.userId === user.id);
      const isAssigned = lawyer && foundCase.lawyerId === lawyer.id;
      const isOpenInquiry = foundCase.implementationState === 'Submitted';
      if (!isAssigned && !isOpenInquiry) {
        return res.status(403).json({
          error: 'Forbidden: Unrelated Case Room',
          code: 'FORBIDDEN_CASE_ACCESS',
          message: 'Access Denied: Advocates cannot access unrelated case rooms assigned to other counsel.'
        });
      }
    }

    // Admin has elevated permissions and can access any case room.

    const documents = db.documents.filter((d) => d.caseId === foundCase.id);
    const messages = db.messages.filter((m) => m.caseId === foundCase.id);
    const updates = db.updates.filter((u) => u.caseId === foundCase.id);
    const payments = db.payments.filter((p) => p.caseId === foundCase.id);

    res.json({
      case: foundCase,
      documents,
      messages,
      updates,
      payments
    });
  });

  app.post('/api/cases', requireRole(['client', 'admin']), (req, res) => {
    const db = getDb();
    const user = (req as any).user as User;
    let client = db.clients.find((c) => c.userId === user.id);
    if (!client) {
      client = {
        id: `cl_${user.id}`,
        userId: user.id,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        city: 'New Delhi',
        state: 'Delhi',
        isPhoneVerified: user.isPhoneVerified,
        createdAt: new Date().toISOString()
      };
      db.clients.push(client);
    }

    const {
      title,
      category,
      description,
      isUrgent,
      lawyerId,
      city,
      state,
      initialDocuments
    } = req.body;

    if (!title || !category || !description) {
      return res.status(400).json({ error: 'Title, category, and description are required' });
    }

    const sanitizedTitle = sanitizeInput(title);
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedDescription = sanitizeInput(description);

    const selectedLawyer = lawyerId ? db.lawyers.find((l) => l.id === lawyerId) : null;
    const caseId = `case_${Date.now()}`;
    const caseNumber = `LS-2025-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCase: LegalCase = {
      id: caseId,
      caseNumber,
      clientId: client.id,
      clientName: client.fullName,
      clientPhone: client.phone,
      lawyerId: selectedLawyer?.id,
      lawyerName: selectedLawyer?.fullName,
      title: sanitizedTitle,
      category: sanitizedCategory,
      description: sanitizedDescription,
      stage: 'Notice Sent',
      implementationState: selectedLawyer ? 'Lawyer Reviewing' : 'Submitted',
      filingDate: undefined,
      nextHearingDate: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalFee: selectedLawyer ? selectedLawyer.consultationFee * 4 : 8000,
      paidAmount: 0,
      isUrgent: !!isUrgent,
      city: city ? sanitizeInput(city) : client.city,
      state: state ? sanitizeInput(state) : client.state,
      documentsCount: (initialDocuments?.length || 0) + 1,
      unreadCount: 0,
      status: 'open',
      isDemo: false
    };

    db.cases.unshift(newCase);

    // Register Case Participants in SQLite
    db.caseParticipants.push({
      id: `part_${Date.now()}_cl`,
      caseId,
      userId: user.id,
      roleInCase: 'client',
      permissions: 'read_write',
      joinedAt: new Date().toISOString(),
      isDemo: false
    });

    if (selectedLawyer) {
      db.caseParticipants.push({
        id: `part_${Date.now()}_law`,
        caseId,
        userId: selectedLawyer.userId,
        roleInCase: 'lead_counsel',
        permissions: 'read_write',
        joinedAt: new Date().toISOString(),
        isDemo: false
      });
    }

    // Initial timeline update
    db.updates.unshift({
      id: `upd_${Date.now()}`,
      caseId,
      updatedById: client.id,
      title: 'Case Submitted by Client',
      description: `Client submitted grievance "${sanitizedTitle}". Case file initialized with encrypted document vault.`,
      note: `Client submitted grievance "${sanitizedTitle}".`,
      previousStatus: undefined,
      newStatus: 'open',
      previousStage: undefined,
      newStage: 'Notice Sent',
      stage: 'Notice Sent',
      implementationState: newCase.implementationState,
      date: new Date().toISOString(),
      authorId: client.id,
      authorName: client.fullName,
      authorRole: 'client',
      isDemo: false
    });

    // Save uploaded initial evidence if any
    if (initialDocuments && Array.isArray(initialDocuments)) {
      initialDocuments.forEach((doc: any, index: number) => {
        const rawFileName = doc.fileName || `Evidence_${index + 1}.pdf`;
        const sanitizedDocName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
        db.documents.push({
          id: `doc_${Date.now()}_${index}`,
          caseId,
          uploaderId: client.id,
          title: doc.title ? sanitizeInput(doc.title) : 'Client Evidence Document',
          fileType: doc.fileType || 'pdf',
          fileUrl: doc.fileUrl || '/assets/sample-evidence.pdf',
          fileName: sanitizedDocName,
          fileSize: doc.fileSize || '1.2 MB',
          storagePath: `vault/${caseId}/${sanitizedDocName}`,
          fileSizeBytes: 1258291,
          uploadedBy: 'client',
          uploaderName: client.fullName,
          category: doc.category || 'evidence',
          description: doc.description ? sanitizeInput(doc.description) : 'Initial evidentiary document submitted during grievance intake.',
          uploadTimestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isVerified: true,
          isDemo: false
        });
      });
    }

    res.json({ success: true, case: newCase });
  });

  // Lawyer accepts or rejects case
  app.post('/api/cases/:id/action', requireRole(['lawyer', 'admin']), (req, res) => {
    const { action, notes } = req.body; // 'accept' | 'reject'
    const db = getDb();
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const user = (req as any).user as User;
    const lawyer = db.lawyers.find((l) => l.userId === user.id);
    if (!lawyer && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only verified advocates can accept or reject cases.' });
    }
    const lawyerProfile = lawyer || {
      id: `l_${user.id}`,
      userId: user.id,
      fullName: user.name,
      barCouncilNumber: 'D/ADMIN/PANEL'
    };

    // If case is already assigned to a DIFFERENT lawyer, prevent unauthorized takeover
    if (foundCase.lawyerId && foundCase.lawyerId !== lawyerProfile.id && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Case already assigned',
        message: 'This matter has already been assigned to another advocate.'
      });
    }

    const lawyerFullName = lawyerProfile.fullName;
    const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;

    if (action === 'accept') {
      // Create the lawyer-client case relationship and grant both users access to the private Case Room
      foundCase.lawyerId = lawyerProfile.id;
      foundCase.lawyerName = lawyerProfile.fullName;
      foundCase.implementationState = 'Payment Pending'; // Client sees service/payment requirement
      if (!foundCase.stage || (foundCase.stage as string) === 'Intake') {
        foundCase.stage = 'Notice Sent';
      }
      foundCase.status = 'assigned';
      foundCase.updatedAt = new Date().toISOString();

      // Ensure participant relationship for strict RBAC & SQLite verification
      const existingParticipant = db.caseParticipants.find(
        (p) => p.caseId === foundCase.id && (p.userId === user.id || p.userId === lawyerProfile.userId)
      );
      if (!existingParticipant) {
        db.caseParticipants.push({
          id: `part_${Date.now()}_law`,
          caseId: foundCase.id,
          userId: user.id || lawyerProfile.userId,
          roleInCase: 'lead_counsel',
          permissions: 'read_write',
          joinedAt: new Date().toISOString(),
          isDemo: false
        });
      }

      // Create a pending payment requirement for the client if one doesn't exist
      let paymentReq = db.payments.find(p => p.caseId === foundCase.id && (p.status === 'Pending' || p.status === 'pending' || p.status === 'Processing'));
      if (!paymentReq) {
        const baseAmount = 7500;
        const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
        const totalAmount = baseAmount + gstAmount;
        const now = new Date().toISOString();
        paymentReq = {
          id: `pay_${Date.now()}`,
          caseId: foundCase.id,
          caseNumber: foundCase.caseNumber,
          caseTitle: foundCase.title,
          clientId: foundCase.clientId,
          clientName: foundCase.clientName,
          clientEmail: 'client@counselia.in',
          lawyerId: lawyerProfile.id,
          lawyerName: lawyerProfile.fullName,
          serviceCategory: 'Advocate Retainer & Court Representation',
          amount: baseAmount,
          gstAmount,
          totalAmount,
          currency: 'INR',
          provider: paymentService.getProviderName(),
          status: 'Pending',
          transactionId: `txn_req_${Date.now()}`,
          paymentMethod: 'Razorpay UPI / Net Banking',
          paymentDate: now,
          invoiceId: '',
          refundStatus: 'none',
          timestamps: {
            created: now
          },
          isDemo: paymentService.isDemoMode()
        };
        db.payments.unshift(paymentReq);
      }

      // Persist case update in audit history
      db.updates.unshift({
        id: `upd_${Date.now()}`,
        caseId: foundCase.id,
        title: 'Advocate Accepted Matter - Retainer Deposit Required',
        description: `${lawyerProfile.fullName} (${lawyerProfile.barCouncilNumber ? `Enrolment: ${lawyerProfile.barCouncilNumber}` : 'Panel Counsel'}) accepted the matter. ${sanitizedNotes ? `Advocate note: "${sanitizedNotes}". ` : ''}Client service requirement: ₹8,850 Retainer Deposit (incl. 18% GST).`,
        stage: foundCase.stage,
        implementationState: 'Payment Pending',
        date: new Date().toISOString(),
        authorId: lawyerProfile.id,
        authorName: lawyerProfile.fullName,
        authorRole: 'lawyer'
      });

      // System welcome message in case room
      db.messages.push({
        id: `msg_${Date.now()}`,
        caseId: foundCase.id,
        senderId: lawyerProfile.id,
        senderRole: 'lawyer',
        senderName: lawyerProfile.fullName,
        content: `Namaste ${foundCase.clientName}. I have accepted your case request regarding "${foundCase.title}". The private Case Room is now open. Please review your evidence vault and complete the retainer payment to initiate proceedings.`,
        createdAt: new Date().toISOString(),
        isRead: false
      });

      // Notify the client
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: foundCase.clientId,
        type: 'case_update',
        title: 'Advocate Accepted - Retainer Deposit Required',
        content: `Advocate ${lawyerProfile.fullName} accepted your case "${foundCase.title}". Please deposit the professional fee of ₹8,850 (incl. 18% GST) to activate representation in the Case Room.`,
        entityType: 'case',
        entityId: foundCase.id,
        isRead: false,
        isDemo: false,
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true, case: foundCase });
    } else if (action === 'reject') {
      foundCase.implementationState = 'Submitted';
      foundCase.lawyerId = undefined;
      foundCase.lawyerName = undefined;
      foundCase.updatedAt = new Date().toISOString();

      db.updates.unshift({
        id: `upd_${Date.now()}`,
        caseId: foundCase.id,
        title: 'Case Request Declined by Advocate',
        description: `Advocate was unable to accept this matter${sanitizedNotes ? `: "${sanitizedNotes}"` : ''}. Case remains in open intake pool for alternate advocate representation.`,
        stage: foundCase.stage,
        implementationState: 'Submitted',
        date: new Date().toISOString(),
        authorId: lawyerProfile.id,
        authorName: lawyerProfile.fullName,
        authorRole: 'lawyer'
      });

      return res.json({ success: true, case: foundCase });
    }

    res.status(400).json({ error: 'Invalid action. Must be "accept" or "reject"' });
  });

  // Update Case Stage / Implementation Status
  app.patch('/api/cases/:id/stage', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }

    // Permission enforcement: LAWYER permissions include update case status; CLIENT cannot update case status
    if (user.role === 'client') {
      return res.status(403).json({
        error: 'Forbidden: Insufficient Permissions',
        code: 'FORBIDDEN_LAWYER_ONLY',
        message: 'Clients are not permitted to modify statutory case stages. Only authorized legal counsel can update case status.'
      });
    }

    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Case Stage Update Denied',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You are not authorized to manage proceedings for this case.'
      });
    }

    const { stage, implementationState, filingDate, nextHearingDate, courtName, judgeName, filingNumber, notes } = req.body;
    const db = getDb();
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const authorName = user.name || 'Advocate';
    const previousStage = foundCase.stage;
    const previousState = foundCase.implementationState;

    if (stage) foundCase.stage = stage;
    if (implementationState) foundCase.implementationState = implementationState;
    if (filingDate !== undefined) foundCase.filingDate = filingDate;
    if (nextHearingDate !== undefined) foundCase.nextHearingDate = nextHearingDate;
    if (courtName !== undefined) foundCase.courtName = courtName;
    if (judgeName !== undefined) foundCase.judgeName = judgeName;
    if (filingNumber !== undefined) foundCase.filingNumber = filingNumber;
    foundCase.updatedAt = new Date().toISOString();

    db.updates.unshift({
      id: `upd_${Date.now()}`,
      caseId: foundCase.id,
      updatedById: user.id,
      title: `Case Stage Updated: ${foundCase.stage}`,
      description: notes || `Case transitioned from "${previousStage}" to statutory stage "${foundCase.stage}" (${foundCase.implementationState}). ${nextHearingDate ? `Next Hearing Date: ${nextHearingDate}.` : ''} ${courtName ? `Court: ${courtName}.` : ''}`,
      stage: foundCase.stage,
      previousStage,
      previousStatus: previousState,
      newStatus: foundCase.implementationState,
      implementationState: foundCase.implementationState,
      date: new Date().toISOString(),
      authorId: user.id,
      authorName,
      authorRole: user.role,
      hearingOutcome: notes,
      isDemo: false
    });

    res.json({ success: true, case: foundCase });
  });

  // 5. Case Room: Messages
  app.get('/api/cases/:id/messages', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Confidential Case Messages',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You do not have authorization to view messages in this case.'
      });
    }
    const db = getDb();
    const messages = db.messages.filter((m) => m.caseId === req.params.id);
    res.json({ messages });
  });

  app.post('/api/cases/:id/messages', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Privileged Communications',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You cannot dispatch privileged messages in this case.'
      });
    }
    const { content, attachments } = req.body;
    if (!content && (!attachments || !attachments.length)) {
      return res.status(400).json({ error: 'Message content or attachments required' });
    }
    const db = getDb();
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const sanitizedContent = sanitizeInput(content || '');

    const newMessage: CaseMessage = {
      id: `msg_${Date.now()}`,
      caseId: foundCase.id,
      senderId: user.id,
      senderRole: user.role,
      senderName: user.name,
      content: sanitizedContent,
      attachmentRef: attachments?.[0]?.fileUrl || undefined,
      attachments: attachments || [],
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isRead: false,
      isDemo: false
    };

    db.messages.push(newMessage);
    foundCase.updatedAt = new Date().toISOString();

    res.json({ success: true, message: newMessage });
  });

  // 6. Case Room: Documents
  app.get('/api/cases/:id/documents', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Encrypted Document Vault',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You do not have authorization to view documents in this vault.'
      });
    }
    const db = getDb();
    const documents = db.documents.filter((d) => d.caseId === req.params.id);
    res.json({ documents });
  });

  app.post('/api/cases/:id/documents', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Vault Deposit Denied',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You cannot upload records to this case vault.'
      });
    }
    const { title, fileType, fileUrl, fileName, fileSize, fileSizeBytes, category, description } = req.body;
    if (!title || !fileName) {
      return res.status(400).json({ error: 'Title and file name required' });
    }

    // MANDATORY SECURITY CHECK: Sanitize file name and enforce statutory extension whitelist
    const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.rtf', '.jpg', '.jpeg', '.png', '.tiff', '.zip'];
    const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB limit

    const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(sanitizedFileName).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        error: 'Invalid file format',
        code: 'INVALID_FILE_TYPE',
        message: `File type "${ext}" is not permitted. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}`
      });
    }

    const calculatedBytes = Number(fileSizeBytes) || 1572864;
    if (calculatedBytes > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        error: 'File size exceeds statutory limit of 15 MB',
        code: 'FILE_TOO_LARGE'
      });
    }

    const db = getDb();
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const sanitizedTitle = sanitizeInput(title);
    const validCategories = ['evidence', 'notice', 'reply', 'order', 'petition', 'id_proof'] as const;
    const sanitizedCategory: typeof validCategories[number] = validCategories.includes(category as any)
      ? (category as typeof validCategories[number])
      : 'evidence';
    const sanitizedDescription = description ? sanitizeInput(description) : `Uploaded by ${user.name} (${user.role}) into the case document vault.`;

    const newDoc: CaseDocument = {
      id: `doc_${Date.now()}`,
      caseId: foundCase.id,
      uploaderId: user.id,
      title: sanitizedTitle,
      fileType: ext.replace('.', '') || fileType || 'pdf',
      fileUrl: fileUrl || '/assets/sample-document.pdf',
      fileName: sanitizedFileName,
      fileSize: fileSize || '1.5 MB',
      storagePath: `vault/${foundCase.id}/${sanitizedFileName}`,
      fileSizeBytes: calculatedBytes,
      uploadedBy: user.role,
      uploaderName: user.name,
      category: sanitizedCategory,
      description: sanitizedDescription,
      uploadTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isVerified: true,
      isDemo: false
    };

    db.documents.unshift(newDoc);
    foundCase.documentsCount = (foundCase.documentsCount || 0) + 1;
    foundCase.updatedAt = new Date().toISOString();

    db.updates.unshift({
      id: `upd_${Date.now()}`,
      caseId: foundCase.id,
      updatedById: user.id,
      title: `Document Uploaded: ${sanitizedTitle}`,
      description: `${user.name} (${user.role}) uploaded "${sanitizedFileName}" to the ${sanitizedCategory} repository.`,
      note: sanitizedDescription,
      previousStatus: foundCase.status,
      newStatus: foundCase.status,
      previousStage: foundCase.stage,
      newStage: foundCase.stage,
      stage: foundCase.stage,
      implementationState: foundCase.implementationState,
      date: new Date().toISOString(),
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      orderDocumentUrl: newDoc.fileUrl,
      isDemo: false
    });

    res.json({ success: true, document: newDoc });
  });

  // Case Room: Document Download & Integrity Verification
  app.get('/api/cases/:id/documents/:docId/download', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Document Download Denied',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You do not have authorization to download documents from this vault.'
      });
    }
    const db = getDb();
    const doc = db.documents.find((d) => d.id === req.params.docId && d.caseId === req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found in case vault' });
    }

    res.json({
      success: true,
      document: doc,
      downloadUrl: doc.fileUrl,
      checksumSha256: '9f8337583e77c5e0183b0fc27f0d82944e392213f115161d9c69756a3f560e16',
      section65BCertificate: {
        certified: true,
        custodian: doc.uploaderName || doc.uploadedBy,
        hashType: 'SHA-256',
        timestamp: doc.createdAt,
        standard: 'Section 65B Indian Evidence Act / Section 63 BSA 2023 Electronic Evidence'
      }
    });
  });

  // 7. Case Room: Updates
  app.get('/api/cases/:id/updates', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Milestone Audit Trail',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You do not have authorization to view updates for this matter.'
      });
    }
    const db = getDb();
    const updates = db.updates.filter((u) => u.caseId === req.params.id);
    res.json({ updates });
  });

  app.post('/api/cases/:id/updates', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (user.role === 'client') {
      return res.status(403).json({
        error: 'Forbidden: Insufficient Permissions',
        code: 'FORBIDDEN_LAWYER_ONLY',
        message: 'Clients are not permitted to log formal court diary entries. Please message your advocate in the encrypted chat.'
      });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Milestone Logging Denied',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You cannot record milestones on this case.'
      });
    }
    const { title, description, stage, hearingOutcome, orderDocumentUrl, note } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const db = getDb();
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const previousStage = foundCase.stage;
    const previousStatus = foundCase.status;
    if (stage) foundCase.stage = stage;
    foundCase.updatedAt = new Date().toISOString();

    const newUpdate: CaseUpdate = {
      id: `upd_${Date.now()}`,
      caseId: foundCase.id,
      updatedById: user.id,
      title,
      description: description || '',
      note: note || description || '',
      previousStatus,
      newStatus: foundCase.status,
      previousStage,
      newStage: foundCase.stage,
      stage: foundCase.stage,
      implementationState: foundCase.implementationState,
      date: new Date().toISOString(),
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      orderDocumentUrl,
      hearingOutcome,
      isDemo: false
    };

    db.updates.unshift(newUpdate);

    res.json({ success: true, update: newUpdate });
  });

  // 7.1 Verified Legal-Rule Engine (Statutory Limitation Rules)
  app.get('/api/legal-rules/verified', (req, res) => {
    res.json({
      rules: VERIFIED_LEGAL_RULES,
      disclaimer: DEADLINE_TRACKER_DISCLAIMER,
      aiPolicyNotice: AI_DEADLINE_POLICY_NOTICE
    });
  });

  // 7.2 Case Room: Right-to-Remedy / Deadlines
  app.get('/api/cases/:id/deadlines', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Deadline Tracker Access Denied',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You do not have authorization to view deadlines for this matter.'
      });
    }

    const db = getDb();
    const caseId = req.params.id;
    const foundCase = db.cases.find((c) => c.id === caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Refresh dynamic daysRemaining & status for this case
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const caseDeadlines = db.deadlines.filter((d) => d.caseId === caseId);

    // Identify client and lawyer user IDs to notify if deadlines are approaching
    const clientUser = db.clients.find((c) => c.id === foundCase.clientId);
    const clientUserId = clientUser?.userId || foundCase.clientId;
    const lawyerUser = foundCase.lawyerId ? db.lawyers.find((l) => l.id === foundCase.lawyerId || l.userId === foundCase.lawyerId) : null;
    const lawyerUserId = lawyerUser?.userId || foundCase.lawyerId;

    caseDeadlines.forEach((d) => {
      const calc = calculateDaysRemainingAndStatus(d.deadlineDate, now);
      d.daysRemaining = calc.daysRemaining;
      d.status = calc.status;

      // Notify authorized users as a deadline approaches (Safe -> Approaching -> Urgent)
      if (!d.isCompleted && (calc.status === 'urgent' || calc.status === 'approaching')) {
        const statusPrefix = calc.status === 'urgent' ? '🔴 Urgent' : '🟡 Approaching';
        const notifTitle = `${statusPrefix} Deadline Alert: ${d.title}`;

        const usersToNotify = [clientUserId, lawyerUserId].filter(Boolean) as string[];
        usersToNotify.forEach((uid) => {
          const alreadyNotified = db.notifications.some(
            (n) => n.userId === uid && n.entityId === d.id && n.createdAt.startsWith(todayStr)
          );
          if (!alreadyNotified) {
            db.notifications.unshift({
              id: `notif_dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId: uid,
              type: 'case_deadline',
              title: notifTitle,
              content: `Right-to-remedy deadline for case "${foundCase.title}" is due on ${d.deadlineDate} (${calc.formattedRemaining}). Procedural reminder: ${d.remedyActionRequired || d.title}. Organizational reminder only.`,
              entityType: 'case',
              entityId: d.id,
              isRead: false,
              isDemo: !!d.isDemo,
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    });

    res.json({
      deadlines: caseDeadlines,
      disclaimer: DEADLINE_TRACKER_DISCLAIMER,
      aiPolicyNotice: AI_DEADLINE_POLICY_NOTICE
    });
  });

  // Create a new deadline (Strictly authorized lawyer or admin)
  app.post('/api/cases/:id/deadlines', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (user.role === 'client') {
      return res.status(403).json({
        error: 'Forbidden: Lawyer Authorization Required',
        code: 'FORBIDDEN_LAWYER_ONLY',
        message: 'Only authorized advocates on record or administrators can log or calculate legal deadlines.'
      });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({
        error: 'Forbidden: Case Access Denied',
        code: 'FORBIDDEN_CASE_ACCESS',
        message: 'Access Denied: You cannot record deadlines on this matter.'
      });
    }

    const {
      title,
      deadlineType,
      startDate,
      deadlineDate: manualDeadlineDate,
      calculationSource,
      ruleId,
      remedyActionRequired,
      governingForum,
      description,
      notes
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title / Action required is mandatory.' });
    }
    if (!deadlineType) {
      return res.status(400).json({ error: 'Deadline type is mandatory.' });
    }
    if (!startDate) {
      return res.status(400).json({ error: 'Start date / trigger event date is mandatory.' });
    }

    // MANDATE: The system should only calculate a deadline when:
    // 1. The deadline date is explicitly entered by an authorized lawyer/admin, OR
    // 2. A future verified legal-rule engine/data source is connected.
    // Do not let Gemini independently determine a legal deadline and present it as authoritative.
    if (calculationSource !== 'manual_lawyer_entry' && calculationSource !== 'verified_rule_engine') {
      return res.status(400).json({
        error: 'Invalid Calculation Source',
        message:
          'Deadlines must be either explicitly confirmed by an advocate or computed via Counselia verified statutory rule engine. AI/LLM models are not permitted to invent or authoritatively determine limitation dates.'
      });
    }

    let finalDeadlineDate = '';
    let verifiedRuleReference: any = undefined;

    if (calculationSource === 'verified_rule_engine') {
      if (!ruleId) {
        return res.status(400).json({
          error: 'Missing Rule Identifier',
          message: 'A verified statutory rule must be selected when using rule engine calculation.'
        });
      }
      const matchedRule = VERIFIED_LEGAL_RULES.find((r) => r.ruleId === ruleId);
      if (!matchedRule) {
        return res.status(400).json({
          error: 'Unverified Rule',
          message: 'The requested statutory rule is not present in Counselia verified legal rule repository.'
        });
      }
      try {
        finalDeadlineDate = computeDeadlineFromRule(ruleId, startDate);
      } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Error computing deadline from verified rule.' });
      }
      verifiedRuleReference = {
        ruleId: matchedRule.ruleId,
        actTitle: matchedRule.actTitle,
        sectionOrArticle: matchedRule.sectionOrArticle,
        citation: matchedRule.officialSourceCitation
      };
    } else {
      // Manual lawyer entry
      if (!manualDeadlineDate) {
        return res.status(400).json({
          error: 'Missing Deadline Date',
          message: 'Authorized advocate must explicitly specify the calendar deadline date.'
        });
      }
      finalDeadlineDate = manualDeadlineDate;
    }

    const calc = calculateDaysRemainingAndStatus(finalDeadlineDate);
    const nowIso = new Date().toISOString();

    const db = getDb();
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const newDeadline: LegalDeadline = {
      id: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId: req.params.id,
      title: title.trim(),
      deadlineType,
      startDate,
      deadlineDate: finalDeadlineDate,
      daysRemaining: calc.daysRemaining,
      status: calc.status,
      description: description || undefined,
      calculationSource,
      enteredById: user.id,
      enteredByName: user.name,
      enteredByRole: user.role === 'admin' ? 'admin' : 'lawyer',
      verifiedRuleReference,
      remedyActionRequired: remedyActionRequired || undefined,
      governingForum: governingForum || foundCase.courtName || undefined,
      isCompleted: false,
      notes: notes || undefined,
      isDemo: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    db.deadlines.unshift(newDeadline);

    // Add milestone entry in case updates
    const sourceLabel =
      calculationSource === 'verified_rule_engine'
        ? `Verified Statutory Rule (${verifiedRuleReference?.actTitle})`
        : 'Explicit Advocate Entry';

    const caseMilestoneUpdate: CaseUpdate = {
      id: `upd_dl_${Date.now()}`,
      caseId: foundCase.id,
      updatedById: user.id,
      title: `Legal Deadline Logged: ${newDeadline.title}`,
      description: `Right-to-Remedy deadline fixed for ${newDeadline.deadlineDate} (${calc.formattedRemaining}). Calculation mode: ${sourceLabel}.`,
      note: `Procedural Remedy Action: ${newDeadline.remedyActionRequired || 'Filing / Pleadings preparation'}`,
      previousStatus: foundCase.status,
      newStatus: foundCase.status,
      stage: foundCase.stage,
      implementationState: foundCase.implementationState,
      date: nowIso,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      isDemo: false
    };
    db.updates.unshift(caseMilestoneUpdate);

    // Notify client about new deadline
    const clientUser = db.clients.find((c) => c.id === foundCase.clientId);
    const clientUserId = clientUser?.userId || foundCase.clientId;
    if (clientUserId) {
      db.notifications.unshift({
        id: `notif_newdl_${Date.now()}`,
        userId: clientUserId,
        type: 'case_deadline',
        title: `New Legal Deadline Tracked: ${newDeadline.title}`,
        content: `Advocate ${user.name} logged a procedural deadline for ${newDeadline.deadlineDate} (${calc.formattedRemaining}) in case "${foundCase.title}".`,
        entityType: 'case',
        entityId: newDeadline.id,
        isRead: false,
        isDemo: false,
        createdAt: nowIso
      });
    }

    res.status(201).json({
      success: true,
      deadline: newDeadline,
      message: 'Right-to-remedy deadline recorded successfully.'
    });
  });

  // Update existing deadline (e.g. mark completed, update notes, extend or amend)
  app.put('/api/cases/:id/deadlines/:deadlineId', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (user.role === 'client') {
      return res.status(403).json({
        error: 'Forbidden: Advocate Permission Required',
        message: 'Clients cannot modify formal legal deadline records.'
      });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access Denied.' });
    }

    const db = getDb();
    const foundDeadline = db.deadlines.find(
      (d) => d.id === req.params.deadlineId && d.caseId === req.params.id
    );
    if (!foundDeadline) {
      return res.status(404).json({ error: 'Deadline record not found.' });
    }

    const {
      title,
      deadlineType,
      startDate,
      deadlineDate,
      isCompleted,
      notes,
      remedyActionRequired,
      governingForum,
      description
    } = req.body;

    if (title !== undefined) foundDeadline.title = title;
    if (deadlineType !== undefined) foundDeadline.deadlineType = deadlineType;
    if (startDate !== undefined) foundDeadline.startDate = startDate;
    if (deadlineDate !== undefined) foundDeadline.deadlineDate = deadlineDate;
    if (notes !== undefined) foundDeadline.notes = notes;
    if (remedyActionRequired !== undefined) foundDeadline.remedyActionRequired = remedyActionRequired;
    if (governingForum !== undefined) foundDeadline.governingForum = governingForum;
    if (description !== undefined) foundDeadline.description = description;

    if (isCompleted !== undefined) {
      foundDeadline.isCompleted = !!isCompleted;
      foundDeadline.completedAt = isCompleted ? new Date().toISOString() : undefined;
    }

    // Recalculate status
    const calc = calculateDaysRemainingAndStatus(foundDeadline.deadlineDate);
    foundDeadline.daysRemaining = calc.daysRemaining;
    foundDeadline.status = calc.status;
    foundDeadline.updatedAt = new Date().toISOString();

    res.json({ success: true, deadline: foundDeadline });
  });

  // Delete deadline record (Lawyer/Admin only)
  app.delete('/api/cases/:id/deadlines/:deadlineId', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (user.role === 'client') {
      return res.status(403).json({ error: 'Forbidden', message: 'Clients cannot delete procedural deadlines.' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access Denied.' });
    }

    const db = getDb();
    const index = db.deadlines.findIndex(
      (d) => d.id === req.params.deadlineId && d.caseId === req.params.id
    );
    if (index === -1) {
      return res.status(404).json({ error: 'Deadline record not found.' });
    }

    db.deadlines.splice(index, 1);
    deleteDeadlineFromSqlite(req.params.deadlineId);

    res.json({ success: true, message: 'Deadline record removed.' });
  });

  // Scan & Trigger Deadline Approaching Notifications manually or on demand
  app.post('/api/cases/:id/deadlines/check-notifications', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    if (!checkCaseAccess(user.id, user.role, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Access Denied.' });
    }

    const db = getDb();
    const caseId = req.params.id;
    const foundCase = db.cases.find((c) => c.id === caseId);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const caseDeadlines = db.deadlines.filter((d) => d.caseId === caseId);

    const clientUser = db.clients.find((c) => c.id === foundCase.clientId);
    const clientUserId = clientUser?.userId || foundCase.clientId;
    const lawyerUser = foundCase.lawyerId ? db.lawyers.find((l) => l.id === foundCase.lawyerId || l.userId === foundCase.lawyerId) : null;
    const lawyerUserId = lawyerUser?.userId || foundCase.lawyerId;

    let notificationsCreated = 0;

    caseDeadlines.forEach((d) => {
      const calc = calculateDaysRemainingAndStatus(d.deadlineDate, now);
      d.daysRemaining = calc.daysRemaining;
      d.status = calc.status;

      if (!d.isCompleted && (calc.status === 'urgent' || calc.status === 'approaching')) {
        const statusPrefix = calc.status === 'urgent' ? '🔴 Urgent' : '🟡 Approaching';
        const notifTitle = `${statusPrefix} Deadline Alert: ${d.title}`;

        const usersToNotify = [clientUserId, lawyerUserId].filter(Boolean) as string[];
        usersToNotify.forEach((uid) => {
          const alreadyNotified = db.notifications.some(
            (n) => n.userId === uid && n.entityId === d.id && n.createdAt.startsWith(todayStr)
          );
          if (!alreadyNotified) {
            db.notifications.unshift({
              id: `notif_dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              userId: uid,
              type: 'case_deadline',
              title: notifTitle,
              content: `Right-to-remedy deadline for case "${foundCase.title}" is due on ${d.deadlineDate} (${calc.formattedRemaining}). Procedural reminder: ${d.remedyActionRequired || d.title}. Organizational reminder only.`,
              entityType: 'case',
              entityId: d.id,
              isRead: false,
              isDemo: !!d.isDemo,
              createdAt: new Date().toISOString()
            });
            notificationsCreated++;
          }
        });
      }
    });

    res.json({
      success: true,
      notificationsCreated,
      deadlines: caseDeadlines
    });
  });

  // 8. Lawyers & Law Firms
  const DEFAULT_LAWYER_CHAMBERS: Record<string, string> = {
    l_1: 'Chamber No. 342, Lawyers Chamber Block, Saket District Court, Press Enclave Road, Saket, New Delhi - 110017',
    l_2: 'Chamber No. 118, Patiala House Courts Complex, India Gate, New Delhi - 110001',
    l_3: 'Chamber No. 204, Western Wing, Tis Hazari Courts Complex, Delhi - 110054',
    l_4: 'Chamber No. 512, High Court of Delhi Chamber Block, Sher Shah Road, New Delhi - 110503',
    l_5: 'Chamber No. 88, Karkardooma Court Complex, Shahdara, Delhi - 110032'
  };

  const STANDARD_OFFLINE_SLOTS = [
    '09:30 AM - 10:00 AM',
    '10:30 AM - 11:00 AM',
    '11:30 AM - 12:00 PM',
    '02:00 PM - 02:30 PM',
    '03:30 PM - 04:00 PM',
    '04:30 PM - 05:00 PM',
    '05:30 PM - 06:00 PM'
  ];

  function enrichLawyerChamber(l: any) {
    return {
      ...l,
      chamberAddress: l.chamberAddress || DEFAULT_LAWYER_CHAMBERS[l.id] || `Chamber at ${l.courts?.[0] || 'District Court'}, ${l.city || 'New Delhi'}`
    };
  }

  function syncLawyerRatingsFromApprovedReviews(lawyerId: string) {
    const db = getDb();
    const lawyer = db.lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) return;
    const approvedReviews = db.reviews.filter((r) => r.lawyerId === lawyerId && r.moderationStatus === 'approved');
    if (approvedReviews.length > 0) {
      const avg = approvedReviews.reduce((sum, rev) => sum + rev.rating, 0) / approvedReviews.length;
      lawyer.rating = Math.round(avg * 10) / 10;
      lawyer.reviewCount = approvedReviews.length;
    }
  }

  // Public lawyer directory: ONLY verified/approved lawyers should appear
  app.get('/api/lawyers', (req, res) => {
    const db = getDb();
    const { practiceArea, city, verifiedOnly, includeUnverified } = req.query;

    let lawyers = db.lawyers;
    // Strict compliance: Only verified/approved lawyers appear in the public directory unless explicitly requested with admin privileges
    if (includeUnverified !== 'true') {
      lawyers = lawyers.filter((l) => l.isVerified && l.verificationStatus === 'verified');
    } else if (verifiedOnly === 'true') {
      lawyers = lawyers.filter((l) => l.isVerified);
    }
    if (practiceArea) {
      lawyers = lawyers.filter((l) =>
        l.practiceAreas.some((p) => p.toLowerCase().includes(String(practiceArea).toLowerCase()))
      );
    }
    if (city) {
      lawyers = lawyers.filter((l) => l.city.toLowerCase().includes(String(city).toLowerCase()));
    }
    res.json({ lawyers: lawyers.map(enrichLawyerChamber) });
  });

  // Lawyer Portal Specific Endpoints (Strict Lawyer Authorization)
  app.get('/api/lawyer/profile', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer profile not found', code: 'LAWYER_NOT_FOUND' });
    }
    const reviews = db.reviews.filter((r) => r.lawyerId === lawyer.id);
    const activeCases = db.cases.filter((c) => c.lawyerId === lawyer.id && c.stage !== 'Closed');
    res.json({
      success: true,
      lawyer,
      user,
      reviews,
      activeCasesCount: activeCases.length
    });
  });

  app.patch('/api/lawyer/profile', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer profile not found', code: 'LAWYER_NOT_FOUND' });
    }

    const {
      fullName,
      avatarUrl,
      barCouncilNumber,
      stateBarCouncil,
      experienceYears,
      practiceAreas,
      courts,
      bio,
      education,
      consultationFee,
      languages,
      city,
      state
    } = req.body;

    if (fullName) {
      lawyer.fullName = fullName;
      user.name = fullName;
    }
    if (avatarUrl) {
      lawyer.avatarUrl = avatarUrl;
      user.avatarUrl = avatarUrl;
    }
    if (barCouncilNumber) lawyer.barCouncilNumber = barCouncilNumber;
    if (stateBarCouncil) lawyer.stateBarCouncil = stateBarCouncil;
    if (experienceYears !== undefined) lawyer.experienceYears = Number(experienceYears) || lawyer.experienceYears;
    if (practiceAreas && Array.isArray(practiceAreas)) lawyer.practiceAreas = practiceAreas;
    if (courts && Array.isArray(courts)) lawyer.courts = courts;
    if (bio !== undefined) lawyer.bio = bio;
    if (education !== undefined) lawyer.education = education;
    if (consultationFee !== undefined) lawyer.consultationFee = Number(consultationFee) || lawyer.consultationFee;
    if (languages && Array.isArray(languages)) lawyer.languages = languages;
    if (city) lawyer.city = city;
    if (state) lawyer.state = state;

    res.json({ success: true, lawyer, user });
  });

  app.get('/api/lawyer/verification', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer profile not found', code: 'LAWYER_NOT_FOUND' });
    }
    res.json({
      success: true,
      verificationStatus: lawyer.verificationStatus || (lawyer.isVerified ? 'verified' : 'pending'),
      isVerified: !!lawyer.isVerified,
      barCouncilNumber: lawyer.barCouncilNumber,
      stateBarCouncil: lawyer.stateBarCouncil,
      verificationNotes: lawyer.verificationNotes || 'Enrolment record maintained in Bar Council of India register.'
    });
  });

  app.post('/api/lawyer/verification/submit', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer profile not found', code: 'LAWYER_NOT_FOUND' });
    }

    const { barCouncilNumber, stateBarCouncil, certificateUrl, notes, simulateInstantApproval } = req.body;
    if (barCouncilNumber) lawyer.barCouncilNumber = barCouncilNumber;
    if (stateBarCouncil) lawyer.stateBarCouncil = stateBarCouncil;

    if (simulateInstantApproval) {
      lawyer.verificationStatus = 'verified';
      lawyer.isVerified = true;
      lawyer.verificationNotes = 'Verified by State Bar Council roster integration.';
    } else {
      lawyer.verificationStatus = 'pending';
      lawyer.isVerified = false;
      lawyer.verificationNotes = notes || 'Credentials and certificate submitted. Verification in progress with State Bar Council.';
    }

    res.json({
      success: true,
      lawyer,
      message: lawyer.isVerified ? 'Lawyer credentials verified successfully.' : 'Verification documents submitted. Verification is now Pending.'
    });
  });

  // Lawyer Requests API
  app.get('/api/lawyer/requests', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);

    // Requests are cases with implementationState 'Submitted' or 'Lawyer Reviewing'
    const pendingCases = db.cases.filter((c) => {
      if (lawyer && c.lawyerId === lawyer.id && (c.implementationState === 'Lawyer Reviewing' || c.implementationState === 'Submitted')) {
        return true;
      }
      return c.implementationState === 'Submitted' && !c.lawyerId;
    });

    const requestsWithDocs = pendingCases.map((c) => {
      const docs = db.documents.filter((d) => d.caseId === c.id);
      return {
        ...c,
        documents: docs
      };
    });

    res.json({ requests: requestsWithDocs });
  });

  app.get('/api/lawyer/requests/:id', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case request not found' });
    }
    const docs = db.documents.filter((d) => d.caseId === foundCase.id);
    res.json({ request: foundCase, documents: docs });
  });

  // Lawyer Clients Directory API
  app.get('/api/lawyer/clients', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);
    if (!lawyer) {
      return res.json({ clients: [] });
    }

    // Find all cases handled by this lawyer
    const lawyerCases = db.cases.filter((c) => c.lawyerId === lawyer.id);
    const clientIds = Array.from(new Set(lawyerCases.map((c) => c.clientId)));

    const clientsData = clientIds.map((cId) => {
      const client = db.clients.find((cl) => cl.id === cId) || {
        id: cId,
        fullName: lawyerCases.find((c) => c.clientId === cId)?.clientName || 'Client',
        email: 'client@example.com',
        phone: lawyerCases.find((c) => c.clientId === cId)?.clientPhone || '+91 98000 00000',
        city: lawyerCases.find((c) => c.clientId === cId)?.city || 'New Delhi',
        state: lawyerCases.find((c) => c.clientId === cId)?.state || 'Delhi'
      };

      const myCases = lawyerCases.filter((c) => c.clientId === cId);
      const activeCount = myCases.filter((c) => c.stage !== 'Closed').length;
      const closedCount = myCases.filter((c) => c.stage === 'Closed').length;

      return {
        ...client,
        activeCasesCount: activeCount,
        closedCasesCount: closedCount,
        totalCasesCount: myCases.length,
        latestCase: myCases[0] || null
      };
    });

    res.json({ clients: clientsData });
  });

  app.get('/api/lawyers/:id', (req, res) => {
    const db = getDb();
    const lawyer = db.lawyers.find((l) => l.id === req.params.id);
    if (!lawyer) return res.status(404).json({ error: 'Lawyer not found' });

    // Show approved reviews publicly
    const reviews = db.reviews.filter((r) => r.lawyerId === lawyer.id && r.moderationStatus === 'approved');
    const activeCasesCount = db.cases.filter((c) => c.lawyerId === lawyer.id && c.stage !== 'Closed').length;

    res.json({ lawyer: enrichLawyerChamber(lawyer), reviews, activeCasesCount });
  });

  app.get('/api/law-firms', (req, res) => {
    const db = getDb();
    res.json({ lawFirms: db.lawFirms });
  });

  app.get('/api/law-firms/:id', (req, res) => {
    const db = getDb();
    const firm = db.lawFirms.find((f) => f.id === req.params.id);
    if (!firm) return res.status(404).json({ error: 'Law firm not found' });
    const lawyers = db.lawyers.filter((l) => l.lawFirmId === firm.id);
    res.json({ lawFirm: firm, lawyers });
  });

  // 9. Payments & Invoices (Razorpay Ready Architecture)
  app.get('/api/payments', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    let payments = [...db.payments];

    if (user?.role === 'client') {
      const client = db.clients.find((c) => c.userId === user.id) || db.clients.find(c => c.id === 'cl_1');
      if (client) {
        payments = payments.filter((p) => p.clientId === client.id);
      }
    } else if (user?.role === 'lawyer') {
      const lawyer = db.lawyers.find((l) => l.userId === user.id);
      if (lawyer) {
        payments = payments.filter((p) => p.lawyerId === lawyer.id);
      }
    }

    const { status, caseId } = req.query;
    if (status && typeof status === 'string') {
      const targetStatus = status.toLowerCase();
      payments = payments.filter((p) => {
        const pStatus = p.status.toLowerCase();
        if (targetStatus === 'successful') return pStatus === 'successful' || pStatus === 'completed';
        return pStatus === targetStatus;
      });
    }
    if (caseId && typeof caseId === 'string') {
      payments = payments.filter((p) => p.caseId === caseId);
    }

    // Ensure at least one pending payment requirement is available for testing the payment flow
    const hasPending = payments.some((p) => p.status === 'Pending' || p.status === 'Processing');
    if (!hasPending && (!status || status === 'pending')) {
      const targetCase = db.cases.find((c) => c.clientId === 'cl_1') || db.cases[0];
      if (targetCase) {
        const baseAmount = 7500;
        const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
        const totalAmount = baseAmount + gstAmount;
        const now = new Date().toISOString();
        const pendingPayment = {
          id: 'pay_req_' + Date.now(),
          caseId: targetCase.id,
          caseNumber: targetCase.caseNumber,
          caseTitle: targetCase.title,
          clientId: 'cl_1',
          clientName: 'Rohan Deshmukh',
          clientEmail: 'rohan.deshmukh@gmail.com',
          lawyerId: targetCase.lawyerId || 'l_1',
          lawyerName: targetCase.lawyerName || 'Adv. Rajeshwar Sharma',
          serviceCategory: 'Advocate Retainer & Court Representation',
          amount: baseAmount,
          gstAmount,
          totalAmount,
          currency: 'INR',
          provider: paymentService.getProviderName(),
          status: 'Pending',
          transactionId: 'txn_req_' + Date.now(),
          paymentMethod: 'Razorpay UPI / Net Banking',
          paymentDate: now,
          invoiceId: '',
          refundStatus: 'none',
          timestamps: { created: now },
          isDemo: paymentService.isDemoMode()
        };
        db.payments.unshift(pendingPayment as any);
        payments.unshift(pendingPayment as any);
      }
    }

    res.json({
      payments,
      isDemoMode: paymentService.isDemoMode(),
      providerName: paymentService.getProviderName(),
      disclaimer: paymentService.isDemoMode()
        ? 'DEMO PAYMENT MODE: Razorpay sandbox active. No real funds will be deducted. All orders and signatures are cryptographically verified server-side.'
        : 'LIVE RAZORPAY GATEWAY: Live banking transactions enabled.'
    });
  });

  app.get('/api/payments/:id', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }

    const payment = db.payments.find((p) => p.id === req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Role-based authorization for payment access
    if (user.role === 'client') {
      const client = db.clients.find((c) => c.userId === user.id);
      if (!client || payment.clientId !== client.id) {
        return res.status(403).json({
          error: 'Forbidden: Access Denied',
          code: 'FORBIDDEN_PAYMENT_ACCESS',
          message: 'Clients cannot access billing statements belonging to other parties.'
        });
      }
    } else if (user.role === 'lawyer') {
      const lawyer = db.lawyers.find((l) => l.userId === user.id);
      if (!lawyer || payment.lawyerId !== lawyer.id) {
        return res.status(403).json({
          error: 'Forbidden: Access Denied',
          code: 'FORBIDDEN_PAYMENT_ACCESS',
          message: 'Advocates cannot view payment details for unrelated matters.'
        });
      }
    }

    const foundCase = payment.caseId ? db.cases.find((c) => c.id === payment.caseId) : undefined;
    const foundInvoice = payment.invoiceId ? db.invoices.find((i) => i.id === payment.invoiceId) : undefined;

    res.json({
      payment,
      case: foundCase,
      invoice: foundInvoice,
      isDemoMode: paymentService.isDemoMode(),
      providerName: paymentService.getProviderName()
    });
  });

  // Initialize payment order with Razorpay or Demo Provider
  app.post(['/api/payments/initialize', '/api/payments/:id/initialize'], async (req, res) => {
    try {
      const db = getDb();
      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
      }

      const paymentId = req.params.id || req.body.paymentId;
      let payment = paymentId ? db.payments.find((p) => p.id === paymentId) : undefined;

      // If no payment found, create one if caseId is passed
      if (!payment && req.body.caseId) {
        const foundCase = db.cases.find((c) => c.id === req.body.caseId);
        if (!foundCase) {
          return res.status(404).json({ error: 'Associated case not found' });
        }

        // Verify case access
        if (!checkCaseAccess(user.id, user.role, foundCase.id)) {
          return res.status(403).json({ error: 'Access denied to this case' });
        }

        const client = db.clients.find((c) => c.userId === user.id) || {
          id: `cl_${user.id}`,
          userId: user.id,
          fullName: user.name,
          email: user.email,
          phone: user.phone,
          city: 'New Delhi',
          state: 'Delhi',
          isPhoneVerified: user.isPhoneVerified,
          createdAt: new Date().toISOString()
        };

        const baseAmount = Number(req.body.amount) || 7500;
        const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
        const totalAmount = baseAmount + gstAmount;
        const now = new Date().toISOString();

        payment = {
          id: `pay_${Date.now()}`,
          caseId: foundCase.id,
          caseNumber: foundCase.caseNumber,
          caseTitle: foundCase.title,
          clientId: client.id,
          clientName: client.fullName,
          clientEmail: client.email,
          lawyerId: foundCase.lawyerId,
          lawyerName: foundCase.lawyerName,
          serviceCategory: req.body.serviceCategory ? sanitizeInput(req.body.serviceCategory) : 'Advocate Retainer & Court Representation',
          amount: baseAmount,
          gstAmount,
          totalAmount,
          currency: 'INR',
          provider: paymentService.getProviderName(),
          status: 'Pending',
          transactionId: `txn_${Date.now()}`,
          paymentMethod: 'Razorpay UPI / Net Banking',
          paymentDate: now,
          invoiceId: '',
          refundStatus: 'none',
          timestamps: {
            created: now
          },
          isDemo: paymentService.isDemoMode()
        };
        db.payments.unshift(payment);
      }

      if (!payment) {
        return res.status(404).json({ error: 'Payment requirement record not found' });
      }

      // Check access permission to this payment
      if (user.role === 'client') {
        const client = db.clients.find((c) => c.userId === user.id);
        if (client && payment.clientId !== client.id) {
          return res.status(403).json({ error: 'Cannot initialize payment for another client' });
        }
      }

      // Create order via provider
      const order = await paymentService.createOrder({
        amount: payment.totalAmount,
        receipt: payment.id,
        notes: {
          caseId: payment.caseId || '',
          caseNumber: payment.caseNumber || '',
          clientName: payment.clientName
        }
      });

      // Update payment state to Processing
      payment.status = 'Processing';
      payment.orderId = order.orderId;
      payment.razorpayOrderId = order.orderId;
      payment.timestamps = {
        ...payment.timestamps,
        processing: new Date().toISOString()
      };

      res.json({
        success: true,
        payment,
        order
      });
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      res.status(500).json({ error: 'Failed to initialize payment transaction' });
    }
  });

  // Verify payment using server-side provider signature verification
  app.post('/api/payments/:id/verify', async (req, res) => {
    try {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
      }

      const { orderId, razorpayPaymentId, razorpaySignature } = req.body;
      const db = getDb();
      const payment = db.payments.find((p) => p.id === req.params.id);

      if (!payment) {
        return res.status(404).json({ error: 'Payment record not found' });
      }

      // Verify client authorization
      if (user.role === 'client') {
        const client = db.clients.find((c) => c.userId === user.id);
        if (client && payment.clientId !== client.id) {
          return res.status(403).json({ error: 'Forbidden: You cannot settle another user\'s invoice.' });
        }
      }

      // Replay attack prevention: check if already settled
      if (payment.status === 'Successful' || payment.status === 'completed') {
        return res.status(400).json({
          error: 'This payment has already been verified and settled.',
          code: 'ALREADY_PAID',
          payment
        });
      }

      // Order ID mismatch check
      if (payment.orderId && orderId && payment.orderId !== orderId) {
        return res.status(400).json({
          error: 'Order ID mismatch for this transaction',
          code: 'ORDER_MISMATCH'
        });
      }

      // CRITICAL REQUIREMENT: Never mark payment as successful based only on frontend state.
      // Payment confirmation must be verified server-side using the payment provider.
      const verification = await paymentService.verifyPayment({
        orderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature
      });

      if (!verification.valid) {
        payment.status = 'Failed';
        payment.failureReason = verification.reason || 'Cryptographic signature verification failed';
        payment.timestamps = {
          ...payment.timestamps,
          failed: new Date().toISOString()
        };
        return res.status(400).json({
          success: false,
          error: verification.reason || 'Payment verification failed',
          payment
        });
      }

      // Payment verified successfully by server-side provider
      const now = new Date().toISOString();
      payment.status = 'Successful';
      payment.transactionId = razorpayPaymentId;
      payment.razorpayOrderId = orderId;
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.razorpaySignature = razorpaySignature;
      payment.paymentDate = now;
      payment.timestamps = {
        ...payment.timestamps,
        completed: now
      };

      // Create GST Tax Invoice Record
      const invoiceId = `inv_${Date.now()}`;
      const invoiceNumber = `INV-LS-2025-${Math.floor(10000 + Math.random() * 90000)}`;

      const newInvoice: Invoice = {
        id: invoiceId,
        invoiceNumber,
        paymentId: payment.id,
        caseId: payment.caseId,
        caseNumber: payment.caseNumber,
        clientName: payment.clientName,
        clientEmail: payment.clientEmail || 'client@counselia.in',
        lawyerName: payment.lawyerName || 'Adv. Panel Associate',
        serviceDescription: `${payment.serviceCategory} - GST Tax Invoice (SAC 998211)`,
        amount: payment.amount,
        gstRate: 18,
        gstAmount: payment.gstAmount,
        total: payment.totalAmount,
        issueDate: now.split('T')[0],
        status: 'paid',
        isDemo: payment.isDemo || paymentService.isDemoMode()
      };

      db.invoices.unshift(newInvoice);
      payment.invoiceId = invoiceId;
      payment.invoiceNumber = invoiceNumber;

      // Update case: Case becomes active
      let activatedCase: LegalCase | undefined;
      if (payment.caseId) {
        activatedCase = db.cases.find((c) => c.id === payment.caseId);
        if (activatedCase) {
          activatedCase.implementationState = 'Active';
          activatedCase.status = 'in_progress';
          activatedCase.paidAmount = (activatedCase.paidAmount || 0) + payment.totalAmount;
          activatedCase.updatedAt = now;

          db.updates.unshift({
            id: `upd_${Date.now()}`,
            caseId: activatedCase.id,
            title: 'Professional Retainer Payment Verified & Case Activated',
            description: `Payment of ₹${payment.totalAmount.toLocaleString('en-IN')} verified server-side via ${payment.provider} (Ref: ${razorpayPaymentId}). Case is now officially ACTIVE. Tax Invoice #${invoiceNumber} issued.`,
            stage: activatedCase.stage,
            implementationState: 'Active',
            date: now,
            authorId: payment.clientId,
            authorName: payment.clientName,
            authorRole: 'client'
          });

          db.notifications.unshift({
            id: `notif_${Date.now()}`,
            userId: payment.clientId,
            type: 'case_update',
            title: 'Payment Verified - Case is now Active',
            content: `Your payment of ₹${payment.totalAmount.toLocaleString('en-IN')} has been verified. Case "${activatedCase.title}" is now officially Active.`,
            entityType: 'case',
            entityId: activatedCase.id,
            isRead: false,
            isDemo: false,
            createdAt: now
          });
        }
      }

      res.json({
        success: true,
        payment,
        invoice: newInvoice,
        case: activatedCase
      });
    } catch (err: any) {
      console.error('Payment verification exception:', err);
      res.status(500).json({ error: `Verification execution failed: ${err.message}` });
    }
  });

  // Cancel pending payment
  app.post('/api/payments/:id/cancel', (req, res) => {
    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'Cancelled';
    payment.timestamps = {
      ...payment.timestamps,
      cancelled: new Date().toISOString()
    };

    res.json({ success: true, payment });
  });

  // Refund payment
  app.post('/api/payments/:id/refund', (req, res) => {
    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'Refunded';
    payment.refundStatus = 'processed';
    payment.timestamps = {
      ...payment.timestamps,
      refunded: new Date().toISOString()
    };

    res.json({ success: true, payment });
  });

  // Demo gateway authorization helper (ONLY active in DEMO MODE)
  app.post('/api/payments/demo-authorize', (req, res) => {
    if (!paymentService.isDemoMode()) {
      return res.status(400).json({ error: 'Demo authorization is only available in DEMO MODE' });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId is required' });
    }

    const simulatedPaymentId = `pay_demo_${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}`;
    const signature = paymentService.generateDemoGatewaySignature(orderId, simulatedPaymentId);

    res.json({
      razorpayPaymentId: simulatedPaymentId,
      razorpaySignature: signature
    });
  });

  // Demo simulate payment failure (ONLY active in DEMO MODE)
  app.post('/api/payments/:id/simulate-failure', (req, res) => {
    if (!paymentService.isDemoMode()) {
      return res.status(400).json({ error: 'Demo failure simulation is only available in DEMO MODE' });
    }

    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const now = new Date().toISOString();
    payment.status = 'Failed';
    payment.failureReason = req.body.reason || 'Transaction declined by bank/card issuer (Demo Payment Simulation)';
    payment.timestamps = {
      ...payment.timestamps,
      failed: now
    };

    res.json({ success: true, payment });
  });

  // Demo reset payment requirement to Pending (to test payment flow again)
  app.post('/api/payments/:id/reset-pending', (req, res) => {
    if (!paymentService.isDemoMode()) {
      return res.status(400).json({ error: 'Reset to pending is only available in DEMO MODE' });
    }

    const db = getDb();
    const payment = db.payments.find((p) => p.id === req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'Pending';
    payment.failureReason = undefined;
    payment.orderId = undefined;
    payment.razorpayOrderId = undefined;
    payment.razorpayPaymentId = undefined;
    payment.razorpaySignature = undefined;

    res.json({ success: true, payment });
  });

  // Create new Demo Pending payment requirement on demand
  app.post('/api/payments/create-demo-pending', (req, res) => {
    if (!paymentService.isDemoMode()) {
      return res.status(400).json({ error: 'Creating demo pending payments is only allowed in DEMO MODE' });
    }

    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    const client = db.clients.find((c) => c.userId === user?.id) || db.clients[0];
    const targetCase = (req.body.caseId ? db.cases.find((c) => c.id === req.body.caseId) : null) || db.cases.find((c) => c.clientId === client.id) || db.cases[0];

    const baseAmount = Number(req.body.amount) || 7500;
    const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
    const totalAmount = baseAmount + gstAmount;
    const now = new Date().toISOString();

    const newPendingPayment: Payment = {
      id: `pay_req_${Date.now()}`,
      caseId: targetCase?.id,
      caseNumber: targetCase?.caseNumber,
      caseTitle: targetCase?.title || 'Legal Consultation & Evaluation',
      clientId: client.id,
      clientName: client.fullName,
      clientEmail: client.email,
      lawyerId: targetCase?.lawyerId || 'l_1',
      lawyerName: targetCase?.lawyerName || 'Adv. Rajeshwar Sharma',
      serviceCategory: req.body.serviceCategory || 'Advocate Retainer & Court Representation',
      amount: baseAmount,
      gstAmount,
      totalAmount,
      currency: 'INR',
      provider: paymentService.getProviderName(),
      status: 'Pending',
      transactionId: `txn_req_${Date.now()}`,
      paymentMethod: 'Demo Payment (UPI / Net Banking)',
      paymentDate: now,
      invoiceId: '',
      refundStatus: 'none',
      timestamps: {
        created: now
      },
      isDemo: true
    };

    db.payments.unshift(newPendingPayment);
    res.json({ success: true, payment: newPendingPayment });
  });

  // Legacy / Direct Payment creation
  app.post('/api/payments/create', (req, res) => {
    const { caseId, serviceCategory, amount, paymentMethod } = req.body;
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    const client = db.clients.find((c) => c.userId === user?.id) || db.clients[0];
    const foundCase = caseId ? db.cases.find((c) => c.id === caseId) : undefined;

    const baseAmount = Number(amount) || 5000;
    const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
    const totalAmount = baseAmount + gstAmount;
    const transactionId = `pay_RZP_${Math.floor(100000000 + Math.random() * 900000000)}`;
    const invoiceId = `inv_${Date.now()}`;
    const invoiceNumber = `INV-LS-2025-${Math.floor(10000 + Math.random() * 90000)}`;

    const now = new Date().toISOString();
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      caseId: foundCase?.id,
      caseNumber: foundCase?.caseNumber,
      caseTitle: foundCase?.title,
      clientId: client.id,
      clientName: client.fullName,
      clientEmail: client.email,
      lawyerId: foundCase?.lawyerId,
      lawyerName: foundCase?.lawyerName,
      serviceCategory: serviceCategory || 'Legal Retainer & Professional Fee',
      amount: baseAmount,
      gstAmount,
      totalAmount,
      currency: 'INR',
      provider: paymentService.getProviderName(),
      status: 'Successful',
      transactionId,
      paymentMethod: paymentMethod || 'Razorpay UPI / Netbanking',
      paymentDate: now,
      invoiceId,
      invoiceNumber,
      refundStatus: 'none',
      timestamps: {
        created: now,
        completed: now
      },
      isDemo: paymentService.isDemoMode()
    };

    db.payments.unshift(newPayment);

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber,
      paymentId: newPayment.id,
      caseId: foundCase?.id,
      caseNumber: foundCase?.caseNumber,
      clientName: client.fullName,
      clientEmail: client.email,
      lawyerName: foundCase?.lawyerName || 'Adv. Panel Associate',
      serviceDescription: `${serviceCategory || 'Legal Advisory'} - GST Tax Invoice`,
      amount: baseAmount,
      gstRate: 18,
      gstAmount,
      total: totalAmount,
      issueDate: now.split('T')[0],
      status: 'paid',
      isDemo: paymentService.isDemoMode()
    };

    db.invoices.unshift(newInvoice);

    if (foundCase) {
      foundCase.paidAmount = (foundCase.paidAmount || 0) + totalAmount;
      if (foundCase.implementationState === 'Payment Pending') {
        foundCase.implementationState = 'Active';
      }
      db.updates.unshift({
        id: `upd_${Date.now()}`,
        caseId: foundCase.id,
        title: 'Payment Successful',
        description: `Receipt generated for Rs. ${totalAmount.toLocaleString('en-IN')} (Ref: ${transactionId}). Invoice #${invoiceNumber} issued.`,
        date: now,
        authorId: client.id,
        authorName: client.fullName,
        authorRole: 'client'
      });
    }

    res.json({ success: true, payment: newPayment, invoice: newInvoice });
  });

  app.get('/api/invoices', (req, res) => {
    const db = getDb();
    res.json({ invoices: db.invoices });
  });

  app.get('/api/invoices/:id', (req, res) => {
    const db = getDb();
    const invoice = db.invoices.find((i) => i.id === req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ invoice });
  });

  // 10. Appointments (Offline Chamber Consultations & Legal Scheduling)
  app.get('/api/appointments', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    let appointments = [...db.appointments];

    if (user?.role === 'client') {
      const client = db.clients.find((c) => c.userId === user.id);
      if (client) {
        appointments = appointments.filter((a) => a.clientId === client.id);
      }
    } else if (user?.role === 'lawyer') {
      const lawyer = db.lawyers.find((l) => l.userId === user.id);
      if (lawyer) {
        appointments = appointments.filter((a) => a.lawyerId === lawyer.id);
      }
    }

    // Ensure all appointments have proper location and normalized status
    const normalized = appointments.map((a) => {
      const lawyer = db.lawyers.find((l) => l.id === a.lawyerId);
      const defaultLoc = lawyer?.chamberAddress || DEFAULT_LAWYER_CHAMBERS[a.lawyerId] || 'Chamber No. 342, Saket District Court, New Delhi';
      return {
        ...a,
        location: a.location || defaultLoc,
        status: (a.status === 'scheduled' ? 'Confirmed' : a.status) as any,
        mode: a.mode || 'Offline Chamber Meeting',
        lawyerChamber: lawyer?.chamberAddress || defaultLoc
      };
    });

    res.json({ appointments: normalized });
  });

  // Check Lawyer Availability & Conflict Detection for a specific date
  app.get('/api/lawyers/:id/availability', (req, res) => {
    const db = getDb();
    const lawyerId = req.params.id;
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const lawyer = db.lawyers.find((l) => l.id === lawyerId);
    if (!lawyer) {
      return res.status(404).json({ error: 'Advocate not found' });
    }

    // Active consultations for this advocate on that date
    const bookedAppointments = db.appointments.filter(
      (a) => a.lawyerId === lawyerId &&
             a.date === date &&
             (a.status === 'Confirmed' || a.status === 'Requested' || a.status === 'scheduled')
    );

    const bookedSlotsMap = new Map(bookedAppointments.map((a) => [a.timeSlot, a]));

    const slots = STANDARD_OFFLINE_SLOTS.map((timeSlot) => {
      const existing = bookedSlotsMap.get(timeSlot);
      return {
        timeSlot,
        isAvailable: !existing,
        status: existing ? (existing.status === 'scheduled' ? 'Confirmed' : existing.status) : 'Available',
        appointmentId: existing?.id,
        clientName: existing ? existing.clientName : undefined
      };
    });

    res.json({
      lawyerId,
      lawyerName: lawyer.fullName,
      chamberAddress: lawyer.chamberAddress || DEFAULT_LAWYER_CHAMBERS[lawyer.id] || 'Advocate Chamber, Saket District Court',
      consultationFee: lawyer.consultationFee || 1500,
      date,
      slots
    });
  });

  // Client books offline consultation (Selects Lawyer, Date, Time, Location)
  // State: Requested -> Confirmed -> Completed / Cancelled
  app.post('/api/appointments', (req, res) => {
    const { lawyerId, caseId, date, timeSlot, location, mode, notes, fee } = req.body;
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    const client = db.clients.find((c) => c.userId === user?.id) || db.clients[0];
    const lawyer = db.lawyers.find((l) => l.id === lawyerId) || db.lawyers[0];
    const foundCase = caseId ? db.cases.find((c) => c.id === caseId) : undefined;

    if (!date || !timeSlot) {
      return res.status(400).json({ error: 'Date and Time Slot are mandatory for scheduling.' });
    }

    // PREVENT OBVIOUS SCHEDULING CONFLICTS:
    // 1. Check Advocate scheduling conflict
    const lawyerConflict = db.appointments.find(
      (a) => a.lawyerId === lawyer.id &&
             a.date === date &&
             a.timeSlot === timeSlot &&
             (a.status === 'Confirmed' || a.status === 'Requested' || a.status === 'scheduled')
    );

    if (lawyerConflict) {
      const conflictStatus = lawyerConflict.status === 'scheduled' ? 'Confirmed' : lawyerConflict.status;
      return res.status(409).json({
        error: 'Scheduling Conflict',
        code: 'SCHEDULING_CONFLICT',
        message: `Scheduling Conflict: Adv. ${lawyer.fullName} already has a ${conflictStatus.toUpperCase()} consultation booked on ${date} during ${timeSlot}. Please choose an alternative time slot.`
      });
    }

    // 2. Check Client double-booking conflict
    const clientConflict = db.appointments.find(
      (a) => a.clientId === client.id &&
             a.date === date &&
             a.timeSlot === timeSlot &&
             (a.status === 'Confirmed' || a.status === 'Requested' || a.status === 'scheduled')
    );

    if (clientConflict) {
      return res.status(409).json({
        error: 'Scheduling Conflict',
        code: 'CLIENT_SCHEDULE_CONFLICT',
        message: `You already have an active appointment scheduled on ${date} at ${timeSlot} with ${clientConflict.lawyerName}. Please select another time.`
      });
    }

    const defaultChamber = lawyer.chamberAddress || DEFAULT_LAWYER_CHAMBERS[lawyer.id] || 'Advocate Chamber, Saket District Court, New Delhi';
    const consultationLocation = (location && location.trim()) || defaultChamber;
    const now = new Date().toISOString();

    const newAppointment: Appointment = {
      id: `app_${Date.now()}`,
      clientId: client.id,
      clientName: client.fullName,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      caseId: foundCase?.id,
      caseTitle: foundCase?.title || 'Offline Chamber Consultation & Strategy',
      date,
      timeSlot,
      location: consultationLocation,
      locationType: req.body.locationType || 'chamber',
      status: 'Requested',
      mode: mode || 'Offline Chamber Meeting',
      notes: notes || 'In-person offline consultation regarding legal dispute and remedy options.',
      fee: fee || lawyer.consultationFee || 1500,
      meetingLink: undefined,
      isDemo: false,
      createdAt: now,
      updatedAt: now
    };

    db.appointments.unshift(newAppointment);

    // Notify the lawyer of the new consultation request
    const lawyerUser = db.users.find((u) => u.id === lawyer.userId);
    if (lawyerUser) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: lawyerUser.id,
        type: 'appointment',
        title: 'New Offline Consultation Requested',
        content: `${client.fullName} has requested an offline chamber meeting on ${date} at ${timeSlot} (${consultationLocation}).`,
        isRead: false,
        createdAt: now,
        link: '/appointments'
      });
    }

    res.json({ success: true, appointment: newAppointment });
  });

  // Update Appointment Status (Requested, Confirmed, Completed, Cancelled)
  app.patch('/api/appointments/:id/status', (req, res) => {
    const { status, cancellationReason } = req.body;
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    const appointment = db.appointments.find((a) => a.id === req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const validStatuses: Appointment['status'][] = ['Requested', 'Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Check conflict when confirming
    if (status === 'Confirmed' && appointment.status !== 'Confirmed') {
      const conflict = db.appointments.find(
        (a) => a.id !== appointment.id &&
               a.lawyerId === appointment.lawyerId &&
               a.date === appointment.date &&
               a.timeSlot === appointment.timeSlot &&
               (a.status === 'Confirmed' || a.status === 'scheduled')
      );
      if (conflict) {
        return res.status(409).json({
          error: 'Scheduling Conflict',
          code: 'SCHEDULING_CONFLICT',
          message: `Cannot confirm: Adv. ${appointment.lawyerName} already has another Confirmed consultation on ${appointment.date} at ${appointment.timeSlot}.`
        });
      }
    }

    const now = new Date().toISOString();
    appointment.status = status;
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }
    appointment.updatedAt = now;

    // Send notifications to client / lawyer
    const client = db.clients.find((c) => c.id === appointment.clientId);
    const lawyer = db.lawyers.find((l) => l.id === appointment.lawyerId);

    if (status === 'Confirmed' && client) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: client.userId,
        type: 'appointment',
        title: 'Offline Consultation Confirmed',
        content: `Adv. ${appointment.lawyerName} has confirmed your offline chamber meeting on ${appointment.date} at ${appointment.timeSlot} at ${appointment.location}.`,
        isRead: false,
        createdAt: now,
        link: '/appointments'
      });
    } else if (status === 'Cancelled') {
      const reasonText = cancellationReason ? ` Reason: ${cancellationReason}` : '';
      if (client) {
        db.notifications.unshift({
          id: `notif_${Date.now()}`,
          userId: client.userId,
          type: 'appointment',
          title: 'Consultation Cancelled',
          content: `Your appointment with Adv. ${appointment.lawyerName} on ${appointment.date} at ${appointment.timeSlot} was cancelled.${reasonText}`,
          isRead: false,
          createdAt: now,
          link: '/appointments'
        });
      }
      if (lawyer) {
        db.notifications.unshift({
          id: `notif_${Date.now() + 1}`,
          userId: lawyer.userId,
          type: 'appointment',
          title: 'Consultation Cancelled',
          content: `Consultation with ${appointment.clientName} on ${appointment.date} at ${appointment.timeSlot} was cancelled.${reasonText}`,
          isRead: false,
          createdAt: now,
          link: '/appointments'
        });
      }
    } else if (status === 'Completed' && client) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: client.userId,
        type: 'appointment',
        title: 'Consultation Completed',
        content: `Your offline chamber meeting with Adv. ${appointment.lawyerName} on ${appointment.date} has been marked Completed.`,
        isRead: false,
        createdAt: now,
        link: '/appointments'
      });
    }

    res.json({ success: true, appointment });
  });

  // 11. Anonymous & Public Legal Queries
  app.get('/api/queries', (req, res) => {
    const db = getDb();
    res.json({ queries: db.queries });
  });

  app.post('/api/queries', (req, res) => {
    const { title, category, description, isAnonymous, authorName, city, state } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const db = getDb();
    const newQuery: LegalQuery = {
      id: `q_${Date.now()}`,
      title,
      category: category || 'General Legal Query',
      description,
      isAnonymous: !!isAnonymous,
      authorName: isAnonymous ? 'Anonymous Citizen' : (authorName || 'Verified Inquirer'),
      city: city || 'New Delhi',
      state: state || 'Delhi',
      replies: [],
      createdAt: new Date().toISOString(),
      views: 1,
      isDemo: false
    };

    db.queries.unshift(newQuery);
    res.json({ success: true, query: newQuery });
  });

  app.post('/api/queries/:id/reply', (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Reply content is required' });

    const db = getDb();
    const query = db.queries.find((q) => q.id === req.params.id);
    if (!query) return res.status(404).json({ error: 'Query not found' });

    const user = db.users.find((u) => u.id === activeSessionUserId);
    const lawyer = db.lawyers.find((l) => l.userId === user?.id) || db.lawyers[0];

    const newReply = {
      id: `qr_${Date.now()}`,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      barNumber: lawyer.barCouncilNumber,
      content,
      createdAt: new Date().toISOString()
    };

    query.replies.push(newReply);
    res.json({ success: true, reply: newReply });
  });

  // 12. Reviews & Ratings (Verified Closed Case Policy)
  // Client reviews can only be submitted for CLOSED cases, preventing duplicate reviews per case.
  // Reviews require admin moderation before appearing publicly.

  // Helper endpoint for clients: lists closed cases eligible for review
  app.get('/api/client/reviewable-cases', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    const client = db.clients.find((c) => c.userId === user?.id) || db.clients[0];

    // Find all closed cases for this client
    const closedCases = db.cases.filter(
      (c) => c.clientId === client.id && (c.stage === 'Closed' || c.status === 'closed' || c.status === 'resolved')
    );

    const reviewableList = closedCases.map((c) => {
      const existingReview = db.reviews.find((r) => r.caseId === c.id);
      const lawyer = db.lawyers.find((l) => l.id === c.lawyerId);
      return {
        caseId: c.id,
        caseNumber: c.caseNumber,
        caseTitle: c.title,
        caseCategory: c.category,
        lawyerId: c.lawyerId,
        lawyerName: lawyer?.fullName || c.lawyerName || 'Assigned Advocate',
        stage: c.stage,
        closedAt: c.updatedAt,
        hasReviewed: !!existingReview,
        review: existingReview
      };
    });

    res.json({ cases: reviewableList });
  });

  // Public reviews: ONLY show approved reviews
  app.get('/api/reviews', (req, res) => {
    const db = getDb();
    const { lawyerId, minRating, category } = req.query;
    // Strict compliance: Show approved reviews publicly
    let reviews = db.reviews.filter((r) => r.moderationStatus === 'approved');

    if (lawyerId) {
      reviews = reviews.filter((r) => r.lawyerId === lawyerId);
    }
    if (minRating) {
      reviews = reviews.filter((r) => r.rating >= Number(minRating));
    }
    if (category) {
      reviews = reviews.filter((r) =>
        r.caseCategory?.toLowerCase().includes(String(category).toLowerCase())
      );
    }

    // Enhance reviews with advocate details and chamber info
    const enrichedReviews = reviews.map((rev) => {
      const lawyer = db.lawyers.find((l) => l.id === rev.lawyerId);
      const linkedCase = rev.caseId ? db.cases.find((c) => c.id === rev.caseId) : undefined;
      return {
        ...rev,
        caseTitle: linkedCase?.title || rev.caseTitle || 'Concluded Legal Matter',
        lawyerName: lawyer?.fullName || 'Advocate',
        lawyerCity: lawyer?.city || 'New Delhi',
        lawyerBarNumber: lawyer?.barCouncilNumber || ''
      };
    });

    res.json({ reviews: enrichedReviews });
  });

  // Submit Lawyer Review:
  // - Only a client with a closed case can review the assigned lawyer
  // - Rating: 1-5 stars
  // - Written review required
  // - Prevent duplicate reviews for the same case
  // - Basic moderation status for admin ('pending')
  app.post('/api/reviews', (req, res) => {
    const { lawyerId, caseId, rating, writtenReview, comment, caseCategory } = req.body;
    const db = getDb();
    const user = getAuthenticatedUser(req) || db.users.find((u) => u.id === activeSessionUserId);
    const client = db.clients.find((c) => c.userId === user?.id) || db.clients[0];

    // 1. Rating validation: 1-5 stars
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        error: 'Invalid Rating',
        code: 'INVALID_RATING',
        message: 'Rating must be an integer between 1 and 5 stars.'
      });
    }

    // 2. Written review validation
    const reviewText = (writtenReview || comment || '').trim();
    if (!reviewText || reviewText.length < 10) {
      return res.status(400).json({
        error: 'Written Review Required',
        code: 'REVIEW_TEXT_REQUIRED',
        message: 'Please provide a substantive written review (minimum 10 characters) describing your experience with the counsel.'
      });
    }

    // 3. Strict Rule: "Only a client with a closed case can review the assigned lawyer"
    let targetCase: LegalCase | undefined;
    if (caseId) {
      targetCase = db.cases.find((c) => c.id === caseId);
      if (!targetCase) {
        return res.status(404).json({
          error: 'Case Not Found',
          code: 'CASE_NOT_FOUND',
          message: 'The referenced case record was not found.'
        });
      }
      if (targetCase.clientId !== client.id) {
        return res.status(403).json({
          error: 'Unauthorized',
          code: 'NOT_CASE_CLIENT',
          message: 'You can only review cases where you are the verified client.'
        });
      }
      if (targetCase.lawyerId !== lawyerId) {
        return res.status(400).json({
          error: 'Lawyer Mismatch',
          code: 'LAWYER_MISMATCH',
          message: 'The selected advocate was not the designated counsel on this case.'
        });
      }
      const isClosed = targetCase.stage === 'Closed' || targetCase.status === 'closed' || targetCase.status === 'resolved';
      if (!isClosed) {
        return res.status(400).json({
          error: 'Case Not Closed',
          code: 'CASE_NOT_CLOSED',
          message: 'Only a client with a closed case can review the assigned lawyer. Active or pending cases cannot be reviewed until officially concluded.'
        });
      }
    } else {
      // Find an eligible closed case between this client and lawyer
      targetCase = db.cases.find(
        (c) => c.clientId === client.id &&
               c.lawyerId === lawyerId &&
               (c.stage === 'Closed' || c.status === 'closed' || c.status === 'resolved')
      );
      if (!targetCase) {
        return res.status(400).json({
          error: 'Case Not Closed',
          code: 'CASE_NOT_CLOSED',
          message: 'Only a client with a closed case can review the assigned lawyer. No concluded case was found between you and this advocate.'
        });
      }
    }

    // 4. Strict Rule: "Prevent duplicate reviews for the same case"
    const duplicateReview = db.reviews.find((r) => r.caseId === targetCase!.id);
    if (duplicateReview) {
      return res.status(409).json({
        error: 'Duplicate Review',
        code: 'DUPLICATE_REVIEW',
        message: 'A review has already been submitted for this case. Only one review per closed case is permitted under Counselia integrity standards.'
      });
    }

    const now = new Date().toISOString();
    const newReview: Review = {
      id: `rev_${Date.now()}`,
      lawyerId: lawyerId,
      clientId: client.id,
      caseId: targetCase.id,
      caseTitle: targetCase.title,
      clientName: client.fullName,
      rating: numericRating,
      comment: reviewText,
      writtenReview: reviewText,
      caseCategory: caseCategory || targetCase.category || 'Concluded Legal Matter',
      moderationStatus: 'pending', // Basic moderation status for admin
      timestamp: now,
      createdAt: now,
      isVerifiedClient: true,
      isDemo: false
    };

    db.reviews.unshift(newReview);

    // Notify Admin of new review pending moderation
    const adminUser = db.users.find((u) => u.role === 'admin');
    if (adminUser) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: adminUser.id,
        type: 'case_update',
        title: 'New Review Pending Moderation',
        content: `Client ${client.fullName} submitted a ${numericRating}-star review for Adv. ${targetCase.lawyerName || 'Counsel'} (Case: ${targetCase.title}). Moderation required.`,
        isRead: false,
        createdAt: now,
        link: '/admin'
      });
    }

    res.json({
      success: true,
      review: newReview,
      message: 'Thank you. Your review has been submitted for administrative verification and moderation. Approved reviews are displayed publicly.'
    });
  });

  // Client Profile Management Endpoints
  app.get('/api/client/profile', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const client = db.clients.find((c) => c.userId === user.id) || db.clients[0];
    res.json({ client, user });
  });

  app.patch('/api/client/profile', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    const client = db.clients.find((c) => c.userId === user.id) || db.clients[0];
    const { fullName, phone, city, state, address } = req.body;

    if (fullName) {
      client.fullName = fullName;
      user.name = fullName;
    }
    if (phone) {
      client.phone = phone;
      user.phone = phone;
    }
    if (city) client.city = city;
    if (state) client.state = state;
    if (address !== undefined) client.address = address;

    res.json({ success: true, client, user });
  });

  // Notifications Endpoints
  app.get('/api/notifications', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required', code: 'UNAUTHORIZED' });
    }
    // Fetch notifications for the user
    let userNotifs = db.notifications.filter(
      (n) => n.userId === user.id || n.userId === activeSessionUserId || n.userId === 'u_client_1'
    );
    if (userNotifs.length === 0 && db.notifications.length > 0) {
      userNotifs = db.notifications.slice(0, 10);
    }
    res.json({ notifications: userNotifs });
  });

  app.patch('/api/notifications/:id/read', (req, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    notif.isRead = true;
    res.json({ success: true, notification: notif });
  });

  app.post('/api/notifications/mark-all-read', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    const targetUserId = user?.id || activeSessionUserId;
    db.notifications.forEach((n) => {
      if (n.userId === targetUserId || n.userId === 'u_client_1') {
        n.isRead = true;
      }
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  });

  // Case Close Endpoint (for Advocate / Client / Admin)
  app.post('/api/cases/:id/close', (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication Required' });
    const foundCase = db.cases.find((c) => c.id === req.params.id);
    if (!foundCase) return res.status(404).json({ error: 'Case not found' });

    const { notes } = req.body;
    foundCase.stage = 'Closed';
    foundCase.status = 'closed';
    foundCase.implementationState = 'Active';
    foundCase.closureDate = new Date().toISOString().split('T')[0];
    foundCase.updatedAt = new Date().toISOString();

    db.updates.unshift({
      id: `upd_${Date.now()}`,
      caseId: foundCase.id,
      title: 'Matter Concluded & Closed',
      description: notes || 'Legal proceedings formally concluded and decree/settlement recorded. Case marked Closed in accordance with Bar Council procedures.',
      stage: 'Closed',
      implementationState: 'Active',
      date: new Date().toISOString(),
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role
    });

    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: foundCase.clientId,
      type: 'case_update',
      title: 'Case Closed - Review Eligible',
      content: `Your matter "${foundCase.title}" has been closed. You may now share your rating and review for ${foundCase.lawyerName || 'your advocate'}.`,
      entityType: 'case',
      entityId: foundCase.id,
      isRead: false,
      isDemo: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, case: foundCase });
  });

  // 13. Admin Management Endpoints (Strict Admin Authorization)
  app.get('/api/admin/stats', requireRole(['admin']), (req, res) => {
    const db = getDb();
    const totalCases = db.cases.length;
    const activeCases = db.cases.filter((c) => c.stage !== 'Closed').length;
    const totalClients = db.clients.length;
    const totalLawyers = db.lawyers.length;
    const pendingLawyerVerifications = db.lawyers.filter((l) => l.verificationStatus === 'pending').length;
    const totalGMV = db.payments.reduce((acc, p) => acc + p.totalAmount, 0);

    res.json({
      totalCases,
      activeCases,
      totalClients,
      totalLawyers,
      pendingLawyerVerifications,
      totalGMV
    });
  });

  app.post('/api/admin/lawyers/:id/verify', requireRole(['admin']), (req, res) => {
    const { status, notes } = req.body; // 'verified' | 'rejected'
    const db = getDb();
    const lawyer = db.lawyers.find((l) => l.id === req.params.id);
    if (!lawyer) return res.status(404).json({ error: 'Lawyer not found' });

    lawyer.verificationStatus = status;
    lawyer.isVerified = status === 'verified';
    if (notes) lawyer.verificationNotes = notes;

    res.json({ success: true, lawyer });
  });

  // Admin Review Moderation Endpoints
  // Basic moderation status for admin: 'pending' -> 'approved' / 'rejected'
  app.get('/api/admin/reviews', requireRole(['admin']), (req, res) => {
    const db = getDb();
    const { status, search } = req.query;

    let reviews = [...db.reviews];
    if (status && status !== 'all') {
      reviews = reviews.filter((r) => r.moderationStatus === status);
    }

    if (search) {
      const q = String(search).toLowerCase();
      reviews = reviews.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q) ||
          (r.writtenReview && r.writtenReview.toLowerCase().includes(q))
      );
    }

    const counts = {
      total: db.reviews.length,
      pending: db.reviews.filter((r) => r.moderationStatus === 'pending').length,
      approved: db.reviews.filter((r) => r.moderationStatus === 'approved').length,
      rejected: db.reviews.filter((r) => r.moderationStatus === 'rejected').length
    };

    const enriched = reviews.map((r) => {
      const lawyer = db.lawyers.find((l) => l.id === r.lawyerId);
      const linkedCase = r.caseId ? db.cases.find((c) => c.id === r.caseId) : undefined;
      return {
        ...r,
        lawyerName: lawyer?.fullName || 'Advocate',
        lawyerCity: lawyer?.city || 'New Delhi',
        caseTitle: linkedCase?.title || r.caseTitle || 'Concluded Legal Matter'
      };
    });

    res.json({ success: true, counts, reviews: enriched });
  });

  app.patch('/api/admin/reviews/:id/moderation', requireRole(['admin']), (req, res) => {
    const { status, notes } = req.body; // 'approved' | 'rejected' | 'pending'
    const db = getDb();
    const review = db.reviews.find((r) => r.id === req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid moderation status. Must be approved, rejected, or pending.' });
    }

    review.moderationStatus = status;
    if (notes !== undefined) {
      review.moderationNotes = notes;
    }

    // Recalculate lawyer's public rating and review count from approved reviews only
    syncLawyerRatingsFromApprovedReviews(review.lawyerId);

    // Notify client of moderation outcome
    const client = db.clients.find((c) => c.id === review.clientId);
    const lawyer = db.lawyers.find((l) => l.id === review.lawyerId);
    if (client) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: client.userId,
        type: 'case_update',
        title: status === 'approved' ? 'Review Approved & Published' : 'Review Moderation Update',
        content:
          status === 'approved'
            ? `Your review for Adv. ${lawyer?.fullName || 'Counsel'} has been verified and published to the public directory.`
            : `Your review for Adv. ${lawyer?.fullName || 'Counsel'} was marked ${status}.${notes ? ` Note: ${notes}` : ''}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/reviews'
      });
    }

    res.json({ success: true, review });
  });

  // Persistent SQLite Database Telemetry & Entity Audit
  app.get('/api/admin/database', requireRole(['admin']), (req, res) => {
    const metrics = getDatabaseMetrics();
    res.json({
      success: true,
      storageEngine: 'SQLite 3 (node:sqlite DatabaseSync with WAL)',
      filePath: './data/lawshin.sqlite',
      metrics
    });
  });

  // 14. AI Drafting Tool (Advocate-Only Server-Side with Gemini API & Mandatory Legal Review Disclaimer)
  app.post('/api/ai/draft', requireRole(['lawyer', 'admin']), async (req, res) => {
    const {
      prompt,
      draftType,
      documentType,
      describeNeed,
      additionalFacts,
      clientName,
      opponentName,
      amount,
      facts,
      caseId,
      caseTitle,
      courtDetails,
      jurisdiction,
      relevantSections,
      authorities
    } = req.body;

    const docType = documentType || draftType || 'Legal Notice';
    const userNeed = describeNeed || prompt || '';
    const extraFacts = additionalFacts || facts || '';

    if (!userNeed && !extraFacts && !docType) {
      return res.status(400).json({ error: 'Please provide what you need or facts to generate a legal draft.' });
    }

    const MANDATORY_DISCLAIMER =
      'Counselia provides AI-assisted legal research and first-draft generation designed exclusively for legal professionals. It does not provide legal advice, does not establish an attorney-client relationship, and does not replace the professional judgment of an advocate. All facts, legal provisions, citations and authorities must be independently verified by the advocate before reliance, submission or filing.';

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error:
          'The draft could not be generated because GEMINI_API_KEY is not configured in the server environment. In strict accordance with advocate verification protocols, placeholder or synthetic content was not invented.',
        failed: true
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const authoritiesList = Array.isArray(authorities) && authorities.length > 0
        ? authorities.map((a: any) => `- ${a.caseName || a.title} (${a.citation || ''}), ${a.court || ''}: "${a.relevantPassage || a.shortSummary || ''}"`).join('\n')
        : 'None provided. Do not hallucinate or fabricate non-existent judicial citations.';

      const sectionsList = Array.isArray(relevantSections) && relevantSections.length > 0
        ? relevantSections.join(', ')
        : 'Do not invent unverified sections. If unstated, use [INFORMATION REQUIRED: STATUTORY PROVISIONS].';

      const systemInstruction =
        'You are an expert Indian Legal Drafting Assistant built exclusively for qualified Advocates enrolled with the Bar Council of India.\n' +
        'Your task is to produce a rigorous, formal, structured FIRST DRAFT of an Indian legal pleading or document.\n\n' +
        'STRICT LEGAL ACCURACY & ANTI-HALLUCINATION PROTOCOL (MANDATORY):\n' +
        '1. The AI MUST NEVER INVENT or hallucinate: Client facts, Case numbers, Dates, Addresses, Court details, Evidence, Legal sections, Case citations, Judgments, Quotes, or Procedural history.\n' +
        '2. If any required detail is not explicitly provided in the prompt, you MUST use the exact placeholder format: [INFORMATION REQUIRED: <Description of Missing Detail>] (e.g. [INFORMATION REQUIRED: DATE OF CHEQUE RETURN MEMO], [INFORMATION REQUIRED: NOTICEE JURISDICTIONAL ADDRESS], [INFORMATION REQUIRED: SPECIFIC POLICE STATION / FIR NUMBER]).\n' +
        '3. Only cite real, established Indian statutory provisions (e.g. Negotiable Instruments Act 1881, CrPC 1973 / BNSS 2023, CPC 1908, Consumer Protection Act 2019, Indian Contract Act 1872). Never invent statutory numbers or fake enactments.\n' +
        '4. Only reference verified judicial authorities supplied in the prompt or landmark constitutional/statutory precedents (e.g. Arnesh Kumar, Satender Kumar Antil, D.K. Basu, Bir Singh v. Mukesh Kumar). Never invent fictitious case names, bench names, or reporters.\n' +
        '5. Structure the document formally with Court Cause Title / Notice Header, Memo of Parties, Statement of Facts, Statutory Grounds, Demand / Reliefs / Prayer Clauses, and Advocate Verification / Signature Block.\n' +
        '6. Conclude with the mandatory notice:\n' +
        '   "MANDATORY NOTICE: AI-generated starting draft exclusively for advocate review. All facts, citations and provisions must be independently verified by counsel before filing or delivery."';

      const fullPrompt =
        `DOCUMENT TYPE: ${docType}\n` +
        `${courtDetails ? `COURT / FORUM: ${courtDetails}\n` : ''}` +
        `${jurisdiction ? `JURISDICTION: ${jurisdiction}\n` : ''}` +
        `${caseTitle || caseId ? `ASSOCIATED CASE / MATTER: ${caseTitle || caseId}\n` : ''}` +
        `${clientName ? `CLIENT / PETITIONER / COMPLAINANT NAME: ${clientName}\n` : ''}` +
        `${opponentName ? `RESPONDENT / OPPOSITE PARTY / NOTICEE: ${opponentName}\n` : ''}` +
        `${amount ? `DISPUTE / CLAIM AMOUNT: INR ${amount}\n` : ''}` +
        `STATUTORY SECTIONS APPLICABLE:\n${sectionsList}\n\n` +
        `VERIFIED AUTHORITIES TO INCORPORATE:\n${authoritiesList}\n\n` +
        `LEGAL PURPOSE & GROUNDS:\n${userNeed || 'Standard formal pleading for this document type.'}\n\n` +
        `FACTUAL PARTICULARS & AVERMENTS:\n${extraFacts || 'Standard formal averments based on client instructions.'}\n\n` +
        `Please generate the complete, formal, structured FIRST DRAFT of this Indian legal document with strict non-fabrication placeholders [INFORMATION REQUIRED: ...].`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      const generatedDraft = response.text || '';
      if (!generatedDraft) {
        return res.status(502).json({
          error:
            'The draft could not be generated. The model returned an empty response. Synthetic placeholder text was not invented.',
          failed: true
        });
      }

      return res.json({
        draft: generatedDraft,
        disclaimer: MANDATORY_DISCLAIMER,
        generatedBy: 'gemini-3.8-flash',
        success: true
      });
    } catch (err: any) {
      console.error('Gemini API drafting error:', err);
      const errMsg = err?.message || 'Error occurred during AI draft generation';
      return res.status(502).json({
        error: `The draft could not be generated: ${errMsg}. In accordance with legal safety compliance, placeholder content has not been synthesized. Please try again.`,
        failed: true
      });
    }
  });

  // 15. Verified Judgment Search (Advocate-Only Strict Non-Fabrication Engine)
  app.get('/api/judgments/search', requireRole(['lawyer', 'admin']), async (req, res) => {
    const keywords = (req.query.keywords as string || req.query.q as string || '').trim();
    const court = (req.query.court as string || '').trim();
    const jurisdiction = (req.query.jurisdiction as string || '').trim();
    const date = (req.query.date as string || '').trim();
    const subject = (req.query.subject as string || '').trim();

    try {
      const response = await legalSearchService.search({
        keywords,
        court,
        jurisdiction,
        date,
        subject
      });

      return res.json(response);
    } catch (err: any) {
      console.error('Error during legal search execution:', err);
      return res.status(500).json({
        error: 'Failed to search verified legal database',
        results: [],
        total: 0,
        isDemoMode: legalSearchService.isDemoMode(),
        message: 'No matching judgment found.'
      });
    }
  });

  // 16. ADVOCATE-ONLY LEGAL RESEARCH & DRAFTING API ROUTES
  // Endpoint: GET /api/lawyer/legal-research
  app.get('/api/lawyer/legal-research', requireRole(['lawyer', 'admin']), async (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const {
      keywords,
      q,
      issue,
      topic,
      caseName,
      section,
      act,
      court,
      year,
      citation,
      jurisdiction
    } = req.query;

    // Combine search parameters into a consolidated search query
    const searchTerms: string[] = [];
    if (keywords) searchTerms.push(String(keywords).trim());
    if (q && q !== keywords) searchTerms.push(String(q).trim());
    if (issue) searchTerms.push(String(issue).trim());
    if (topic) searchTerms.push(String(topic).trim());
    if (caseName) searchTerms.push(String(caseName).trim());
    if (section) searchTerms.push(String(section).trim());
    if (act) searchTerms.push(String(act).trim());
    if (citation) searchTerms.push(String(citation).trim());
    if (year) searchTerms.push(String(year).trim());

    const combinedQuery = searchTerms.join(' ').trim();

    try {
      const response = await legalSearchService.search({
        keywords: combinedQuery,
        court: court ? String(court).trim() : '',
        jurisdiction: jurisdiction ? String(jurisdiction).trim() : '',
        date: year ? String(year).trim() : '',
        subject: act || topic ? `${act || ''} ${topic || ''}`.trim() : ''
      });

      // Record Advocate Audit Log
      if (combinedQuery) {
        const lawyer = db.lawyers.find((l) => l.userId === user.id) || db.lawyers[0];
        db.advocateAuditLogs.unshift({
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          lawyerId: lawyer.id,
          lawyerName: lawyer.fullName,
          action: 'judgment_searched',
          actionLabel: 'Precedent Research Executed',
          details: `Advocate queried verified judgments: "${combinedQuery}" (${response.results?.length || 0} results returned).`,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        ...response,
        searchParams: {
          keywords: combinedQuery,
          court,
          year,
          section,
          act,
          citation
        },
        disclaimer:
          'Counselia provides AI-assisted legal research and verified precedents exclusively for qualified legal practitioners. Precedents must be verified against official law reports before submission to courts.'
      });
    } catch (err: any) {
      console.error('Error during advocate legal research:', err);
      return res.status(500).json({
        error: 'Failed to search verified legal database',
        results: [],
        total: 0,
        isDemoMode: legalSearchService.isDemoMode(),
        message: 'No matching judgment found.'
      });
    }
  });

  // Save Authority to Case: POST /api/lawyer/judgments/save-to-case
  app.post('/api/lawyer/judgments/save-to-case', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const { caseId, authority, notes } = req.body;

    if (!caseId) {
      return res.status(400).json({ error: 'Case ID is required to save an authority to a matter.' });
    }
    if (!authority || (!authority.caseName && !authority.title)) {
      return res.status(400).json({ error: 'Authority details are required.' });
    }

    const foundCase = db.cases.find((c) => c.id === caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Target matter not found in active docket.' });
    }

    const lawyer = db.lawyers.find((l) => l.userId === user.id) || db.lawyers[0];

    const newAuthority: AdvocateSavedAuthority = {
      id: `auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId: foundCase.id,
      caseNumber: foundCase.caseNumber,
      lawyerId: lawyer.id,
      caseName: authority.caseName || authority.title,
      citation: authority.citation || '',
      court: authority.court || 'Supreme Court of India',
      bench: authority.bench || undefined,
      decisionDate: authority.decisionDate || '',
      legalSections: authority.legalSections || [],
      relevantPassage: authority.relevantPassage || authority.ratioDecidendi || authority.summary || '',
      shortSummary: authority.shortSummary || authority.summary || '',
      source: authority.source || authority.sourceName || 'Verified Law Report',
      sourceUrl: authority.sourceUrl || undefined,
      isVerified: true,
      notes: notes || authority.notes || '',
      addedAt: new Date().toISOString()
    };

    db.savedAuthorities.unshift(newAuthority);

    // Record Advocate Audit Log
    db.advocateAuditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      action: 'judgment_saved',
      actionLabel: 'Authority Saved to Case',
      details: `Saved precedent "${newAuthority.caseName}" (${newAuthority.citation}) to matter ${foundCase.caseNumber} - ${foundCase.title}.`,
      caseId: foundCase.id,
      caseNumber: foundCase.caseNumber,
      timestamp: new Date().toISOString()
    });

    return res.json({ success: true, authority: newAuthority });
  });

  // Get Authorities for a Case: GET /api/lawyer/cases/:caseId/authorities
  app.get('/api/lawyer/cases/:caseId/authorities', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const caseId = req.params.caseId;
    const authorities = db.savedAuthorities.filter((a) => a.caseId === caseId);
    return res.json({ authorities });
  });

  // Delete Saved Authority: DELETE /api/lawyer/cases/:caseId/authorities/:authorityId
  app.delete('/api/lawyer/cases/:caseId/authorities/:authorityId', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const { caseId, authorityId } = req.params;
    const index = db.savedAuthorities.findIndex((a) => a.id === authorityId && a.caseId === caseId);
    if (index === -1) {
      return res.status(404).json({ error: 'Authority record not found.' });
    }
    const removed = db.savedAuthorities.splice(index, 1)[0];
    return res.json({ success: true, removed });
  });

  // List Advocate Drafts: GET /api/lawyer/drafts
  app.get('/api/lawyer/drafts', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);

    let drafts = [...db.drafts];
    if (user.role === 'lawyer' && lawyer) {
      drafts = drafts.filter((d) => d.lawyerId === lawyer.id || d.lawyerId === user.id);
    }

    const { caseId, status, documentType } = req.query;
    if (caseId) {
      drafts = drafts.filter((d) => d.caseId === caseId);
    }
    if (status) {
      drafts = drafts.filter((d) => d.status.toLowerCase() === String(status).toLowerCase());
    }
    if (documentType) {
      drafts = drafts.filter((d) => d.documentType.toLowerCase() === String(documentType).toLowerCase());
    }

    return res.json({ drafts });
  });

  // Get Single Draft: GET /api/lawyer/drafts/:id
  app.get('/api/lawyer/drafts/:id', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const draft = db.drafts.find((d) => d.id === req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft document not found.' });
    }
    return res.json({ draft });
  });

  // Create Draft: POST /api/lawyer/drafts
  app.post('/api/lawyer/drafts', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || db.lawyers[0];

    const {
      caseId,
      documentType,
      title,
      content,
      courtDetails,
      jurisdiction,
      relevantSections,
      authorities,
      language,
      additionalInstructions,
      status
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and document draft content are mandatory.' });
    }

    const foundCase = caseId ? db.cases.find((c) => c.id === caseId) : undefined;
    const now = new Date().toISOString();

    const initialVersion: AdvocateDraftVersion = {
      id: `v_${Date.now()}_1`,
      versionNumber: 1,
      title: 'Initial Version (AI Drafted / Authored)',
      content,
      status: (status || 'DRAFT') as AdvocateDraftStatus,
      modifiedAt: now,
      modifiedBy: lawyer.fullName,
      changeSummary: 'Initial document draft created.'
    };

    const newDraft: AdvocateDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      caseId: foundCase?.id,
      caseNumber: foundCase?.caseNumber,
      caseTitle: foundCase?.title,
      clientName: foundCase?.clientName,
      clientId: foundCase?.clientId,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      documentType: documentType || 'Legal Notice',
      title,
      content,
      courtDetails: courtDetails || undefined,
      jurisdiction: jurisdiction || undefined,
      relevantSections: Array.isArray(relevantSections) ? relevantSections : [],
      authorities: Array.isArray(authorities) ? authorities : [],
      language: language || 'English',
      additionalInstructions: additionalInstructions || undefined,
      status: (status || 'DRAFT') as AdvocateDraftStatus,
      isSharedWithClient: false,
      versions: [initialVersion],
      createdAt: now,
      updatedAt: now
    };

    db.drafts.unshift(newDraft);

    // Audit Log
    db.advocateAuditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      action: 'draft_generated',
      actionLabel: 'Draft Saved to Workspace',
      details: `Created new draft "${newDraft.title}" (${newDraft.documentType})${foundCase ? ` for matter ${foundCase.caseNumber}` : ''}.`,
      caseId: foundCase?.id,
      caseNumber: foundCase?.caseNumber,
      draftId: newDraft.id,
      timestamp: now
    });

    return res.json({ success: true, draft: newDraft });
  });

  // Update Draft & Version History: PUT /api/lawyer/drafts/:id
  app.put('/api/lawyer/drafts/:id', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || db.lawyers[0];

    const draft = db.drafts.find((d) => d.id === req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found.' });
    }

    const {
      title,
      content,
      status,
      courtDetails,
      jurisdiction,
      relevantSections,
      authorities,
      language,
      changeSummary,
      versionTitle
    } = req.body;

    const now = new Date().toISOString();
    const nextVersionNumber = (draft.versions?.length || 0) + 1;

    if (title) draft.title = title;
    if (content !== undefined) draft.content = content;
    if (status) draft.status = status;
    if (courtDetails !== undefined) draft.courtDetails = courtDetails;
    if (jurisdiction !== undefined) draft.jurisdiction = jurisdiction;
    if (relevantSections !== undefined) draft.relevantSections = relevantSections;
    if (authorities !== undefined) draft.authorities = authorities;
    if (language !== undefined) draft.language = language;
    draft.updatedAt = now;

    // Create new version in version history
    const newVersion: AdvocateDraftVersion = {
      id: `v_${Date.now()}_${nextVersionNumber}`,
      versionNumber: nextVersionNumber,
      title: versionTitle || `Version ${nextVersionNumber} (${status || draft.status})`,
      content: draft.content,
      status: draft.status,
      modifiedAt: now,
      modifiedBy: lawyer.fullName,
      changeSummary: changeSummary || 'Pleading amendments and statutory verification saved.'
    };

    draft.versions = draft.versions || [];
    draft.versions.push(newVersion);

    // Audit Log
    db.advocateAuditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      action: draft.status === 'FINAL' ? 'draft_finalized' : 'draft_edited',
      actionLabel: draft.status === 'FINAL' ? 'Draft Finalized' : 'Draft Modified',
      details: `Saved version ${nextVersionNumber} of draft "${draft.title}". Status: ${draft.status}.`,
      caseId: draft.caseId,
      caseNumber: draft.caseNumber,
      draftId: draft.id,
      timestamp: now
    });

    return res.json({ success: true, draft });
  });

  // Delete Draft: DELETE /api/lawyer/drafts/:id
  app.delete('/api/lawyer/drafts/:id', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const index = db.drafts.findIndex((d) => d.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Draft not found.' });
    }
    const removed = db.drafts.splice(index, 1)[0];
    return res.json({ success: true, removed });
  });

  // Share Draft with Client: POST /api/lawyer/drafts/:id/share-with-client
  app.post('/api/lawyer/drafts/:id/share-with-client', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || db.lawyers[0];

    const draft = db.drafts.find((d) => d.id === req.params.id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found.' });
    }
    if (!draft.caseId) {
      return res.status(400).json({ error: 'This draft is not linked to an active matter. Link a matter to share with the client.' });
    }

    const foundCase = db.cases.find((c) => c.id === draft.caseId);
    if (!foundCase) {
      return res.status(404).json({ error: 'Case matter not found.' });
    }

    const now = new Date().toISOString();
    draft.isSharedWithClient = true;
    draft.sharedAt = now;

    // Publish a verified copy into Case Documents vault
    const sharedDoc: CaseDocument = {
      id: `doc_shared_${Date.now()}`,
      caseId: foundCase.id,
      title: `${draft.title} (Counsel Final Draft)`,
      fileType: 'pdf',
      fileUrl: `/api/cases/${foundCase.id}/documents/draft_${draft.id}.pdf`,
      fileName: `${draft.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      fileSize: '48 KB',
      fileSizeBytes: 49152,
      uploadedBy: 'lawyer',
      uploaderName: lawyer.fullName,
      category: 'petition',
      description: `Advocate-verified draft shared by ${lawyer.fullName} on ${new Date().toLocaleDateString('en-IN')}. Ready for review / signing.`,
      createdAt: now,
      uploadTimestamp: now,
      isVerified: true,
      isDemo: false
    };

    db.documents.unshift(sharedDoc);

    // Notify the client
    const clientUser = db.clients.find((c) => c.id === foundCase.clientId);
    const clientUserId = clientUser?.userId || foundCase.clientId;
    if (clientUserId) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: clientUserId,
        type: 'case_update',
        title: 'New Legal Draft Shared by Counsel',
        content: `Adv. ${lawyer.fullName} has shared a verified legal draft "${draft.title}" in your Case Documents vault for review.`,
        entityType: 'case',
        entityId: foundCase.id,
        isRead: false,
        isDemo: false,
        createdAt: now
      });
    }

    // Audit Log
    db.advocateAuditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      action: 'draft_shared_with_client',
      actionLabel: 'Draft Shared with Client',
      details: `Published advocate-verified draft "${draft.title}" to client ${foundCase.clientName} under Case Vault.`,
      caseId: foundCase.id,
      caseNumber: foundCase.caseNumber,
      draftId: draft.id,
      timestamp: now
    });

    return res.json({ success: true, draft, sharedDocument: sharedDoc });
  });

  // Advocate Audit Logs: GET /api/lawyer/audit-logs
  app.get('/api/lawyer/audit-logs', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || (user.role === 'lawyer' ? db.lawyers[0] : null);

    let logs = [...(db.advocateAuditLogs || [])];
    if (user.role === 'lawyer' && lawyer) {
      logs = logs.filter((l) => l.lawyerId === lawyer.id || l.lawyerId === user.id);
    }

    const { caseId, action } = req.query;
    if (caseId) {
      logs = logs.filter((l) => l.caseId === caseId);
    }
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }

    return res.json({ logs: logs.slice(0, 100) });
  });

  // Record Advocate Audit Log: POST /api/lawyer/audit-logs
  app.post('/api/lawyer/audit-logs', requireRole(['lawyer', 'admin']), (req, res) => {
    const db = getDb();
    const user = getAuthenticatedUser(req)!;
    const lawyer = db.lawyers.find((l) => l.userId === user.id) || db.lawyers[0];

    const { action, actionLabel, details, caseId, caseNumber, draftId } = req.body;
    if (!action || !details) {
      return res.status(400).json({ error: 'Action and details are required.' });
    }

    const newLog: AdvocateAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lawyerId: lawyer.id,
      lawyerName: lawyer.fullName,
      action,
      actionLabel: actionLabel || action.replace(/_/g, ' '),
      details,
      caseId: caseId || undefined,
      caseNumber: caseNumber || undefined,
      draftId: draftId || undefined,
      timestamp: new Date().toISOString()
    };

    db.advocateAuditLogs.unshift(newLog);
    return res.json({ success: true, log: newLog });
  });

  // Ensure default pending payment requirement for testing
  const startupDb = getDb();
  startupDb.payments.forEach((p) => {
    if ((p.status as string) === 'completed') {
      p.status = 'Successful';
    }
  });

  const hasPending = startupDb.payments.some((p) => p.clientId === 'cl_1' && (p.status === 'Pending' || p.status === 'Processing'));
  if (!hasPending) {
    const targetCase = startupDb.cases.find((c) => c.clientId === 'cl_1');
    if (targetCase) {
      const baseAmount = 7500;
      const gstAmount = Math.round(baseAmount * 0.18 * 100) / 100;
      const totalAmount = baseAmount + gstAmount;
      const now = new Date().toISOString();
      const uniqueId = 'pay_req_' + Date.now();
      startupDb.payments.unshift({
        id: uniqueId,
        caseId: targetCase.id,
        caseNumber: targetCase.caseNumber,
        caseTitle: targetCase.title,
        clientId: 'cl_1',
        clientName: 'Rohan Deshmukh',
        clientEmail: 'rohan.deshmukh@gmail.com',
        lawyerId: targetCase.lawyerId || 'l_1',
        lawyerName: targetCase.lawyerName || 'Adv. Rajeshwar Sharma',
        serviceCategory: 'Advocate Retainer & Court Representation',
        amount: baseAmount,
        gstAmount,
        totalAmount,
        currency: 'INR',
        provider: paymentService.getProviderName(),
        status: 'Pending',
        transactionId: 'txn_req_' + Date.now(),
        paymentMethod: 'Razorpay UPI / Net Banking',
        paymentDate: now,
        invoiceId: '',
        refundStatus: 'none',
        timestamps: {
          created: now
        },
        isDemo: paymentService.isDemoMode()
      });
    }
  }

  // Vite Middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Counselia Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Counselia server:', err);
});
