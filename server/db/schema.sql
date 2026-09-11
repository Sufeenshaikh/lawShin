-- Counselia Persistent Database Schema (SQLite)
-- High-Performance Relational Schema with Foreign Keys, Constraints & Indexes

PRAGMA foreign_keys = ON;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('client', 'lawyer', 'admin')),
  password TEXT NOT NULL,
  is_email_verified INTEGER DEFAULT 0,
  is_phone_verified INTEGER DEFAULT 0,
  avatar_url TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  email_verification_token TEXT,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);

-- 2. CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  address TEXT,
  is_phone_verified INTEGER DEFAULT 0,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_demo ON clients(is_demo);

-- 3. LAW FIRMS
CREATE TABLE IF NOT EXISTS law_firms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  registration_number TEXT UNIQUE,
  founded_year INTEGER,
  headquarters TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  practice_areas TEXT,
  attorney_count INTEGER DEFAULT 1,
  rating REAL DEFAULT 5.0,
  description TEXT,
  logo_url TEXT,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_law_firms_is_demo ON law_firms(is_demo);

-- 4. LAWYERS
CREATE TABLE IF NOT EXISTS lawyers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  law_firm_id TEXT REFERENCES law_firms(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  bar_council_number TEXT NOT NULL UNIQUE,
  state_bar_council TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 1,
  practice_areas TEXT NOT NULL,
  courts TEXT NOT NULL,
  bio TEXT,
  education TEXT,
  consultation_fee REAL NOT NULL DEFAULT 1500,
  rating REAL DEFAULT 5.0,
  review_count INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT,
  languages TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  avatar_url TEXT,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lawyers_user_id ON lawyers(user_id);
CREATE INDEX IF NOT EXISTS idx_lawyers_bar_number ON lawyers(bar_council_number);
CREATE INDEX IF NOT EXISTS idx_lawyers_status ON lawyers(verification_status);
CREATE INDEX IF NOT EXISTS idx_lawyers_city ON lawyers(city);
CREATE INDEX IF NOT EXISTS idx_lawyers_is_demo ON lawyers(is_demo);

-- 5. CASES
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  case_number TEXT UNIQUE NOT NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  assigned_lawyer_id TEXT REFERENCES lawyers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'standard' CHECK(urgency IN ('urgent', 'high', 'standard', 'low')),
  is_urgent INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'assigned', 'in_progress', 'hearing_scheduled', 'resolved', 'closed')),
  stage TEXT NOT NULL DEFAULT 'Notice Sent' CHECK(stage IN ('Notice Sent', 'Reply Received', 'In Court', 'Closed')),
  implementation_state TEXT NOT NULL DEFAULT 'Submitted',
  court_name TEXT,
  judge_name TEXT,
  filing_number TEXT,
  filing_date TEXT,
  next_hearing_date TEXT,
  closure_date TEXT,
  total_fee REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  documents_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_lawyer_id ON cases(assigned_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON cases(stage);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_is_demo ON cases(is_demo);

-- 6. CASE PARTICIPANTS
CREATE TABLE IF NOT EXISTS case_participants (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_case TEXT NOT NULL CHECK(role_in_case IN ('client', 'lead_counsel', 'co_counsel', 'legal_assistant', 'court_clerk', 'observer')),
  permissions TEXT NOT NULL DEFAULT 'read_write' CHECK(permissions IN ('read_write', 'read_only', 'billing_only')),
  joined_at TEXT NOT NULL,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_case_participants_case_id ON case_participants(case_id);
CREATE INDEX IF NOT EXISTS idx_case_participants_user_id ON case_participants(user_id);

-- 7. CASE DOCUMENTS
CREATE TABLE IF NOT EXISTS case_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploader_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT NOT NULL,
  storage_path TEXT,
  file_size_bytes INTEGER DEFAULT 0,
  uploaded_by TEXT NOT NULL,
  uploader_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'evidence',
  description TEXT,
  upload_timestamp TEXT NOT NULL,
  is_verified INTEGER DEFAULT 1,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_uploader_id ON case_documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_is_demo ON case_documents(is_demo);

-- 8. CASE MESSAGES
CREATE TABLE IF NOT EXISTS case_messages (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment_reference TEXT,
  attachments_data TEXT,
  timestamp TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON case_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_sender_id ON case_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_is_demo ON case_messages(is_demo);

-- 9. CASE UPDATES
CREATE TABLE IF NOT EXISTS case_updates (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  updated_by_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  note TEXT,
  previous_status TEXT,
  new_status TEXT,
  previous_stage TEXT,
  new_stage TEXT,
  stage TEXT,
  implementation_state TEXT,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  order_document_url TEXT,
  hearing_outcome TEXT,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_updates_case_id ON case_updates(case_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_author_id ON case_updates(author_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_is_demo ON case_updates(is_demo);

-- 10. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  lawyer_id TEXT REFERENCES lawyers(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_case_id ON payments(case_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_is_demo ON payments(is_demo);

-- 11. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  case_number TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE RESTRICT,
  lawyer_id TEXT REFERENCES lawyers(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  lawyer_name TEXT,
  service_description TEXT NOT NULL,
  amount REAL NOT NULL,
  gst_rate REAL DEFAULT 18,
  gst_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT,
  paid_date TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK(status IN ('paid', 'unpaid', 'cancelled')),
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_case_id ON invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_is_demo ON invoices(is_demo);

-- 12. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  lawyer_id TEXT NOT NULL REFERENCES lawyers(id) ON DELETE RESTRICT,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  lawyer_name TEXT NOT NULL,
  case_title TEXT,
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Advocate Chamber',
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

CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lawyer_id ON appointments(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_case_id ON appointments(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_is_demo ON appointments(is_demo);

-- 13. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  lawyer_id TEXT NOT NULL REFERENCES lawyers(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  case_id TEXT UNIQUE REFERENCES cases(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  written_review TEXT NOT NULL,
  case_category TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('approved', 'pending', 'flagged', 'rejected')),
  moderation_notes TEXT,
  is_verified_client INTEGER DEFAULT 1,
  timestamp TEXT NOT NULL,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_lawyer_id ON reviews(lawyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_case_id ON reviews(case_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_is_demo ON reviews(is_demo);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('case_update', 'new_message', 'appointment', 'payment', 'verification', 'system')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_read INTEGER DEFAULT 0,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_demo ON notifications(is_demo);

-- 15. LEGAL QUERIES
CREATE TABLE IF NOT EXISTS legal_queries (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  is_anonymous INTEGER DEFAULT 0,
  author_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  replies_data TEXT,
  views INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'answered', 'in_review', 'closed')),
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_queries_category ON legal_queries(category);
CREATE INDEX IF NOT EXISTS idx_queries_status ON legal_queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_client_id ON legal_queries(client_id);
CREATE INDEX IF NOT EXISTS idx_queries_is_demo ON legal_queries(is_demo);

-- 16. PUBLIC CONTENT
CREATE TABLE IF NOT EXISTS public_content (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('legal_guide', 'bare_act_reference', 'faq', 'judgment_summary', 'court_procedure')),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  author TEXT NOT NULL,
  citation TEXT,
  court TEXT,
  bench TEXT,
  decision_date TEXT,
  legal_sections TEXT,
  ratio_decidendi TEXT,
  source_url TEXT,
  source_name TEXT,
  tags TEXT,
  is_published INTEGER DEFAULT 1,
  views_count INTEGER DEFAULT 0,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_public_content_slug ON public_content(slug);
CREATE INDEX IF NOT EXISTS idx_public_content_type ON public_content(type);
CREATE INDEX IF NOT EXISTS idx_public_content_category ON public_content(category);
CREATE INDEX IF NOT EXISTS idx_public_content_is_demo ON public_content(is_demo);

-- 17. CASE DEADLINES (RIGHT-TO-REMEDY / DEADLINE TRACKER)
CREATE TABLE IF NOT EXISTS case_deadlines (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  deadline_date TEXT NOT NULL,
  description TEXT,
  calculation_source TEXT NOT NULL CHECK(calculation_source IN ('manual_lawyer_entry', 'verified_rule_engine')),
  entered_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entered_by_name TEXT NOT NULL,
  entered_by_role TEXT NOT NULL CHECK(entered_by_role IN ('lawyer', 'admin')),
  verified_rule_reference TEXT,
  remedy_action_required TEXT,
  governing_forum TEXT,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  notes TEXT,
  is_demo INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_deadlines_case_id ON case_deadlines(case_id);
CREATE INDEX IF NOT EXISTS idx_case_deadlines_deadline_date ON case_deadlines(deadline_date);
CREATE INDEX IF NOT EXISTS idx_case_deadlines_is_completed ON case_deadlines(is_completed);
CREATE INDEX IF NOT EXISTS idx_case_deadlines_is_demo ON case_deadlines(is_demo);
