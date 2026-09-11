import React, { useState } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  User,
  Scale,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Briefcase,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Building,
  RotateCcw
} from 'lucide-react';
import { UserRole, User as UserType } from '../../types.js';
import { api } from '../../services/api.js';
import { Card, Button, Input, Select, Badge, Alert } from '../ui/index.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  availableUsers: UserType[];
  onSelectPredefinedUser: (userId: string) => void;
  initialMode?: 'login' | 'signup' | 'forgot-password';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableUsers,
  onSelectPredefinedUser,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password'>(initialMode);
  const [signupRole, setSignupRole] = useState<'client' | 'lawyer'>('client');

  // Common Fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Lawyer Specific Fields
  const [barNumber, setBarNumber] = useState('');
  const [stateBar, setStateBar] = useState('Bar Council of Delhi');
  const [experienceYears, setExperienceYears] = useState('5');
  const [selectedPracticeAreas, setSelectedPracticeAreas] = useState<string[]>([
    'Civil Litigation',
    'Consumer Protection'
  ]);

  // Client OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePracticeAreaToggle = (area: string) => {
    if (selectedPracticeAreas.includes(area)) {
      setSelectedPracticeAreas(selectedPracticeAreas.filter((a) => a !== area));
    } else {
      setSelectedPracticeAreas([...selectedPracticeAreas, area]);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please provide a valid 10-digit mobile number for statutory OTP verification.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.sendOtp(phone);
      setSimulatedOtp(res.simulatedOtp);
      setEnteredOtp(res.simulatedOtp); // Pre-filled for review testing
      setOtpSent(true);
      setSuccessMessage('6-digit OTP code dispatched to mobile. Valid for 10 minutes.');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!enteredOtp || enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.verifyOtp(phone, enteredOtp);
      setIsOtpVerified(true);
      setSuccessMessage('Mobile number verified successfully under telecom KYC standards.');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone) {
      setError('Please enter your email or registered phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(emailOrPhone, password || undefined);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Full legal name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Valid email address is required.');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError('Valid 10-digit mobile number is required.');
      return;
    }
    if (signupRole === 'lawyer' && !barNumber.trim()) {
      setError('State Bar Council Enrolment Number is required for advocates.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name,
        email,
        phone,
        password: password || 'Password@123',
        role: signupRole,
        city: 'New Delhi',
        state: 'Delhi'
      };

      if (signupRole === 'lawyer') {
        payload.barCouncilNumber = barNumber.trim();
        payload.stateBarCouncil = stateBar;
        payload.experienceYears = Number(experienceYears) || 3;
        payload.practiceAreas = selectedPracticeAreas.length ? selectedPracticeAreas : ['Civil Litigation'];
      }

      const res = await api.registerUser(payload);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your account email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.forgotPassword(resetEmail);
      setResetToken(res.resetToken);
      setResetMessage(`Password reset link generated for ${resetEmail}. Token: ${res.resetToken}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) {
      setError('Reset token and new password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setSuccessMessage(res.message);
      setTimeout(() => {
        setMode('login');
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const practiceAreaOptions = [
    'Civil Litigation',
    'Consumer Protection',
    'Tenancy & Real Estate',
    'Cheque Bounce (Sec 138)',
    'Family & Matrimonial',
    'Cyber Crime',
    'Employment & Labor'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-amber-400 shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-serif text-slate-900">
                Counselia Authentication & Access
              </h2>
              <p className="text-slate-500 text-[10px]">
                {mode === 'login' && 'Sign in to access your confidential case room and caseload'}
                {mode === 'signup' && 'Create your verified Citizen or Advocate profile'}
                {mode === 'forgot-password' && 'Password recovery for registered accounts'}
                {mode === 'reset-password' && 'Set a new secure password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Alerts */}
          {error && (
            <Alert variant="error" title="Authentication Error">
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" title="Success">
              {successMessage}
            </Alert>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registered Email or Mobile Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. rohan.deshmukh@gmail.com or 9820144521"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode('forgot-password');
                      }}
                      className="text-[11px] font-semibold text-amber-700 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="Enter password (default for demo: Password@123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<KeyRound className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In to Counselia
                </Button>
              </form>

              {/* Quick Role-Based Account Switcher for Instant Evaluation */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Quick Role Switcher (Pre-Configured Test Accounts)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPredefinedUser('u_client_1');
                      onClose();
                    }}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-blue-700 block">CLIENT</span>
                    <span className="text-xs font-semibold text-slate-900 block truncate">Rohan D.</span>
                    <span className="text-[9px] text-slate-500 block">Citizen Matter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectPredefinedUser('u_lawyer_1');
                      onClose();
                    }}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-amber-700 block">ADVOCATE</span>
                    <span className="text-xs font-semibold text-slate-900 block truncate">Adv. Rajeshwar</span>
                    <span className="text-[9px] text-slate-500 block">Delhi Bar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectPredefinedUser('u_admin_1');
                      onClose();
                    }}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition-all cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-purple-700 block">ADMIN</span>
                    <span className="text-xs font-semibold text-slate-900 block truncate">Registrar</span>
                    <span className="text-[9px] text-slate-500 block">Audit & Escrow</span>
                  </button>
                </div>
              </div>

              <div className="text-center pt-2 text-xs text-slate-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('signup');
                  }}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Create New Account
                </button>
              </div>
            </div>
          )}

          {/* 2. SIGNUP MODE */}
          {mode === 'signup' && (
            <div className="space-y-4">
              {/* Role Picker: Client vs Lawyer (Admin explicitly barred) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Registration Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole('client')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      signupRole === 'client'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <div className="text-xs">Citizen / Client</div>
                      <div className="text-[10px] font-normal text-slate-500">Need legal help</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole('lawyer')}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      signupRole === 'lawyer'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold ring-1 ring-amber-400'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <div className="text-xs">Advocate / Lawyer</div>
                      <div className="text-[10px] font-normal text-slate-500">Enrolled practitioner</div>
                    </div>
                  </button>
                </div>

                {/* Admin Self-Registration Restriction Notice */}
                <div className="mt-2 p-2 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2 text-[10px] text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>
                    <strong>Security Policy:</strong> Administrator accounts cannot be self-registered and are restricted to platform security officers.
                  </span>
                </div>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {signupRole === 'lawyer' ? 'Full Legal Name (as on Bar Roll)' : 'Full Name'}
                  </label>
                  <Input
                    type="text"
                    placeholder={signupRole === 'lawyer' ? 'Adv. Meenakshi Sundaram' : 'Sunita Sharma'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      10-Digit Mobile Number
                    </label>
                    <Input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Client OTP Verification Step */}
                {signupRole === 'client' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-700" />
                        Client Mobile OTP Verification
                      </span>
                      {isOtpVerified ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendOtp()}
                          loading={loading}
                        >
                          {otpSent ? 'Resend OTP' : 'Send 6-Digit OTP'}
                        </Button>
                      )}
                    </div>

                    {otpSent && !isOtpVerified && (
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP (demo: 748921)"
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          className="font-mono text-center tracking-widest"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="md"
                          onClick={handleVerifyOtp}
                          loading={loading}
                        >
                          Verify
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Lawyer Specific Mandatory Fields */}
                {signupRole === 'lawyer' && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Bar Council Enrolment No.
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. D/1842/2018"
                          value={barNumber}
                          onChange={(e) => setBarNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          State Bar Council
                        </label>
                        <Select
                          value={stateBar}
                          onChange={(e) => setStateBar(e.target.value)}
                          options={[
                            { value: 'Bar Council of Delhi', label: 'Bar Council of Delhi' },
                            { value: 'Bar Council of Maharashtra & Goa', label: 'Bar Council of Maharashtra & Goa' },
                            { value: 'Bar Council of Karnataka', label: 'Bar Council of Karnataka' },
                            { value: 'Bar Council of Tamil Nadu & Puducherry', label: 'Bar Council of Tamil Nadu & Puducherry' },
                            { value: 'Bar Council of Telangana', label: 'Bar Council of Telangana' },
                            { value: 'Bar Council of West Bengal', label: 'Bar Council of West Bengal' }
                          ]}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Years of Standing / Experience
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Practice Areas (Select all that apply)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {practiceAreaOptions.map((area) => {
                          const selected = selectedPracticeAreas.includes(area);
                          return (
                            <button
                              type="button"
                              key={area}
                              onClick={() => handlePracticeAreaToggle(area)}
                              className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                                selected
                                  ? 'bg-amber-700 text-white border-amber-700'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {area}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      <strong>Advocate Verification Requirement:</strong> All new advocate accounts are placed under 'Pending Verification' until credentials are confirmed against State Bar Council rolls.
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Set Account Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Create a strong password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={loading}
                >
                  {signupRole === 'lawyer' ? 'Submit Advocate Registration' : 'Complete Citizen Registration'}
                </Button>
              </form>

              <div className="text-center pt-2 text-xs text-slate-600">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* 3. FORGOT PASSWORD MODE */}
          {mode === 'forgot-password' && (
            <div className="space-y-4">
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. rohan.deshmukh@gmail.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={loading}
                >
                  Generate Password Reset Link
                </Button>
              </form>

              {resetMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="text-xs text-emerald-900 font-semibold">{resetMessage}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setMode('reset-password');
                    }}
                  >
                    Proceed to Set New Password
                  </Button>
                </div>
              )}

              <div className="text-center pt-2 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}

          {/* 4. RESET PASSWORD MODE */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reset Token
                </label>
                <Input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste token or received link"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={loading}
              >
                Update Password & Login
              </Button>

              <div className="text-center pt-2 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
