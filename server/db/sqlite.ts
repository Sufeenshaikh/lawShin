import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  User,
  ClientProfile,
  LawyerProfile,
  LawFirm,
  LegalCase,
  CaseDocument,
  CaseMessage,
  CaseUpdate,
  CaseParticipant,
  Payment,
  Invoice,
  Appointment,
  Review,
  Notification,
  LegalQuery,
  PublicContent,
  VerifiedJudgment,
  UserRole
} from '../../src/types.js';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'lawshin.sqlite');
const SCHEMA_PATH = path.resolve(process.cwd(), 'server', 'db', 'schema.sql');

let dbInstance: DatabaseSync | null = null;

/**
 * Initializes and returns the persistent SQLite database singleton.
 */
export function getSqliteDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  dbInstance = new DatabaseSync(DB_PATH);

  // Enable Foreign Keys and WAL Mode for high reliability and concurrent performance
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA journal_mode = WAL;');

  // Run schema definitions
  if (fs.existsSync(SCHEMA_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    dbInstance.exec(schemaSql);
  }

  // Safe migration for payments table status check constraint
  try {
    const payTableSql = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'payments'").get() as { sql: string } | undefined;
    if (payTableSql && payTableSql.sql.includes('CHECK(status')) {
      dbInstance.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE payments_migration (
          id TEXT PRIMARY KEY,
          case_id TEXT,
          client_id TEXT NOT NULL,
          lawyer_id TEXT,
          case_number TEXT,
          client_name TEXT,
          lawyer_name TEXT,
          service_category TEXT NOT NULL,
          amount REAL NOT NULL,
          gst_amount REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          provider TEXT NOT NULL DEFAULT 'Razorpay',
          transaction_id TEXT UNIQUE NOT NULL,
          payment_method TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Pending',
          payment_date TEXT NOT NULL,
          invoice_id TEXT,
          refund_status TEXT DEFAULT 'none',
          timestamps_created TEXT NOT NULL,
          timestamps_completed TEXT,
          is_demo INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO payments_migration SELECT * FROM payments;
        DROP TABLE payments;
        ALTER TABLE payments_migration RENAME TO payments;
        CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
        CREATE INDEX IF NOT EXISTS idx_payments_case_id ON payments(case_id);
        CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (migErr) {
    console.warn('Payments table migration notice:', migErr);
  }

  // Safe migration for appointments table to support location, cancellation_reason, and new status enum
  try {
    const appTableSql = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'appointments'").get() as { sql: string } | undefined;
    if (appTableSql && (!appTableSql.sql.includes('location') || appTableSql.sql.includes("CHECK(status IN ('scheduled'"))) {
      dbInstance.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE appointments_migration (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
          lawyer_id TEXT NOT NULL REFERENCES lawyers(id) ON DELETE RESTRICT,
          case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
          client_name TEXT NOT NULL,
          lawyer_name TEXT NOT NULL,
          case_title TEXT,
          date TEXT NOT NULL,
          time_slot TEXT NOT NULL,
          location TEXT NOT NULL DEFAULT 'Chamber No. 342, Saket District Court, New Delhi',
          type TEXT NOT NULL DEFAULT 'offline',
          mode TEXT NOT NULL DEFAULT 'Offline Chamber Meeting',
          status TEXT NOT NULL DEFAULT 'Requested' CHECK(status IN ('Requested', 'Confirmed', 'Completed', 'Cancelled', 'scheduled', 'completed', 'cancelled')),
          notes TEXT,
          fee REAL DEFAULT 0,
          meeting_link TEXT,
          cancellation_reason TEXT,
          is_demo INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT OR IGNORE INTO appointments_migration (
          id, client_id, lawyer_id, case_id, client_name, lawyer_name, case_title,
          date, time_slot, location, type, mode, status, notes, fee, meeting_link,
          is_demo, created_at, updated_at
        )
        SELECT 
          id, client_id, lawyer_id, case_id, client_name, lawyer_name, case_title,
          date, time_slot, 'Chamber No. 342, Lawyers Chamber Block, Saket District Court, New Delhi', type, mode,
          CASE WHEN status = 'scheduled' THEN 'Confirmed' ELSE status END,
          notes, fee, meeting_link, is_demo, created_at, updated_at
        FROM appointments;
        DROP TABLE appointments;
        ALTER TABLE appointments_migration RENAME TO appointments;
        CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_lawyer_id ON appointments(lawyer_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_case_id ON appointments(case_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
        CREATE INDEX IF NOT EXISTS idx_appointments_is_demo ON appointments(is_demo);
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (appMigErr) {
    console.warn('Appointments table migration notice:', appMigErr);
  }

  // Safe migration for reviews table to ensure moderation_notes column
  try {
    const revTableSql = dbInstance.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'reviews'").get() as { sql: string } | undefined;
    if (revTableSql && !revTableSql.sql.includes('moderation_notes')) {
      dbInstance.exec(`ALTER TABLE reviews ADD COLUMN moderation_notes TEXT;`);
    }
  } catch (revMigErr) {
    console.warn('Reviews table migration notice:', revMigErr);
  }

  // Check if database needs seeding with baseline demo data
  const userCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM users;').get() as { count: number };
  if (userCountRow.count === 0) {
    seedInitialDemoData(dbInstance);
  }

  // Ensure case_deadlines table is seeded if empty
  try {
    const deadlineCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM case_deadlines;').get() as { count: number };
    if (deadlineCountRow.count === 0) {
      seedInitialDeadlines(dbInstance);
    }
  } catch (err) {
    console.warn('[SQLite] Deadline check or seeding notice:', err);
  }

  return dbInstance;
}

/**
 * Seed initial baseline demo data tagged strictly with is_demo = 1.
 * Real user data created dynamically has is_demo = 0.
 */
function seedInitialDemoData(db: DatabaseSync): void {
  const now = new Date().toISOString();

  // 1. Seed Demo Users (is_demo = 1)
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, phone, role, password,
      is_email_verified, is_phone_verified, avatar_url,
      is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  const demoUsers: User[] = [
    {
      id: 'u_client_1',
      name: 'Rohan Deshmukh',
      email: 'rohan.deshmukh@gmail.com',
      phone: '+91 98201 44521',
      role: 'client',
      password: 'Password@123',
      isEmailVerified: true,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: '2025-01-10T10:00:00Z'
    },
    {
      id: 'u_client_2',
      name: 'Pooja Narang',
      email: 'pooja.narang@outlook.com',
      phone: '+91 98712 33419',
      role: 'client',
      password: 'Password@123',
      isEmailVerified: true,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      createdAt: '2025-01-18T12:30:00Z'
    },
    {
      id: 'u_lawyer_1',
      name: 'Adv. Rajeshwar Sharma',
      email: 'rajeshwar.legal@delhibar.org',
      phone: '+91 98110 54321',
      role: 'lawyer',
      password: 'Password@123',
      isEmailVerified: true,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      createdAt: '2024-11-05T09:00:00Z'
    },
    {
      id: 'u_lawyer_2',
      name: 'Adv. Ananya Sengupta',
      email: 'ananya.sengupta@mumbaicourt.in',
      phone: '+91 99200 88765',
      role: 'lawyer',
      password: 'Password@123',
      isEmailVerified: true,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      createdAt: '2024-11-12T14:00:00Z'
    },
    {
      id: 'u_lawyer_3',
      name: 'Adv. Vikramaditya Reddy',
      email: 'adv.reddy@hyderabadbar.com',
      phone: '+91 97000 12345',
      role: 'lawyer',
      password: 'Password@123',
      isEmailVerified: true,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      createdAt: '2024-12-01T11:00:00Z'
    },
    {
      id: 'u_lawyer_4',
      name: 'Adv. Meenakshi Sundaram',
      email: 'meenakshi.legal@chennaibar.org',
      phone: '+91 98401 77234',
      role: 'lawyer',
      password: 'Password@123',
      isEmailVerified: false,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      createdAt: '2025-02-01T10:00:00Z'
    },
    {
      id: 'u_admin_1',
      name: 'Chief Registrar & Compliance Admin',
      email: 'admin@counselia.in',
      phone: '+91 11 4050 9999',
      role: 'admin',
      password: 'Password@123',
      isEmailVerified: true,
      isPhoneVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      createdAt: '2024-10-01T00:00:00Z'
    }
  ];

  for (const u of demoUsers) {
    insertUser.run(
      u.id,
      u.name,
      u.email,
      u.phone,
      u.role,
      u.password || 'Password@123',
      u.isEmailVerified ? 1 : 0,
      u.isPhoneVerified ? 1 : 0,
      u.avatarUrl || null,
      u.createdAt,
      u.createdAt
    );
  }

  // 2. Seed Demo Clients
  const insertClient = db.prepare(`
    INSERT INTO clients (
      id, user_id, full_name, email, phone, city, state, address,
      is_phone_verified, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  insertClient.run('cl_1', 'u_client_1', 'Rohan Deshmukh', 'rohan.deshmukh@gmail.com', '+91 98201 44521', 'Delhi NCR', 'Delhi', 'Flat 402, Block C, Vasant Kunj, New Delhi', 1, '2025-01-10T10:00:00Z', '2025-01-10T10:00:00Z');
  insertClient.run('cl_2', 'u_client_2', 'Pooja Narang', 'pooja.narang@outlook.com', '+91 98712 33419', 'Mumbai', 'Maharashtra', '12B Sea Green Apartments, Worli, Mumbai', 1, '2025-01-18T12:30:00Z', '2025-01-18T12:30:00Z');

  // 3. Seed Demo Law Firms
  const insertFirm = db.prepare(`
    INSERT INTO law_firms (
      id, name, registration_number, founded_year, headquarters, city, state,
      address, contact_email, contact_phone, website, practice_areas,
      attorney_count, rating, description, logo_url, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  insertFirm.run(
    'firm_1',
    'Sharma & Chambers LLP',
    'LLPIN-AAB-9012',
    2011,
    'Connaught Place, New Delhi',
    'New Delhi',
    'Delhi',
    'Barakhamba Road, Connaught Place, New Delhi 110001',
    'contact@sharmachambers.in',
    '+91 11 2341 8800',
    'https://sharmachambers.example.in',
    JSON.stringify(['Civil Litigation', 'Tenancy & Property Disputes', 'Real Estate RERA', 'Consumer Protection']),
    14,
    4.9,
    'Premier dispute resolution firm representing individuals, startups, and housing societies in district courts, High Court of Delhi, and appellate tribunals.',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&auto=format&fit=crop&q=80',
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
  );

  insertFirm.run(
    'firm_2',
    'Lex Veritas Partners',
    'LLPIN-AAC-4419',
    2016,
    'Nariman Point, Mumbai',
    'Mumbai',
    'Maharashtra',
    'Mittal Towers, Nariman Point, Mumbai 400021',
    'advisory@lexveritas.in',
    '+91 22 6620 4400',
    'https://lexveritas.example.in',
    JSON.stringify(['Corporate & Commercial', 'Cheque Bounce (Sec 138 NI Act)', 'Employment Law', 'Arbitration']),
    19,
    4.8,
    'Corporate boutique law firm recognized for swift arbitration, debt recovery, and employment dispute negotiation.',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=120&auto=format&fit=crop&q=80',
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
  );

  // 4. Seed Demo Lawyers
  const insertLawyer = db.prepare(`
    INSERT INTO lawyers (
      id, user_id, law_firm_id, full_name, email, phone,
      bar_council_number, state_bar_council, experience_years,
      practice_areas, courts, bio, education, consultation_fee,
      rating, review_count, is_verified, verification_status,
      verification_notes, languages, city, state, avatar_url,
      is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  insertLawyer.run(
    'l_1', 'u_lawyer_1', 'firm_1', 'Adv. Rajeshwar Sharma', 'rajeshwar.legal@delhibar.org', '+91 98110 54321',
    'D/1428/2009', 'Bar Council of Delhi', 16,
    JSON.stringify(['Tenancy & Property Disputes', 'Civil Litigation', 'Consumer Protection', 'Arbitration']),
    JSON.stringify(['Delhi High Court', 'Saket District Court', 'Patiala House Court', 'National Consumer Disputes Redressal Commission']),
    'Practicing Advocate with over 16 years of courtroom experience in real estate disputes, security deposit recovery, RERA appeals, and consumer rights litigation.',
    'LL.B. (Campus Law Centre, Faculty of Law, University of Delhi), LL.M. (NLSIU Bengaluru)',
    1500, 4.9, 42, 1, 'verified', null,
    JSON.stringify(['English', 'Hindi']), 'New Delhi', 'Delhi',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    '2024-11-05T09:00:00Z', '2024-11-05T09:00:00Z'
  );

  insertLawyer.run(
    'l_2', 'u_lawyer_2', 'firm_2', 'Adv. Ananya Sengupta', 'ananya.sengupta@mumbaicourt.in', '+91 99200 88765',
    'MAH/3892/2014', 'Bar Council of Maharashtra & Goa', 11,
    JSON.stringify(['Corporate & Commercial', 'Cheque Bounce (Sec 138 NI Act)', 'Employment Law', 'Cyber Law']),
    JSON.stringify(['Bombay High Court', 'City Civil & Sessions Court Mumbai', 'NCLT Mumbai Bench']),
    'Specialist in commercial contract breach, corporate recovery, NI Act proceedings, and employment wrongful termination claims.',
    'B.A. LL.B. (Hons.) (Government Law College, Mumbai)',
    2000, 4.8, 38, 1, 'verified', null,
    JSON.stringify(['English', 'Hindi', 'Marathi', 'Bengali']), 'Mumbai', 'Maharashtra',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    '2024-11-12T14:00:00Z', '2024-11-12T14:00:00Z'
  );

  insertLawyer.run(
    'l_3', 'u_lawyer_3', null, 'Adv. Vikramaditya Reddy', 'adv.reddy@hyderabadbar.com', '+91 97000 12345',
    'TS/2104/2017', 'Bar Council of Telangana', 8,
    JSON.stringify(['Family Law', 'Matrimonial Disputes', 'Maintenance Claims', 'Wills & Succession']),
    JSON.stringify(['High Court for the State of Telangana', 'Family Courts City Civil Hyderabad']),
    'Empathy-driven legal advocate representing clients in amicable mutual-consent divorces, child custody settlements, and probate of wills.',
    'LL.B. (NALSAR University of Law, Hyderabad)',
    1200, 4.7, 29, 1, 'verified', null,
    JSON.stringify(['English', 'Telugu', 'Hindi']), 'Hyderabad', 'Telangana',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    '2024-12-01T11:00:00Z', '2024-12-01T11:00:00Z'
  );

  insertLawyer.run(
    'l_4', 'u_lawyer_4', null, 'Adv. Meenakshi Sundaram', 'meenakshi.legal@chennaibar.org', '+91 98401 77234',
    'TN/5512/2021', 'Bar Council of Tamil Nadu & Puducherry', 4,
    JSON.stringify(['Consumer Protection', 'E-Commerce Grievances', 'Defamation & Cyber Law']),
    JSON.stringify(['Madras High Court', 'District Consumer Commission Chennai']),
    'Passionate advocate helping retail consumers, vehicle owners, and online buyers seek quick remedies against defective products and unfair trade practices.',
    'B.Com. B.L. (Dr. Ambedkar Government Law College, Chennai)',
    1000, 4.6, 15, 0, 'pending', 'Bar certificate scanned copy uploaded; awaiting official verification from State Bar Council portal.',
    JSON.stringify(['English', 'Tamil']), 'Chennai', 'Tamil Nadu',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    '2025-02-01T10:00:00Z', '2025-02-01T10:00:00Z'
  );

  // 5. Seed Demo Cases (With explicit fields: client, assigned lawyer, title, category, description, location, urgency, status, filing date, next hearing date, created date, updated date, closure date)
  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, client_id, assigned_lawyer_id, title, category, description,
      location_city, location_state, urgency, is_urgent, status, stage,
      implementation_state, court_name, judge_name, filing_number,
      filing_date, next_hearing_date, closure_date, total_fee, paid_amount,
      documents_count, unread_count, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  insertCase.run(
    'case_1',
    'LS-2025-4491',
    'cl_1',
    'l_1',
    'Recovery of Withheld Rental Security Deposit (Rs. 1,40,000)',
    'Tenancy & Property Disputes',
    'Landlord refused to return 2 months of rental security deposit after peaceful key handover of 3BHK flat in Saket, falsely alleging repainting damages despite written move-out video walkthrough inspection signed by caretaker.',
    'New Delhi',
    'Delhi',
    'high',
    1,
    'in_progress',
    'Notice Sent',
    'Active',
    'Saket District Court (Courtroom 302)',
    'Shri R.K. Yadav, Additional Senior Civil Judge',
    'CS/SCJ/812/2025',
    '2025-02-14',
    '2025-04-18',
    null,
    12000,
    6000,
    3,
    0,
    '2025-01-20T14:30:00Z',
    now
  );

  insertCase.run(
    'case_2',
    'LS-2025-3810',
    'cl_1',
    'l_1',
    'Defective Inverter & Battery Replacement Claim under Consumer Protection Act',
    'Consumer Protection',
    'Purchased 150Ah tubular inverter setup with 3-year replacement warranty; battery ceased charging within 8 months. Authorized service center continually refused replacement citing fabricated physical negligence.',
    'New Delhi',
    'Delhi',
    'standard',
    0,
    'open',
    'Reply Received',
    'Active',
    'District Consumer Disputes Redressal Commission (South Delhi)',
    'Smt. Meena Saxena, President',
    'CC/502/2025',
    '2025-01-28',
    '2025-03-24',
    null,
    8000,
    8000,
    2,
    0,
    '2025-01-15T11:00:00Z',
    now
  );

  insertCase.run(
    'case_3',
    'LS-2025-1049',
    'cl_2',
    'l_2',
    'Dishonour of Cheque under Section 138 Negotiable Instruments Act (Rs. 4,50,000)',
    'Cheque Bounce (Sec 138 NI Act)',
    'Cheque issued towards commercial supplier consignment was returned unpaid by drawee bank with memo "Funds Insufficient". Statutory legal demand notice was dispatched within 30 days via speed post.',
    'Mumbai',
    'Maharashtra',
    'urgent',
    1,
    'hearing_scheduled',
    'In Court',
    'Active',
    'Metropolitan Magistrate Court, Esplanade, Mumbai',
    'Shri S.M. Kadam, Metropolitan Magistrate 14th Court',
    'CC/NI/4092/2025',
    '2025-02-02',
    '2025-04-05',
    null,
    18000,
    12000,
    4,
    0,
    '2025-01-19T09:45:00Z',
    now
  );

  insertCase.run(
    'case_4',
    'LS-2025-0914',
    'cl_2',
    null,
    'Wrongful Withholding of Experience Certificate and Final Settlement Salary',
    'Employment Law',
    'Served full 60-day contractual notice period; HR department withholding experience letter and Form 16 without lawful grounds.',
    'Mumbai',
    'Maharashtra',
    'standard',
    0,
    'open',
    'Notice Sent',
    'Submitted',
    null,
    null,
    null,
    null,
    null,
    null,
    7500,
    0,
    1,
    0,
    '2025-02-10T16:20:00Z',
    now
  );

  insertCase.run(
    'case_5',
    'LS-2024-9182',
    'cl_1',
    'l_1',
    'Resolution of Erroneous Telecom Billing & Commercial Penalty Refund',
    'Consumer Protection',
    'Arbitrary roaming penalties and unfair service fee deductions disputed via legal demand notice. Telecom provider executed full refund of ₹38,500 and issued unconditional written apology before the consumer commission.',
    'New Delhi',
    'Delhi',
    'standard',
    0,
    'closed',
    'Closed',
    'Active',
    'District Consumer Commission (South Delhi)',
    'Shri Alok Sinha, Presiding Member',
    'CC/DISP/109/2024',
    '2024-11-10',
    null,
    '2024-12-28',
    6000,
    6000,
    2,
    0,
    '2024-11-05T10:00:00Z',
    '2024-12-28T16:00:00Z'
  );

  // 6. Seed Demo Case Participants
  const insertParticipant = db.prepare(`
    INSERT INTO case_participants (
      id, case_id, user_id, role_in_case, permissions, joined_at, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?);
  `);

  insertParticipant.run('cp_1_1', 'case_1', 'u_client_1', 'client', 'read_write', '2025-01-20T14:30:00Z', now);
  insertParticipant.run('cp_1_2', 'case_1', 'u_lawyer_1', 'lead_counsel', 'read_write', '2025-01-20T15:00:00Z', now);
  insertParticipant.run('cp_2_1', 'case_2', 'u_client_1', 'client', 'read_write', '2025-01-15T11:00:00Z', now);
  insertParticipant.run('cp_2_2', 'case_2', 'u_lawyer_1', 'lead_counsel', 'read_write', '2025-01-15T11:30:00Z', now);
  insertParticipant.run('cp_3_1', 'case_3', 'u_client_2', 'client', 'read_write', '2025-01-19T09:45:00Z', now);
  insertParticipant.run('cp_3_2', 'case_3', 'u_lawyer_2', 'lead_counsel', 'read_write', '2025-01-19T10:00:00Z', now);
  insertParticipant.run('cp_5_1', 'case_5', 'u_client_1', 'client', 'read_write', '2024-11-05T10:00:00Z', now);
  insertParticipant.run('cp_5_2', 'case_5', 'u_lawyer_1', 'lead_counsel', 'read_write', '2024-11-05T10:30:00Z', now);

  // 7. Seed Demo Case Documents (Include: case, uploader, file name, file type, storage path/reference, upload timestamp, description)
  const insertDoc = db.prepare(`
    INSERT INTO case_documents (
      id, case_id, uploader_id, title, file_type, file_url, file_name,
      file_size, storage_path, file_size_bytes, uploaded_by, uploader_name,
      category, description, upload_timestamp, is_verified, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?);
  `);

  insertDoc.run(
    'doc_1',
    'case_1',
    'u_client_1',
    'Registered Rent Agreement (2022-2024)',
    'pdf',
    '/assets/sample-rent-agreement.pdf',
    'Registered_Lease_Deed_Saket_Flat.pdf',
    '2.4 MB',
    'vault/case_1/Registered_Lease_Deed_Saket_Flat.pdf',
    2516582,
    'client',
    'Rohan Deshmukh',
    'evidence',
    'Duly executed registered lease agreement showing Rs. 1,40,000 security deposit receipt clause.',
    '2025-01-20T15:00:00Z',
    '2025-01-20T15:00:00Z'
  );

  insertDoc.run(
    'doc_2',
    'case_1',
    'u_client_1',
    'Bank Statement Showing Security Deposit Transfer',
    'pdf',
    '/assets/sample-bank-statement.pdf',
    'HDFC_Statement_SecurityDeposit_Proof.pdf',
    '850 KB',
    'vault/case_1/HDFC_Statement_SecurityDeposit_Proof.pdf',
    870400,
    'client',
    'Rohan Deshmukh',
    'evidence',
    'Certified bank transaction memo highlighting NEFT deposit payment to landlord account.',
    '2025-01-20T15:05:00Z',
    '2025-01-20T15:05:00Z'
  );

  insertDoc.run(
    'doc_3',
    'case_1',
    'u_client_1',
    'Key Handover Video Walkthrough Inspection',
    'video',
    '/assets/sample-inspection.mp4',
    'Key_Handover_Inspection_Proof.mp4',
    '14.2 MB',
    'vault/case_1/Key_Handover_Inspection_Proof.mp4',
    14889779,
    'client',
    'Rohan Deshmukh',
    'evidence',
    'Detailed video evidence of flat premises showing spotless walls, no structural damages.',
    '2025-01-20T15:10:00Z',
    '2025-01-20T15:10:00Z'
  );

  insertDoc.run(
    'doc_4',
    'case_1',
    'u_lawyer_1',
    'Formal Legal Demand Notice Dispatched via Speed Post',
    'pdf',
    '/assets/sample-legal-notice.pdf',
    'Legal_Notice_Recovery_Deposit_SpeedPost.pdf',
    '1.1 MB',
    'vault/case_1/Legal_Notice_Recovery_Deposit_SpeedPost.pdf',
    1153433,
    'lawyer',
    'Adv. Rajeshwar Sharma',
    'notice',
    '15-day formal statutory demand notice served on landlord with postal consignment slip.',
    '2025-01-24T12:00:00Z',
    '2025-01-24T12:00:00Z'
  );

  insertDoc.run(
    'doc_5',
    'case_1',
    'u_lawyer_1',
    'India Post Tracking Receipt & Delivery Confirmation',
    'pdf',
    '/assets/sample-delivery-tracking.pdf',
    'IndiaPost_Tracking_Delivery_Confirmed.pdf',
    '320 KB',
    'vault/case_1/IndiaPost_Tracking_Delivery_Confirmed.pdf',
    327680,
    'lawyer',
    'Adv. Rajeshwar Sharma',
    'notice',
    'Section 27 General Clauses Act proof of service showing successful delivery.',
    '2025-01-27T09:30:00Z',
    '2025-01-27T09:30:00Z'
  );

  // 8. Seed Demo Case Messages (Include: case, sender, message, timestamp, attachment reference where applicable)
  const insertMessage = db.prepare(`
    INSERT INTO case_messages (
      id, case_id, sender_id, sender_role, sender_name, content,
      attachment_reference, attachments_data, timestamp, is_read, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
  `);

  insertMessage.run(
    'msg_1',
    'case_1',
    'u_client_1',
    'client',
    'Rohan Deshmukh',
    'Namaste Advocate Sharma. I have uploaded the registered agreement, bank statement, and move-out inspection video. Please review if anything else is needed.',
    null,
    null,
    '2025-01-20T16:00:00Z',
    1,
    '2025-01-20T16:00:00Z'
  );

  insertMessage.run(
    'msg_2',
    'case_1',
    'u_lawyer_1',
    'lawyer',
    'Adv. Rajeshwar Sharma',
    'Namaste Rohan ji. The video walkthrough is excellent contemporaneous evidence under Section 65B of the Indian Evidence Act. I am preparing the 15-day statutory demand notice today.',
    null,
    null,
    '2025-01-21T10:15:00Z',
    1,
    '2025-01-21T10:15:00Z'
  );

  insertMessage.run(
    'msg_3',
    'case_1',
    'u_lawyer_1',
    'lawyer',
    'Adv. Rajeshwar Sharma',
    'Here is the dispatched Legal Notice copy along with the India Post Consignment tracking number ED910294821IN.',
    'vault/case_1/Legal_Notice_Recovery_Deposit_SpeedPost.pdf',
    JSON.stringify([{ name: 'Legal_Notice_Recovery_Deposit_SpeedPost.pdf', url: '/assets/sample-legal-notice.pdf', type: 'pdf', size: '1.1 MB' }]),
    '2025-01-24T12:05:00Z',
    1,
    '2025-01-24T12:05:00Z'
  );

  insertMessage.run(
    'msg_4',
    'case_1',
    'u_client_1',
    'client',
    'Rohan Deshmukh',
    'Thank you so much Adv. Sharma! The landlord received the notice yesterday and called me asking for an out-of-court settlement discussion. How should I proceed?',
    null,
    null,
    '2025-01-28T14:20:00Z',
    0,
    '2025-01-28T14:20:00Z'
  );

  // 9. Seed Demo Case Updates (Include: case, updated by, previous status, new status, note, timestamp)
  const insertUpdate = db.prepare(`
    INSERT INTO case_updates (
      id, case_id, updated_by_id, author_id, author_name, author_role,
      title, description, note, previous_status, new_status,
      previous_stage, new_stage, stage, implementation_state,
      date, timestamp, order_document_url, hearing_outcome, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
  `);

  insertUpdate.run(
    'upd_1',
    'case_1',
    'u_lawyer_1',
    'l_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    'Legal Demand Notice Issued via Speed Post',
    'Drafted and dispatched comprehensive 15-day statutory demand notice claiming recovery of Rs. 1,40,000 along with 18% p.a. interest.',
    'Dispatched under Registered Speed Post A/D (Tracking: ED910294821IN). 15-day cure period commenced.',
    'open',
    'in_progress',
    'Notice Sent',
    'Notice Sent',
    'Notice Sent',
    'Active',
    '2025-01-24T12:00:00Z',
    '2025-01-24T12:00:00Z',
    '/assets/sample-legal-notice.pdf',
    null,
    '2025-01-24T12:00:00Z'
  );

  insertUpdate.run(
    'upd_2',
    'case_1',
    'u_lawyer_1',
    'l_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    'Notice Delivered to Landlord',
    'Speed post delivery confirmation obtained from India Post portal. Opposite party formally served.',
    'Delivered at resident address of landlord. Notice clock running.',
    'in_progress',
    'in_progress',
    'Notice Sent',
    'Reply Received',
    'Reply Received',
    'Active',
    '2025-01-27T10:00:00Z',
    '2025-01-27T10:00:00Z',
    '/assets/sample-delivery-tracking.pdf',
    null,
    '2025-01-27T10:00:00Z'
  );

  insertUpdate.run(
    'upd_3',
    'case_1',
    'u_lawyer_1',
    'l_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    'Draft Plaint Finalized and Listed for Filing',
    'Plaint for Summary Suit under Order XXXVII of the Code of Civil Procedure (CPC) prepared for filing before Saket District Court.',
    'Listing scheduled for preliminary hearing on 18 April 2025 before Courtroom 302.',
    'in_progress',
    'hearing_scheduled',
    'Reply Received',
    'In Court',
    'In Court',
    'Active',
    '2025-02-14T11:30:00Z',
    '2025-02-14T11:30:00Z',
    null,
    'Summons for appearance to be issued on next hearing.',
    '2025-02-14T11:30:00Z'
  );

  // 10. Seed Demo Payments (Include: client, case, amount, currency, provider, transaction ID, status, timestamps)
  const insertPayment = db.prepare(`
    INSERT INTO payments (
      id, case_id, client_id, lawyer_id, case_number, client_name, lawyer_name,
      service_category, amount, gst_amount, total_amount, currency, provider,
      transaction_id, payment_method, status, payment_date, invoice_id, refund_status,
      timestamps_created, timestamps_completed, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  insertPayment.run(
    'pay_1',
    'case_1',
    'cl_1',
    'l_1',
    'LS-2025-4491',
    'Rohan Deshmukh',
    'Adv. Rajeshwar Sharma',
    'Case Evaluation & Legal Notice Drafting Retainer',
    5084.75,
    915.25,
    6000,
    'INR',
    'Razorpay',
    'pay_RZP_991823419',
    'UPI (Google Pay)',
    'completed',
    '2025-01-20T14:45:00Z',
    'inv_1',
    'none',
    '2025-01-20T14:40:00Z',
    '2025-01-20T14:45:00Z',
    '2025-01-20T14:45:00Z',
    '2025-01-20T14:45:00Z'
  );

  insertPayment.run(
    'pay_2',
    'case_2',
    'cl_1',
    'l_1',
    'LS-2025-3810',
    'Rohan Deshmukh',
    'Adv. Rajeshwar Sharma',
    'Consumer Commission Filing & Representation Retainer',
    6779.66,
    1220.34,
    8000,
    'INR',
    'Razorpay',
    'pay_RZP_881204918',
    'Net Banking (HDFC Bank)',
    'completed',
    '2025-01-15T11:15:00Z',
    'inv_2',
    'none',
    '2025-01-15T11:10:00Z',
    '2025-01-15T11:15:00Z',
    '2025-01-15T11:15:00Z',
    '2025-01-15T11:15:00Z'
  );

  insertPayment.run(
    'pay_3',
    'case_3',
    'cl_2',
    'l_2',
    'LS-2025-1049',
    'Pooja Narang',
    'Adv. Ananya Sengupta',
    'Section 138 NI Act Pre-Filing Notice & Magistrate Court Appearance Retainer',
    10169.49,
    1830.51,
    12000,
    'INR',
    'Razorpay',
    'pay_RZP_771920381',
    'Credit Card (ICICI Bank)',
    'completed',
    '2025-01-19T10:00:00Z',
    'inv_3',
    'none',
    '2025-01-19T09:55:00Z',
    '2025-01-19T10:00:00Z',
    '2025-01-19T10:00:00Z',
    '2025-01-19T10:00:00Z'
  );

  // 11. Seed Demo Invoices
  const insertInvoice = db.prepare(`
    INSERT INTO invoices (
      id, invoice_number, payment_id, case_id, case_number, client_id, lawyer_id,
      client_name, client_email, lawyer_name, service_description, amount,
      gst_rate, gst_amount, total, issue_date, due_date, paid_date, status,
      is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
  `);

  insertInvoice.run(
    'inv_1',
    'INV-LS-2025-00142',
    'pay_1',
    'case_1',
    'LS-2025-4491',
    'cl_1',
    'l_1',
    'Rohan Deshmukh',
    'rohan.deshmukh@gmail.com',
    'Adv. Rajeshwar Sharma',
    'Legal Notice Drafting & Registered Dispatch - Tenancy Security Recovery',
    5084.75,
    18,
    915.25,
    6000,
    '2025-01-20',
    '2025-01-20',
    '2025-01-20',
    'paid',
    '2025-01-20T14:45:00Z'
  );

  insertInvoice.run(
    'inv_2',
    'INV-LS-2025-00109',
    'pay_2',
    'case_2',
    'LS-2025-3810',
    'cl_1',
    'l_1',
    'Rohan Deshmukh',
    'rohan.deshmukh@gmail.com',
    'Adv. Rajeshwar Sharma',
    'Consumer Disputes Redressal Commission South Delhi Filing Fee & Retainer',
    6779.66,
    18,
    1220.34,
    8000,
    '2025-01-15',
    '2025-01-15',
    '2025-01-15',
    'paid',
    '2025-01-15T11:15:00Z'
  );

  insertInvoice.run(
    'inv_3',
    'INV-LS-2025-00128',
    'pay_3',
    'case_3',
    'LS-2025-1049',
    'cl_2',
    'l_2',
    'Pooja Narang',
    'pooja.narang@outlook.com',
    'Adv. Ananya Sengupta',
    'Metropolitan Magistrate Court NI Act Case Filing & Summons Application',
    10169.49,
    18,
    1830.51,
    12000,
    '2025-01-19',
    '2025-01-19',
    '2025-01-19',
    'paid',
    '2025-01-19T10:00:00Z'
  );

  // 12. Seed Demo Appointments
  const insertAppointment = db.prepare(`
    INSERT INTO appointments (
      id, client_id, lawyer_id, case_id, client_name, lawyer_name, case_title,
      date, time_slot, type, mode, status, notes, fee, meeting_link,
      is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  insertAppointment.run(
    'app_1',
    'cl_1',
    'l_1',
    'case_1',
    'Rohan Deshmukh',
    'Adv. Rajeshwar Sharma',
    'Recovery of Withheld Rental Security Deposit',
    '2025-04-12',
    '04:30 PM - 05:00 PM',
    'video',
    'Video Call',
    'scheduled',
    'Pre-hearing consultation to finalize list of original documents for production before Saket District Court.',
    1500,
    'https://meet.google.com/law-shin-case1',
    now,
    now
  );

  insertAppointment.run(
    'app_2',
    'cl_2',
    'l_2',
    'case_3',
    'Pooja Narang',
    'Adv. Ananya Sengupta',
    'Dishonour of Cheque under Section 138 NI Act',
    '2025-04-01',
    '02:00 PM - 02:30 PM',
    'video',
    'Video Call',
    'scheduled',
    'Verification of bank return memo and preparation of complainant affidavit testimony.',
    2000,
    'https://meet.google.com/law-shin-case3',
    now,
    now
  );

  // 13. Seed Demo Reviews (Include: client, lawyer, case, rating, written review, timestamp, moderation status)
  const insertReview = db.prepare(`
    INSERT INTO reviews (
      id, lawyer_id, client_id, case_id, client_name, rating, comment,
      written_review, case_category, moderation_status, is_verified_client,
      timestamp, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
  `);

  insertReview.run(
    'rev_1',
    'l_1',
    'cl_1',
    'case_1',
    'Rohan Deshmukh',
    5,
    'Adv. Rajeshwar Sharma drafted our tenant notice with great precision. The landlord who had refused to pick up calls for 3 months called back within 2 days of receiving the legal notice.',
    'Adv. Rajeshwar Sharma drafted our tenant notice with great precision. The landlord who had refused to pick up calls for 3 months called back within 2 days of receiving the legal notice.',
    'Tenancy & Property Disputes',
    'approved',
    1,
    '2025-01-29T18:30:00Z',
    '2025-01-29T18:30:00Z'
  );

  insertReview.run(
    'rev_2',
    'l_2',
    'cl_2',
    'case_3',
    'Pooja Narang',
    5,
    'Adv. Ananya Sengupta is exceptionally sharp with commercial recovery and NI Act procedures. She guided us through the statutory 30-day notice window with zero delays.',
    'Adv. Ananya Sengupta is exceptionally sharp with commercial recovery and NI Act procedures. She guided us through the statutory 30-day notice window with zero delays.',
    'Cheque Bounce (Sec 138 NI Act)',
    'approved',
    1,
    '2025-01-25T11:15:00Z',
    '2025-01-25T11:15:00Z'
  );

  // 14. Seed Demo Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (
      id, user_id, type, title, content, entity_type, entity_id, is_read, is_demo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
  `);

  insertNotification.run('notif_1', 'u_client_1', 'case_update', 'Legal Notice Dispatched', 'Your advocate has dispatched the formal statutory notice via Registered Speed Post.', 'case', 'case_1', 1, '2025-01-24T12:00:00Z');
  insertNotification.run('notif_2', 'u_client_1', 'new_message', 'New Message from Advocate', 'Adv. Rajeshwar Sharma sent you a message regarding postal tracking.', 'case', 'case_1', 0, '2025-01-24T12:05:00Z');
  insertNotification.run('notif_3', 'u_lawyer_1', 'case_update', 'New Client Message', 'Rohan Deshmukh replied regarding landlord settlement discussion.', 'case', 'case_1', 0, '2025-01-28T14:20:00Z');
  insertNotification.run('notif_4', 'u_client_1', 'case_update', 'Case Closed - Review Eligible', 'Your matter "Resolution of Erroneous Telecom Billing & Commercial Penalty Refund" has been formally closed. You may now submit your review and rating.', 'case', 'case_5', 0, '2025-02-15T11:00:00Z');

  // 15. Seed Demo Legal Queries
  const insertQuery = db.prepare(`
    INSERT INTO legal_queries (
      id, client_id, title, category, description, is_anonymous, author_name,
      city, state, replies_data, views, status, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  const repliesQuery1 = [
    {
      id: 'qr_1',
      lawyerId: 'l_1',
      lawyerName: 'Adv. Rajeshwar Sharma',
      barNumber: 'D/1428/2009',
      content: 'Under standard rent laws and Indian contract law, a landlord cannot unilaterally withhold deposits for normal wear and tear. You are entitled to issue a formal 15-day demand notice demanding prompt refund with 18% interest.',
      createdAt: '2025-01-21T14:30:00Z'
    }
  ];

  insertQuery.run(
    'q_1',
    'cl_1',
    'Can a landlord withhold my security deposit for repainting and normal wear & tear?',
    'Tenancy Law',
    'I stayed in a rented 2BHK flat in Noida for 2 years. At the time of moving out, the landlord refused to return my Rs. 65,000 security deposit claiming that the flat requires fresh paint. The agreement clearly states only actual damages caused by tenant are deductible.',
    0,
    'Rohan D.',
    'Noida',
    'Uttar Pradesh',
    JSON.stringify(repliesQuery1),
    148,
    'answered',
    '2025-01-21T12:00:00Z',
    '2025-01-21T14:30:00Z'
  );

  insertQuery.run(
    'q_2',
    null,
    'What is the statutory limitation period for filing a cheque bounce case under Sec 138 NI Act?',
    'Cheque Bounce',
    'A client issued a cheque for Rs. 3 Lakhs which got dishonoured on 10th January with memo "Exceeds Arrangement". How many days do I have to send legal notice and when can I file complaint in court?',
    1,
    'Anonymous Citizen',
    'Mumbai',
    'Maharashtra',
    JSON.stringify([]),
    94,
    'open',
    '2025-02-05T10:00:00Z',
    '2025-02-05T10:00:00Z'
  );

  // 16. Seed Demo Public Content / Verified Judgments
  const insertContent = db.prepare(`
    INSERT INTO public_content (
      id, slug, type, title, category, content_markdown, author,
      citation, court, bench, decision_date, legal_sections,
      ratio_decidendi, source_url, source_name, tags, is_published,
      views_count, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?);
  `);

  insertContent.run(
    'jdg_1',
    'satender-kumar-antil-v-cbi',
    'judgment_summary',
    'Satender Kumar Antil v. Central Bureau of Investigation & Anr.',
    'Criminal Procedure & Bail Jurisprudence',
    'Guidelines regarding arrest and bail under CrPC.',
    'Supreme Court of India',
    '(2022) 10 SCC 51',
    'Supreme Court of India',
    'Sanjay Kishan Kaul, M.M. Sundresh, JJ.',
    '2022-07-11',
    JSON.stringify(['Code of Criminal Procedure - Section 41, 41A, 88, 170, 204, 209', 'Constitution of India - Article 21']),
    'Strict adherence to Section 41 and 41A CrPC is mandatory; non-compliance entitles the accused to bail. Investigating agencies must not make mechanical arrests.',
    'https://indiankanoon.org/doc/116900223/',
    'Supreme Court of India Reports',
    JSON.stringify(['Bail', 'Arrest Guidelines', 'CrPC', 'Fundamental Rights']),
    284,
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
  );

  insertContent.run(
    'jdg_2',
    'arjun-panditrao-khotkar-v-kailash-kushanrao-gorantyal',
    'judgment_summary',
    'Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal & Ors.',
    'Law of Evidence & Electronic Records',
    'Mandatory certification under Section 65B(4) for electronic records.',
    'Supreme Court of India',
    '(2020) 7 SCC 1',
    'Supreme Court of India',
    'R.F. Nariman, S. Ravindra Bhat, V. Ramasubramanian, JJ.',
    '2020-07-14',
    JSON.stringify(['Indian Evidence Act - Section 65B(1), 65B(4)', 'Information Technology Act, 2000']),
    'A certificate under Section 65B(4) is a condition precedent to the admissibility of evidence by way of electronic record in secondary form.',
    'https://indiankanoon.org/doc/84518779/',
    'Supreme Court of India Reports',
    JSON.stringify(['Evidence', 'Electronic Records', 'Section 65B']),
    312,
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
  );

  insertContent.run(
    'jdg_3',
    'canara-bank-v-canara-sales-corporation',
    'judgment_summary',
    'Canara Bank v. Canara Sales Corporation & Ors.',
    'Banking Law & Negotiable Instruments',
    'Banker-customer relationship and forged cheques.',
    'Supreme Court of India',
    '(1987) 2 SCC 666',
    'Supreme Court of India',
    'O. Chinnappa Reddy, K. Jagannatha Shetty, JJ.',
    '1987-04-22',
    JSON.stringify(['Negotiable Instruments Act - Section 31, 85', 'Indian Contract Act - Section 73']),
    'When a bank makes payment on a forged cheque, it pays without authority of customer and cannot debit customer account.',
    'https://indiankanoon.org/doc/1715421/',
    'Supreme Court of India Reports',
    JSON.stringify(['Banking', 'Negotiable Instruments', 'Cheque Forgery']),
    189,
    '2024-01-01T00:00:00Z',
    '2024-01-01T00:00:00Z'
  );

  console.log('[Counselia Database] Initial baseline DEMO DATA seeded successfully into SQLite with is_demo = 1.');
}

/**
 * Seed initial baseline deadlines for demo cases.
 * Calibrated so all 4 statuses (🟢 Safe, 🟡 Approaching, 🔴 Urgent, ⚫ Expired)
 * are immediately visible and testable!
 */
export function seedInitialDeadlines(db: DatabaseSync): void {
  const insertDeadline = db.prepare(`
    INSERT INTO case_deadlines (
      id, case_id, title, deadline_type, start_date, deadline_date,
      description, calculation_source, entered_by_id, entered_by_name,
      entered_by_role, verified_rule_reference, remedy_action_required,
      governing_forum, is_completed, completed_at, notes, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `);

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Compute clean YYYY-MM-DD strings relative to today
  const toYMD = (timestamp: number) => new Date(timestamp).toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  // 1. 🔴 URGENT (2 days remaining) - Case 1: Written Statement filing under CPC Order VIII Rule 1
  insertDeadline.run(
    'dl_urgent_ws_1',
    'case_1',
    'Written Statement / Reply Filing under CPC Order VIII Rule 1',
    'Written Statement / Reply Filing',
    toYMD(nowMs - 28 * dayMs),
    toYMD(nowMs + 2 * dayMs), // 2 days away => Urgent 🔴
    'Mandatory 30-day statutory window from service of court summons to present written statement of defense.',
    'verified_rule_engine',
    'u_lawyer_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    JSON.stringify({
      ruleId: 'cpc_order_viii_rule_1',
      actTitle: 'Code of Civil Procedure, 1908 (CPC)',
      sectionOrArticle: 'Order VIII, Rule 1 (Written Statement by Defendant)',
      citation: 'The Code of Civil Procedure, 1908 (Act No. 5 of 1908), First Schedule, Order VIII, Rule 1'
    }),
    'Finalize and submit formal Written Statement with supporting affidavit of admission/denial before Saket District Court.',
    'Saket District Court (Courtroom 302)',
    0,
    null,
    'Client provided WhatsApp chats and move-out handover receipt. Draft reply prepared.',
    nowIso,
    nowIso
  );

  // 2. 🟡 APPROACHING (9 days remaining) - Case 1: Evidence / Rejoinder by Way of Affidavit
  insertDeadline.run(
    'dl_appr_evid_1',
    'case_1',
    'Evidence & Rejoinder by Way of Affidavit',
    'Evidence / Rejoinder Submission',
    toYMD(nowMs - 12 * dayMs),
    toYMD(nowMs + 9 * dayMs), // 9 days away => Approaching 🟡
    'Submit counter-evidence regarding landlord deduction claims for flat painting.',
    'manual_lawyer_entry',
    'u_lawyer_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    null,
    'Compile certified bank ledger statement showing deposit transfer and tenant move-out inspection video.',
    'Saket District Court (Courtroom 302)',
    0,
    null,
    'Bank account statement stamped by SBI branch received.',
    nowIso,
    nowIso
  );

  // 3. 🟢 SAFE (540 days remaining) - Case 1: Limitation Act Art 113 Residuary Limitation
  insertDeadline.run(
    'dl_safe_lim_1',
    'case_1',
    'Recovery of Debt / Movable Property Statutory Limitation (Art. 113)',
    'Statutory Limitation Period',
    toYMD(nowMs - 120 * dayMs),
    toYMD(nowMs + 540 * dayMs), // ~1.5 years away => Safe 🟢
    '3-year statutory limitation period under Limitation Act 1963 for suit for recovery of withheld security deposit.',
    'verified_rule_engine',
    'u_lawyer_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    JSON.stringify({
      ruleId: 'limitation_act_art_113',
      actTitle: 'The Limitation Act, 1963',
      sectionOrArticle: 'Article 113 (Residuary Limitation for Suits)',
      citation: 'The Limitation Act, 1963 (Act No. 36 of 1963), Schedule, Part X, Article 113'
    }),
    'Preserve formal postal tracking slip and landlord notice refusal memo to establish limitation continuity.',
    'Civil Courts, New Delhi',
    0,
    null,
    'Speed post acknowledgment card archived in case document registry.',
    nowIso,
    nowIso
  );

  // 4. ⚫ EXPIRED (Expired 18 days ago) - Case 1: 15-Day Statutory Cure Notice Response
  insertDeadline.run(
    'dl_exp_notice_1',
    'case_1',
    'Statutory 15-Day Legal Notice Cure Window for Landlord',
    'Legal Notice Response',
    toYMD(nowMs - 33 * dayMs),
    toYMD(nowMs - 18 * dayMs), // 18 days ago => Expired ⚫
    'Statutory cure window provided in demand notice demanding refund of Rs. 65,000 security deposit with 18% interest.',
    'manual_lawyer_entry',
    'u_lawyer_1',
    'Adv. Rajeshwar Sharma',
    'lawyer',
    null,
    'Notice period elapsed without restitution; advocate authorized to institute formal recovery plaint and seek costs.',
    'Pre-Litigation Statutory Stage',
    1,
    toYMD(nowMs - 18 * dayMs),
    'Notice period expired without compliance. Proceeded with filing of civil recovery suit.',
    nowIso,
    nowIso
  );

  // 5. 🔴 URGENT (2 days remaining) - Case 3: Cheque Bounce Sec 142(1)(b) NI Act Complaint
  insertDeadline.run(
    'dl_urgent_ni_3',
    'case_3',
    'Criminal Complaint Filing Deadline (Sec 142(1)(b) NI Act)',
    'Statutory Limitation Period',
    toYMD(nowMs - 28 * dayMs),
    toYMD(nowMs + 2 * dayMs), // 2 days away => Urgent 🔴
    'Mandatory 30-day statutory limitation period to file Section 138 criminal complaint upon expiration of 15-day notice period.',
    'verified_rule_engine',
    'u_lawyer_2',
    'Adv. Ananya Sengupta',
    'lawyer',
    JSON.stringify({
      ruleId: 'ni_act_sec_142_complaint',
      actTitle: 'The Negotiable Instruments Act, 1881',
      sectionOrArticle: 'Section 142(1)(b) (Filing of Criminal Complaint within 30 days)',
      citation: 'The Negotiable Instruments Act, 1881, Section 142(1)(b)'
    }),
    'Lodge formal Section 138 complaint before Metropolitan Magistrate Court with original dishonoured cheque and return memo.',
    'Metropolitan Magistrate Court, Esplanade, Mumbai',
    0,
    null,
    'Original cheque deposit slip, return memo, and postal tracking report annexed.',
    nowIso,
    nowIso
  );

  console.log('[Counselia Database] Initial case deadlines seeded successfully with 🟢 Safe, 🟡 Approaching, 🔴 Urgent, and ⚫ Expired statuses.');
}

/**
 * DATABASE-LEVEL SECURITY & ACCESS RULES
 */

/**
 * Verify whether a user is authorized to access a case room.
 * Admins have elevated platform compliance access.
 * Clients can only access cases they own or are participants in.
 * Lawyers can only access assigned cases, participant cases, or open submissions available for intake.
 */
export function checkCaseAccess(userId: string, userRole: string, caseId: string): boolean {
  if (userRole === 'admin') return true;

  const db = getSqliteDb();
  const caseRow = db.prepare('SELECT id, client_id, assigned_lawyer_id, implementation_state FROM cases WHERE id = ?').get(caseId) as any;
  if (!caseRow) return false;

  if (userRole === 'client') {
    const clientRow = db.prepare('SELECT id FROM clients WHERE user_id = ?').get(userId) as any;
    if (clientRow && clientRow.id === caseRow.client_id) return true;

    // Check participant table
    const participant = db.prepare('SELECT id FROM case_participants WHERE case_id = ? AND user_id = ?').get(caseId, userId);
    return !!participant;
  }

  if (userRole === 'lawyer') {
    const lawyerRow = db.prepare('SELECT id FROM lawyers WHERE user_id = ?').get(userId) as any;
    if (lawyerRow && lawyerRow.id === caseRow.assigned_lawyer_id) return true;

    // Check participant table
    const participant = db.prepare('SELECT id FROM case_participants WHERE case_id = ? AND user_id = ?').get(caseId, userId);
    if (participant) return true;

    // Open inquiry available for intake
    if (caseRow.implementation_state === 'Submitted' && !caseRow.assigned_lawyer_id) return true;
    return false;
  }

  return false;
}

/**
 * Verify whether a user is authorized to access a case document.
 * Documents belong to a case and inherit case room confidentiality.
 */
export function checkDocumentAccess(userId: string, userRole: string, documentId: string): boolean {
  if (userRole === 'admin') return true;
  const db = getSqliteDb();
  const doc = db.prepare('SELECT case_id, uploader_id FROM case_documents WHERE id = ?').get(documentId) as any;
  if (!doc) return false;
  if (doc.uploader_id === userId) return true;
  return checkCaseAccess(userId, userRole, doc.case_id);
}

/**
 * Verify whether a user is authorized to access a case message.
 */
export function checkMessageAccess(userId: string, userRole: string, messageId: string): boolean {
  if (userRole === 'admin') return true;
  const db = getSqliteDb();
  const msg = db.prepare('SELECT case_id, sender_id FROM case_messages WHERE id = ?').get(messageId) as any;
  if (!msg) return false;
  if (msg.sender_id === userId) return true;
  return checkCaseAccess(userId, userRole, msg.case_id);
}

/**
 * Verify whether a user is authorized to access a case deadline.
 */
export function checkDeadlineAccess(userId: string, userRole: string, deadlineId: string): boolean {
  if (userRole === 'admin') return true;
  const db = getSqliteDb();
  const deadline = db.prepare('SELECT case_id, entered_by_id FROM case_deadlines WHERE id = ?').get(deadlineId) as any;
  if (!deadline) return false;
  if (deadline.entered_by_id === userId) return true;
  return checkCaseAccess(userId, userRole, deadline.case_id);
}
