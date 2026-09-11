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
  LegalDeadline,
  AdvocateDraft,
  AdvocateSavedAuthority,
  AdvocateAuditLog
} from '../src/types.js';
import {
  getSqliteDb,
  checkCaseAccess as checkCaseAccessRaw,
  checkDocumentAccess as checkDocumentAccessRaw,
  checkMessageAccess as checkMessageAccessRaw,
  checkDeadlineAccess as checkDeadlineAccessRaw
} from './db/sqlite.js';

export interface DatabaseState {
  users: User[];
  clients: ClientProfile[];
  lawyers: LawyerProfile[];
  lawFirms: LawFirm[];
  cases: LegalCase[];
  documents: CaseDocument[];
  messages: CaseMessage[];
  updates: CaseUpdate[];
  caseParticipants: CaseParticipant[];
  payments: Payment[];
  invoices: Invoice[];
  appointments: Appointment[];
  reviews: Review[];
  notifications: Notification[];
  queries: LegalQuery[];
  judgments: VerifiedJudgment[];
  publicContent: PublicContent[];
  deadlines: LegalDeadline[];
  drafts: AdvocateDraft[];
  savedAuthorities: AdvocateSavedAuthority[];
  advocateAuditLogs: AdvocateAuditLog[];
}

// Prepared statements cache for SQLite persistence
let upsertStatements: Record<string, any> | null = null;

function getUpsertStatements() {
  if (upsertStatements) return upsertStatements;
  const db = getSqliteDb();

  upsertStatements = {
    user: db.prepare(`
      INSERT INTO users (
        id, name, email, phone, role, password,
        is_email_verified, is_phone_verified, avatar_url,
        password_reset_token, password_reset_expires, email_verification_token,
        is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        role = excluded.role,
        password = excluded.password,
        is_email_verified = excluded.is_email_verified,
        is_phone_verified = excluded.is_phone_verified,
        avatar_url = excluded.avatar_url,
        password_reset_token = excluded.password_reset_token,
        password_reset_expires = excluded.password_reset_expires,
        email_verification_token = excluded.email_verification_token,
        is_demo = excluded.is_demo,
        updated_at = excluded.updated_at;
    `),

    client: db.prepare(`
      INSERT INTO clients (
        id, user_id, full_name, email, phone, city, state, address,
        is_phone_verified, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        email = excluded.email,
        phone = excluded.phone,
        city = excluded.city,
        state = excluded.state,
        address = excluded.address,
        is_phone_verified = excluded.is_phone_verified,
        is_demo = excluded.is_demo,
        updated_at = excluded.updated_at;
    `),

    lawyer: db.prepare(`
      INSERT INTO lawyers (
        id, user_id, law_firm_id, full_name, email, phone,
        bar_council_number, state_bar_council, experience_years,
        practice_areas, courts, bio, education, consultation_fee,
        rating, review_count, is_verified, verification_status,
        verification_notes, languages, city, state, avatar_url,
        is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        law_firm_id = excluded.law_firm_id,
        full_name = excluded.full_name,
        email = excluded.email,
        phone = excluded.phone,
        bar_council_number = excluded.bar_council_number,
        state_bar_council = excluded.state_bar_council,
        experience_years = excluded.experience_years,
        practice_areas = excluded.practice_areas,
        courts = excluded.courts,
        bio = excluded.bio,
        education = excluded.education,
        consultation_fee = excluded.consultation_fee,
        rating = excluded.rating,
        review_count = excluded.review_count,
        is_verified = excluded.is_verified,
        verification_status = excluded.verification_status,
        verification_notes = excluded.verification_notes,
        languages = excluded.languages,
        city = excluded.city,
        state = excluded.state,
        avatar_url = excluded.avatar_url,
        is_demo = excluded.is_demo,
        updated_at = excluded.updated_at;
    `),

    lawFirm: db.prepare(`
      INSERT INTO law_firms (
        id, name, registration_number, founded_year, headquarters, city, state,
        address, contact_email, contact_phone, website, practice_areas,
        attorney_count, rating, description, logo_url, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        registration_number = excluded.registration_number,
        founded_year = excluded.founded_year,
        headquarters = excluded.headquarters,
        city = excluded.city,
        state = excluded.state,
        address = excluded.address,
        contact_email = excluded.contact_email,
        contact_phone = excluded.contact_phone,
        website = excluded.website,
        practice_areas = excluded.practice_areas,
        attorney_count = excluded.attorney_count,
        rating = excluded.rating,
        description = excluded.description,
        logo_url = excluded.logo_url,
        is_demo = excluded.is_demo,
        updated_at = excluded.updated_at;
    `),

    case: db.prepare(`
      INSERT INTO cases (
        id, case_number, client_id, assigned_lawyer_id, title, category, description,
        location_city, location_state, urgency, is_urgent, status, stage,
        implementation_state, court_name, judge_name, filing_number,
        filing_date, next_hearing_date, closure_date, total_fee, paid_amount,
        documents_count, unread_count, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        case_number = excluded.case_number,
        client_id = excluded.client_id,
        assigned_lawyer_id = excluded.assigned_lawyer_id,
        title = excluded.title,
        category = excluded.category,
        description = excluded.description,
        location_city = excluded.location_city,
        location_state = excluded.location_state,
        urgency = excluded.urgency,
        is_urgent = excluded.is_urgent,
        status = excluded.status,
        stage = excluded.stage,
        implementation_state = excluded.implementation_state,
        court_name = excluded.court_name,
        judge_name = excluded.judge_name,
        filing_number = excluded.filing_number,
        filing_date = excluded.filing_date,
        next_hearing_date = excluded.next_hearing_date,
        closure_date = excluded.closure_date,
        total_fee = excluded.total_fee,
        paid_amount = excluded.paid_amount,
        documents_count = excluded.documents_count,
        unread_count = excluded.unread_count,
        is_demo = excluded.is_demo,
        updated_at = excluded.updated_at;
    `),

    document: db.prepare(`
      INSERT INTO case_documents (
        id, case_id, uploader_id, title, file_type, file_url, file_name,
        file_size, storage_path, file_size_bytes, uploaded_by, uploader_name,
        category, description, upload_timestamp, is_verified, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        file_type = excluded.file_type,
        file_url = excluded.file_url,
        file_name = excluded.file_name,
        file_size = excluded.file_size,
        storage_path = excluded.storage_path,
        file_size_bytes = excluded.file_size_bytes,
        uploaded_by = excluded.uploaded_by,
        uploader_name = excluded.uploader_name,
        category = excluded.category,
        description = excluded.description,
        upload_timestamp = excluded.upload_timestamp,
        is_verified = excluded.is_verified,
        is_demo = excluded.is_demo;
    `),

    message: db.prepare(`
      INSERT INTO case_messages (
        id, case_id, sender_id, sender_role, sender_name, content,
        attachment_reference, attachments_data, timestamp, is_read, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        attachment_reference = excluded.attachment_reference,
        attachments_data = excluded.attachments_data,
        is_read = excluded.is_read,
        is_demo = excluded.is_demo;
    `),

    update: db.prepare(`
      INSERT INTO case_updates (
        id, case_id, updated_by_id, author_id, author_name, author_role,
        title, description, note, previous_status, new_status,
        previous_stage, new_stage, stage, implementation_state,
        date, timestamp, order_document_url, hearing_outcome, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        note = excluded.note,
        previous_status = excluded.previous_status,
        new_status = excluded.new_status,
        stage = excluded.stage,
        implementation_state = excluded.implementation_state,
        order_document_url = excluded.order_document_url,
        hearing_outcome = excluded.hearing_outcome,
        is_demo = excluded.is_demo;
    `),

    participant: db.prepare(`
      INSERT INTO case_participants (
        id, case_id, user_id, role_in_case, permissions, joined_at, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role_in_case = excluded.role_in_case,
        permissions = excluded.permissions,
        is_demo = excluded.is_demo;
    `),

    payment: db.prepare(`
      INSERT INTO payments (
        id, case_id, client_id, lawyer_id, case_number, client_name, lawyer_name,
        service_category, amount, gst_amount, total_amount, currency, provider,
        transaction_id, payment_method, status, payment_date, invoice_id, refund_status,
        timestamps_created, timestamps_completed, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        case_id = excluded.case_id,
        transaction_id = excluded.transaction_id,
        status = excluded.status,
        invoice_id = excluded.invoice_id,
        refund_status = excluded.refund_status,
        timestamps_completed = excluded.timestamps_completed,
        updated_at = excluded.updated_at;
    `),

    invoice: db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, payment_id, case_id, case_number, client_id, lawyer_id,
        client_name, client_email, lawyer_name, service_description, amount,
        gst_rate, gst_amount, total, issue_date, due_date, paid_date, status,
        is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        paid_date = excluded.paid_date;
    `),

    appointment: db.prepare(`
      INSERT INTO appointments (
        id, client_id, lawyer_id, case_id, client_name, lawyer_name, case_title,
        date, time_slot, location, type, mode, status, notes, fee, meeting_link,
        cancellation_reason, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        date = excluded.date,
        time_slot = excluded.time_slot,
        location = excluded.location,
        status = excluded.status,
        mode = excluded.mode,
        notes = excluded.notes,
        cancellation_reason = excluded.cancellation_reason,
        meeting_link = excluded.meeting_link,
        updated_at = excluded.updated_at;
    `),

    review: db.prepare(`
      INSERT INTO reviews (
        id, lawyer_id, client_id, case_id, client_name, rating, comment,
        written_review, case_category, moderation_status, moderation_notes, is_verified_client,
        timestamp, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        rating = excluded.rating,
        comment = excluded.comment,
        written_review = excluded.written_review,
        moderation_status = excluded.moderation_status,
        moderation_notes = excluded.moderation_notes;
    `),

    notification: db.prepare(`
      INSERT INTO notifications (
        id, user_id, type, title, content, entity_type, entity_id, is_read, is_demo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_read = excluded.is_read;
    `),

    query: db.prepare(`
      INSERT INTO legal_queries (
        id, client_id, title, category, description, is_anonymous, author_name,
        city, state, replies_data, views, status, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        replies_data = excluded.replies_data,
        views = excluded.views,
        status = excluded.status,
        updated_at = excluded.updated_at;
    `),

    publicContent: db.prepare(`
      INSERT INTO public_content (
        id, slug, type, title, category, content_markdown, author,
        citation, court, bench, decision_date, legal_sections,
        ratio_decidendi, source_url, source_name, tags, is_published,
        views_count, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        content_markdown = excluded.content_markdown,
        views_count = excluded.views_count,
        updated_at = excluded.updated_at;
    `),

    deadline: db.prepare(`
      INSERT INTO case_deadlines (
        id, case_id, title, deadline_type, start_date, deadline_date,
        description, calculation_source, entered_by_id, entered_by_name,
        entered_by_role, verified_rule_reference, remedy_action_required,
        governing_forum, is_completed, completed_at, notes, is_demo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        deadline_type = excluded.deadline_type,
        start_date = excluded.start_date,
        deadline_date = excluded.deadline_date,
        description = excluded.description,
        calculation_source = excluded.calculation_source,
        entered_by_id = excluded.entered_by_id,
        entered_by_name = excluded.entered_by_name,
        entered_by_role = excluded.entered_by_role,
        verified_rule_reference = excluded.verified_rule_reference,
        remedy_action_required = excluded.remedy_action_required,
        governing_forum = excluded.governing_forum,
        is_completed = excluded.is_completed,
        completed_at = excluded.completed_at,
        notes = excluded.notes,
        is_demo = excluded.is_demo,
        updated_at = excluded.updated_at;
    `)
  };

  return upsertStatements;
}

/**
 * Persist individual typed entities to SQLite directly
 */
export function persistUser(user: User): void {
  const stmts = getUpsertStatements();
  const isDemo = user.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.user.run(
    user.id,
    user.name,
    user.email,
    user.phone,
    user.role,
    user.password || 'Password@123',
    user.isEmailVerified ? 1 : 0,
    user.isPhoneVerified ? 1 : 0,
    user.avatarUrl || null,
    user.passwordResetToken || null,
    user.passwordResetExpires || null,
    user.emailVerificationToken || null,
    isDemo,
    user.createdAt || now,
    now
  );
}

export function persistClient(client: ClientProfile): void {
  const stmts = getUpsertStatements();
  const isDemo = client.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.client.run(
    client.id,
    client.userId,
    client.fullName,
    client.email,
    client.phone,
    client.city,
    client.state,
    client.address || null,
    client.isPhoneVerified ? 1 : 0,
    isDemo,
    client.createdAt || now,
    now
  );
}

export function persistLawyer(lawyer: LawyerProfile): void {
  const stmts = getUpsertStatements();
  const isDemo = lawyer.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.lawyer.run(
    lawyer.id,
    lawyer.userId,
    lawyer.lawFirmId || null,
    lawyer.fullName,
    lawyer.email,
    lawyer.phone,
    lawyer.barCouncilNumber,
    lawyer.stateBarCouncil,
    lawyer.experienceYears,
    JSON.stringify(lawyer.practiceAreas || []),
    JSON.stringify(lawyer.courts || []),
    lawyer.bio || null,
    lawyer.education || null,
    lawyer.consultationFee,
    lawyer.rating,
    lawyer.reviewCount,
    lawyer.isVerified ? 1 : 0,
    lawyer.verificationStatus || 'pending',
    lawyer.verificationNotes || null,
    JSON.stringify(lawyer.languages || []),
    lawyer.city,
    lawyer.state,
    lawyer.avatarUrl || null,
    isDemo,
    now,
    now
  );
}

export function persistCase(c: LegalCase): void {
  const stmts = getUpsertStatements();
  const isDemo = c.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.case.run(
    c.id,
    c.caseNumber,
    c.clientId,
    c.lawyerId || null,
    c.title,
    c.category,
    c.description,
    c.city,
    c.state,
    c.urgency || (c.isUrgent ? 'high' : 'standard'),
    c.isUrgent ? 1 : 0,
    c.status || 'open',
    c.stage,
    c.implementationState,
    c.courtName || null,
    c.judgeName || null,
    c.filingNumber || null,
    c.filingDate || null,
    c.nextHearingDate || null,
    c.closureDate || null,
    c.totalFee || 0,
    c.paidAmount || 0,
    c.documentsCount || 0,
    c.unreadCount || 0,
    isDemo,
    c.createdAt || now,
    c.updatedAt || now
  );
}

export function persistDocument(d: CaseDocument): void {
  const stmts = getUpsertStatements();
  const isDemo = d.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.document.run(
    d.id,
    d.caseId,
    d.uploaderId || null,
    d.title,
    d.fileType,
    d.fileUrl,
    d.fileName,
    d.fileSize,
    d.storagePath || `vault/${d.caseId}/${d.fileName}`,
    d.fileSizeBytes || 0,
    d.uploadedBy,
    d.uploaderName,
    d.category,
    d.description || null,
    d.uploadTimestamp || d.createdAt || now,
    d.isVerified ? 1 : 0,
    isDemo,
    d.createdAt || now
  );
}

export function persistMessage(m: CaseMessage): void {
  const stmts = getUpsertStatements();
  const isDemo = m.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.message.run(
    m.id,
    m.caseId,
    m.senderId,
    m.senderRole,
    m.senderName,
    m.content,
    m.attachmentRef || null,
    m.attachments ? JSON.stringify(m.attachments) : null,
    m.timestamp || m.createdAt || now,
    m.isRead ? 1 : 0,
    isDemo,
    m.createdAt || now
  );
}

export function persistUpdate(u: CaseUpdate): void {
  const stmts = getUpsertStatements();
  const isDemo = u.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.update.run(
    u.id,
    u.caseId,
    u.updatedById || u.authorId,
    u.authorId,
    u.authorName,
    u.authorRole,
    u.title,
    u.description,
    u.note || u.description,
    u.previousStatus || null,
    u.newStatus || u.stage || 'in_progress',
    u.previousStage || null,
    u.newStage || u.stage || null,
    u.stage || 'Notice Sent',
    u.implementationState || 'Active',
    u.date || now,
    u.timestamp || u.date || now,
    u.orderDocumentUrl || null,
    u.hearingOutcome || null,
    isDemo,
    u.date || now
  );
}

export function persistParticipant(p: CaseParticipant): void {
  const stmts = getUpsertStatements();
  const isDemo = p.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.participant.run(
    p.id,
    p.caseId,
    p.userId,
    p.roleInCase,
    p.permissions,
    p.joinedAt || now,
    isDemo,
    now
  );
}

export function persistPayment(p: Payment): void {
  const stmts = getUpsertStatements();
  const isDemo = p.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.payment.run(
    p.id,
    p.caseId || null,
    p.clientId,
    p.lawyerId || null,
    p.caseNumber || null,
    p.clientName,
    p.lawyerName || null,
    p.serviceCategory,
    p.amount,
    p.gstAmount,
    p.totalAmount,
    p.currency || 'INR',
    p.provider || 'Razorpay',
    p.transactionId,
    p.paymentMethod,
    p.status,
    p.paymentDate || now,
    p.invoiceId || null,
    p.refundStatus || 'none',
    p.timestamps?.created || now,
    p.timestamps?.completed || (p.status === 'completed' ? now : null),
    isDemo,
    now,
    now
  );
}

export function persistInvoice(i: Invoice): void {
  const stmts = getUpsertStatements();
  const isDemo = i.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.invoice.run(
    i.id,
    i.invoiceNumber,
    i.paymentId || null,
    i.caseId || null,
    i.caseNumber || null,
    i.clientEmail ? i.clientEmail : null, // client ref
    i.lawyerName ? i.lawyerName : null,
    i.clientName,
    i.clientEmail,
    i.lawyerName || null,
    i.serviceDescription,
    i.amount,
    i.gstRate,
    i.gstAmount,
    i.total,
    i.issueDate,
    i.issueDate,
    i.status === 'paid' ? i.issueDate : null,
    i.status,
    isDemo,
    now
  );
}

export function persistAppointment(a: Appointment): void {
  const stmts = getUpsertStatements();
  const isDemo = a.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.appointment.run(
    a.id,
    a.clientId,
    a.lawyerId,
    a.caseId || null,
    a.clientName,
    a.lawyerName,
    a.caseTitle || null,
    a.date,
    a.timeSlot,
    a.location || 'Advocate Chamber',
    'offline',
    a.mode || 'Offline Chamber Meeting',
    a.status,
    a.notes || null,
    a.fee || 0,
    a.meetingLink || null,
    a.cancellationReason || null,
    isDemo,
    a.createdAt || now,
    a.updatedAt || now
  );
}

export function persistReview(r: Review): void {
  const stmts = getUpsertStatements();
  const isDemo = r.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.review.run(
    r.id,
    r.lawyerId,
    r.clientId,
    r.caseId || null,
    r.clientName,
    r.rating,
    r.comment,
    r.writtenReview || r.comment,
    r.caseCategory,
    r.moderationStatus || 'pending',
    r.moderationNotes || null,
    r.isVerifiedClient ? 1 : 0,
    r.timestamp || r.createdAt || now,
    isDemo,
    r.createdAt || now
  );
}

export function persistNotification(n: Notification): void {
  const stmts = getUpsertStatements();
  const isDemo = n.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.notification.run(
    n.id,
    n.userId,
    n.type,
    n.title,
    n.content,
    n.entityType || null,
    n.entityId || null,
    n.isRead ? 1 : 0,
    isDemo,
    n.createdAt || now
  );
}

export function persistQuery(q: LegalQuery): void {
  const stmts = getUpsertStatements();
  const isDemo = q.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.query.run(
    q.id,
    q.clientId || null,
    q.title,
    q.category,
    q.description,
    q.isAnonymous ? 1 : 0,
    q.authorName,
    q.city,
    q.state,
    JSON.stringify(q.replies || []),
    q.views || 1,
    'open',
    isDemo,
    q.createdAt || now,
    now
  );
}

export function persistPublicContent(c: PublicContent): void {
  const stmts = getUpsertStatements();
  const isDemo = c.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.publicContent.run(
    c.id,
    c.slug,
    c.type,
    c.title,
    c.category,
    c.contentMarkdown,
    c.author,
    c.citation || null,
    c.court || null,
    c.bench || null,
    c.decisionDate || null,
    JSON.stringify(c.legalSections || []),
    c.ratioDecidendi || null,
    c.sourceUrl || null,
    c.sourceName || null,
    JSON.stringify(c.tags || []),
    c.isPublished ? 1 : 0,
    c.viewsCount || 0,
    isDemo,
    c.createdAt || now,
    c.updatedAt || now
  );
}

export function persistDeadline(d: LegalDeadline): void {
  const stmts = getUpsertStatements();
  const isDemo = d.isDemo ? 1 : 0;
  const now = new Date().toISOString();
  stmts.deadline.run(
    d.id,
    d.caseId,
    d.title,
    d.deadlineType,
    d.startDate,
    d.deadlineDate,
    d.description || null,
    d.calculationSource,
    d.enteredById,
    d.enteredByName,
    d.enteredByRole,
    d.verifiedRuleReference ? JSON.stringify(d.verifiedRuleReference) : null,
    d.remedyActionRequired || null,
    d.governingForum || null,
    d.isCompleted ? 1 : 0,
    d.completedAt || null,
    d.notes || null,
    isDemo,
    d.createdAt || now,
    d.updatedAt || now
  );
}

export function deleteDeadlineFromSqlite(id: string): void {
  const db = getSqliteDb();
  db.prepare('DELETE FROM case_deadlines WHERE id = ?').run(id);
}

/**
 * Creates a reactive proxy on objects that synchronizes field modifications directly into SQLite.
 */
function createTrackedProxy<T extends { id: string }>(item: T, persistFn: (i: T) => void): T {
  return new Proxy(item, {
    set(target, prop, value, receiver) {
      const res = Reflect.set(target, prop, value, receiver);
      try {
        persistFn(target);
      } catch (err) {
        console.error(`[SQLite Sync Error on ${target.id}]:`, err);
      }
      return res;
    }
  });
}

/**
 * Creates a reactive proxy on arrays that synchronizes push, unshift, and direct index assignments into SQLite.
 */
function createPersistentArray<T extends { id: string }>(
  items: T[],
  persistFn: (item: T) => void
): T[] {
  const trackedItems = items.map((item) => createTrackedProxy(item, persistFn));

  return new Proxy(trackedItems, {
    set(target, prop, value, receiver) {
      const res = Reflect.set(target, prop, value, receiver);
      if (typeof prop === 'string' && !isNaN(Number(prop)) && value && typeof value === 'object' && value.id) {
        try {
          persistFn(value);
        } catch (err) {
          console.error(`[SQLite Array Sync Error on ${value.id}]:`, err);
        }
      }
      return res;
    }
  });
}

/**
 * Load all records from SQLite and wrap with live auto-persisting proxies
 */
function loadStateFromSqlite(): DatabaseState {
  const db = getSqliteDb();

  // 1. Users
  const userRows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as any[];
  const users: User[] = userRows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    password: r.password,
    isEmailVerified: !!r.is_email_verified,
    isPhoneVerified: !!r.is_phone_verified,
    avatarUrl: r.avatar_url || undefined,
    passwordResetToken: r.password_reset_token || undefined,
    passwordResetExpires: r.password_reset_expires || undefined,
    emailVerificationToken: r.email_verification_token || undefined,
    createdAt: r.created_at,
    isDemo: !!r.is_demo
  }));

  // 2. Clients
  const clientRows = db.prepare('SELECT * FROM clients ORDER BY created_at ASC').all() as any[];
  const clients: ClientProfile[] = clientRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    city: r.city,
    state: r.state,
    address: r.address || undefined,
    isPhoneVerified: !!r.is_phone_verified,
    createdAt: r.created_at,
    isDemo: !!r.is_demo
  }));

  // 3. Lawyers
  const lawyerRows = db.prepare('SELECT * FROM lawyers ORDER BY created_at ASC').all() as any[];
  const lawyers: LawyerProfile[] = lawyerRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    lawFirmId: r.law_firm_id || undefined,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    barCouncilNumber: r.bar_council_number,
    stateBarCouncil: r.state_bar_council,
    experienceYears: r.experience_years,
    practiceAreas: JSON.parse(r.practice_areas || '[]'),
    courts: JSON.parse(r.courts || '[]'),
    bio: r.bio || '',
    education: r.education || '',
    consultationFee: r.consultation_fee,
    rating: r.rating,
    reviewCount: r.review_count,
    isVerified: !!r.is_verified,
    verificationStatus: r.verification_status,
    verificationNotes: r.verification_notes || undefined,
    languages: JSON.parse(r.languages || '[]'),
    city: r.city,
    state: r.state,
    avatarUrl: r.avatar_url || undefined,
    isDemo: !!r.is_demo
  }));

  // 4. Law Firms
  const firmRows = db.prepare('SELECT * FROM law_firms ORDER BY created_at ASC').all() as any[];
  const lawFirms: LawFirm[] = firmRows.map((r) => ({
    id: r.id,
    name: r.name,
    registrationNumber: r.registration_number,
    foundedYear: r.founded_year,
    headquarters: r.headquarters,
    practiceAreas: JSON.parse(r.practice_areas || '[]'),
    attorneyCount: r.attorney_count,
    rating: r.rating,
    description: r.description,
    logoUrl: r.logo_url || undefined,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    website: r.website || undefined,
    isDemo: !!r.is_demo
  }));

  // 5. Cases
  const caseRows = db.prepare('SELECT c.*, cl.full_name as cl_name, cl.phone as cl_phone, l.full_name as l_name FROM cases c LEFT JOIN clients cl ON c.client_id = cl.id LEFT JOIN lawyers l ON c.assigned_lawyer_id = l.id ORDER BY c.created_at DESC').all() as any[];
  const cases: LegalCase[] = caseRows.map((r) => ({
    id: r.id,
    caseNumber: r.case_number,
    clientId: r.client_id,
    clientName: r.cl_name || 'Client',
    clientPhone: r.cl_phone || '',
    lawyerId: r.assigned_lawyer_id || undefined,
    lawyerName: r.l_name || undefined,
    title: r.title,
    category: r.category,
    description: r.description,
    stage: r.stage,
    status: r.status,
    urgency: r.urgency,
    implementationState: r.implementation_state,
    filingDate: r.filing_date || undefined,
    nextHearingDate: r.next_hearing_date || undefined,
    closureDate: r.closure_date || undefined,
    courtName: r.court_name || undefined,
    judgeName: r.judge_name || undefined,
    filingNumber: r.filing_number || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalFee: r.total_fee,
    paidAmount: r.paid_amount,
    isUrgent: !!r.is_urgent,
    city: r.location_city,
    state: r.location_state,
    documentsCount: r.documents_count,
    unreadCount: r.unread_count,
    isDemo: !!r.is_demo
  }));

  // 6. Documents
  const docRows = db.prepare('SELECT * FROM case_documents ORDER BY created_at ASC').all() as any[];
  const documents: CaseDocument[] = docRows.map((r) => ({
    id: r.id,
    caseId: r.case_id,
    uploaderId: r.uploader_id || undefined,
    title: r.title,
    fileType: r.file_type,
    fileUrl: r.file_url,
    fileName: r.file_name,
    fileSize: r.file_size,
    storagePath: r.storage_path || undefined,
    fileSizeBytes: r.file_size_bytes,
    uploadedBy: r.uploaded_by,
    uploaderName: r.uploader_name,
    category: r.category,
    description: r.description || undefined,
    uploadTimestamp: r.upload_timestamp || r.created_at,
    createdAt: r.created_at,
    isVerified: !!r.is_verified,
    isDemo: !!r.is_demo
  }));

  // 7. Messages
  const msgRows = db.prepare('SELECT * FROM case_messages ORDER BY created_at ASC').all() as any[];
  const messages: CaseMessage[] = msgRows.map((r) => ({
    id: r.id,
    caseId: r.case_id,
    senderId: r.sender_id,
    senderRole: r.sender_role,
    senderName: r.sender_name,
    content: r.content,
    attachmentRef: r.attachment_reference || undefined,
    attachments: r.attachments_data ? JSON.parse(r.attachments_data) : undefined,
    timestamp: r.timestamp || r.created_at,
    createdAt: r.created_at,
    isRead: !!r.is_read,
    isDemo: !!r.is_demo
  }));

  // 8. Updates
  const updateRows = db.prepare('SELECT * FROM case_updates ORDER BY created_at DESC').all() as any[];
  const updates: CaseUpdate[] = updateRows.map((r) => ({
    id: r.id,
    caseId: r.case_id,
    updatedById: r.updated_by_id || undefined,
    authorId: r.author_id,
    authorName: r.author_name,
    authorRole: r.author_role,
    title: r.title,
    description: r.description,
    note: r.note || r.description,
    previousStatus: r.previous_status || undefined,
    newStatus: r.new_status || undefined,
    previousStage: r.previous_stage || undefined,
    newStage: r.new_stage || undefined,
    stage: r.stage,
    implementationState: r.implementation_state,
    date: r.date,
    timestamp: r.timestamp || r.date,
    orderDocumentUrl: r.order_document_url || undefined,
    hearingOutcome: r.hearing_outcome || undefined,
    isDemo: !!r.is_demo
  }));

  // 9. Case Participants
  const participantRows = db.prepare('SELECT * FROM case_participants ORDER BY created_at ASC').all() as any[];
  const caseParticipants: CaseParticipant[] = participantRows.map((r) => ({
    id: r.id,
    caseId: r.case_id,
    userId: r.user_id,
    roleInCase: r.role_in_case,
    permissions: r.permissions,
    joinedAt: r.joined_at,
    isDemo: !!r.is_demo
  }));

  // 10. Payments
  const paymentRows = db.prepare('SELECT * FROM payments ORDER BY created_at DESC').all() as any[];
  const payments: Payment[] = paymentRows.map((r) => ({
    id: r.id,
    caseId: r.case_id || undefined,
    caseNumber: r.case_number || undefined,
    clientId: r.client_id,
    clientName: r.client_name,
    lawyerId: r.lawyer_id || undefined,
    lawyerName: r.lawyer_name || undefined,
    serviceCategory: r.service_category,
    amount: r.amount,
    gstAmount: r.gst_amount,
    totalAmount: r.total_amount,
    currency: r.currency,
    provider: r.provider,
    transactionId: r.transaction_id,
    paymentMethod: r.payment_method,
    status: r.status,
    paymentDate: r.payment_date,
    invoiceId: r.invoice_id || undefined,
    refundStatus: r.refund_status || 'none',
    timestamps: {
      created: r.timestamps_created,
      completed: r.timestamps_completed || undefined
    },
    isDemo: !!r.is_demo
  }));

  // 11. Invoices
  const invoiceRows = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as any[];
  const invoices: Invoice[] = invoiceRows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    paymentId: r.payment_id || '',
    caseId: r.case_id || undefined,
    caseNumber: r.case_number || undefined,
    clientName: r.client_name,
    clientEmail: r.client_email,
    lawyerName: r.lawyer_name || undefined,
    serviceDescription: r.service_description,
    amount: r.amount,
    gstRate: r.gst_rate,
    gstAmount: r.gst_amount,
    total: r.total,
    issueDate: r.issue_date,
    status: r.status,
    isDemo: !!r.is_demo
  }));

  // 12. Appointments
  const appointmentRows = db.prepare('SELECT * FROM appointments ORDER BY created_at DESC').all() as any[];
  const appointments: Appointment[] = appointmentRows.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    lawyerId: r.lawyer_id,
    lawyerName: r.lawyer_name,
    caseId: r.case_id || undefined,
    caseTitle: r.case_title || undefined,
    date: r.date,
    timeSlot: r.time_slot,
    location: r.location || 'Chamber No. 342, Lawyers Chamber Block, Saket District Court, New Delhi',
    status: (r.status === 'scheduled' ? 'Confirmed' : r.status) as any,
    mode: r.mode || 'Offline Chamber Meeting',
    notes: r.notes || undefined,
    fee: r.fee,
    meetingLink: r.meeting_link || undefined,
    cancellationReason: r.cancellation_reason || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isDemo: !!r.is_demo
  }));

  // 13. Reviews
  const reviewRows = db.prepare('SELECT * FROM reviews ORDER BY created_at DESC').all() as any[];
  const reviews: Review[] = reviewRows.map((r) => ({
    id: r.id,
    lawyerId: r.lawyer_id,
    clientId: r.client_id,
    clientName: r.client_name,
    caseId: r.case_id || undefined,
    caseTitle: undefined,
    rating: r.rating,
    comment: r.comment,
    writtenReview: r.written_review || r.comment,
    caseCategory: r.case_category || 'General Legal Matter',
    moderationStatus: r.moderation_status || 'pending',
    moderationNotes: r.moderation_notes || undefined,
    createdAt: r.created_at,
    timestamp: r.timestamp || r.created_at,
    isVerifiedClient: !!r.is_verified_client,
    isDemo: !!r.is_demo
  }));

  // 14. Notifications
  const notifRows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all() as any[];
  const notifications: Notification[] = notifRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    content: r.content,
    entityType: r.entity_type || undefined,
    entityId: r.entity_id || undefined,
    isRead: !!r.is_read,
    isDemo: !!r.is_demo,
    createdAt: r.created_at
  }));

  // 15. Legal Queries
  const queryRows = db.prepare('SELECT * FROM legal_queries ORDER BY created_at DESC').all() as any[];
  const queries: LegalQuery[] = queryRows.map((r) => ({
    id: r.id,
    clientId: r.client_id || undefined,
    title: r.title,
    category: r.category,
    description: r.description,
    isAnonymous: !!r.is_anonymous,
    authorName: r.author_name,
    city: r.city,
    state: r.state,
    replies: JSON.parse(r.replies_data || '[]'),
    createdAt: r.created_at,
    views: r.views,
    isDemo: !!r.is_demo
  }));

  // 16. Public Content & Verified Judgments
  const contentRows = db.prepare('SELECT * FROM public_content ORDER BY created_at ASC').all() as any[];
  const publicContent: PublicContent[] = contentRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    type: r.type,
    title: r.title,
    category: r.category,
    contentMarkdown: r.content_markdown,
    author: r.author,
    citation: r.citation || undefined,
    court: r.court || undefined,
    bench: r.bench || undefined,
    decisionDate: r.decision_date || undefined,
    legalSections: r.legal_sections ? JSON.parse(r.legal_sections) : undefined,
    ratioDecidendi: r.ratio_decidendi || undefined,
    sourceUrl: r.source_url || undefined,
    sourceName: r.source_name || undefined,
    tags: r.tags ? JSON.parse(r.tags) : undefined,
    isPublished: !!r.is_published,
    viewsCount: r.views_count,
    isDemo: !!r.is_demo,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));

  const judgments: VerifiedJudgment[] = contentRows
    .filter((r) => r.type === 'judgment_summary')
    .map((r) => ({
      id: r.id,
      title: r.title,
      citation: r.citation || '',
      court: r.court || '',
      bench: r.bench || '',
      decisionDate: r.decision_date || '',
      legalSections: r.legal_sections ? JSON.parse(r.legal_sections) : [],
      summary: r.content_markdown,
      ratioDecidendi: r.ratio_decidendi || '',
      sourceUrl: r.source_url || '',
      sourceName: r.source_name || '',
      isDemo: !!r.is_demo
    }));

  // 17. Case Deadlines (Right-to-Remedy Tracker)
  const deadlineRows = db.prepare('SELECT * FROM case_deadlines ORDER BY deadline_date ASC').all() as any[];
  const deadlines: LegalDeadline[] = deadlineRows.map((r) => {
    // Dynamically compute days remaining & status relative to current timestamp
    const target = new Date(r.deadline_date);
    target.setHours(23, 59, 59, 999);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status: 'safe' | 'approaching' | 'urgent' | 'expired' = 'safe';
    if (diffDays < 0) status = 'expired';
    else if (diffDays <= 3) status = 'urgent';
    else if (diffDays <= 14) status = 'approaching';
    else status = 'safe';

    return {
      id: r.id,
      caseId: r.case_id,
      title: r.title,
      deadlineType: r.deadline_type,
      startDate: r.start_date,
      deadlineDate: r.deadline_date,
      daysRemaining: diffDays,
      status,
      description: r.description || undefined,
      calculationSource: r.calculation_source,
      enteredById: r.entered_by_id,
      enteredByName: r.entered_by_name,
      enteredByRole: r.entered_by_role,
      verifiedRuleReference: r.verified_rule_reference ? JSON.parse(r.verified_rule_reference) : undefined,
      remedyActionRequired: r.remedy_action_required || undefined,
      governingForum: r.governing_forum || undefined,
      isCompleted: !!r.is_completed,
      completedAt: r.completed_at || undefined,
      notes: r.notes || undefined,
      isDemo: !!r.is_demo,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  });

  return {
    users: createPersistentArray(users, persistUser),
    clients: createPersistentArray(clients, persistClient),
    lawyers: createPersistentArray(lawyers, persistLawyer),
    lawFirms,
    cases: createPersistentArray(cases, persistCase),
    documents: createPersistentArray(documents, persistDocument),
    messages: createPersistentArray(messages, persistMessage),
    updates: createPersistentArray(updates, persistUpdate),
    caseParticipants: createPersistentArray(caseParticipants, persistParticipant),
    payments: createPersistentArray(payments, persistPayment),
    invoices: createPersistentArray(invoices, persistInvoice),
    appointments: createPersistentArray(appointments, persistAppointment),
    reviews: createPersistentArray(reviews, persistReview),
    notifications: createPersistentArray(notifications, persistNotification),
    queries: createPersistentArray(queries, persistQuery),
    judgments,
    publicContent: createPersistentArray(publicContent, persistPublicContent),
    deadlines: createPersistentArray(deadlines, persistDeadline),
    savedAuthorities: [
      {
        id: 'auth_1',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        lawyerId: 'l_1',
        caseName: 'Dashrath Rupsingh Rathod v. State of Maharashtra',
        citation: '(2014) 9 SCC 129',
        court: 'Supreme Court of India',
        bench: 'T.S. Thakur, Vikramajit Sen, C. Nagappan, JJ.',
        decisionDate: '2014-08-01',
        legalSections: ['Section 138 Negotiable Instruments Act', 'Section 142 NI Act'],
        relevantPassage:
          'Territorial jurisdiction for initiating complaint under Section 138 lies strictly at the place where the drawee bank is located and where the cheque was dishonoured.',
        shortSummary:
          'Landmark precedent clarifying jurisdictional territorial forum under Section 138 of Negotiable Instruments Act 1881.',
        source: 'Supreme Court Reports (SCR)',
        sourceUrl: 'https://main.sci.gov.in/judgment/2014/129',
        isVerified: true,
        notes: 'Governs territorial jurisdiction of Saket District Court presentation for this dishonour matter.',
        addedAt: '2025-02-10T10:30:00.000Z'
      },
      {
        id: 'auth_2',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        lawyerId: 'l_1',
        caseName: 'Bir Singh v. Mukesh Kumar',
        citation: '(2019) 4 SCC 197',
        court: 'Supreme Court of India',
        bench: 'R. Banumathi, Indira Banerjee, JJ.',
        decisionDate: '2019-02-06',
        legalSections: ['Section 139 Negotiable Instruments Act', 'Section 118 NI Act'],
        relevantPassage:
          'A blank cheque leaf voluntarily signed and handed over towards payment attracts the statutory presumption under Section 139 of the Act in favor of the holder.',
        shortSummary:
          'Presumption under Section 139 NI Act applies even if particulars on signed cheque were filled by payee.',
        source: 'Supreme Court Reports (SCR)',
        sourceUrl: 'https://main.sci.gov.in/judgment/2019/197',
        isVerified: true,
        notes: 'Key authority to rebut drawer plea of blank signed security cheque.',
        addedAt: '2025-02-11T14:15:00.000Z'
      },
      {
        id: 'auth_3',
        caseId: 'case_2',
        caseNumber: 'LS-2025-1002',
        lawyerId: 'l_1',
        caseName: 'Satender Kumar Antil v. Central Bureau of Investigation',
        citation: '2022 LiveLaw (SC) 577',
        court: 'Supreme Court of India',
        bench: 'S.K. Kaul, M.M. Sundresh, JJ.',
        decisionDate: '2022-07-11',
        legalSections: ['Section 438 CrPC', 'Section 41A CrPC', 'Article 21 Constitution of India'],
        relevantPassage:
          'Arrest is a draconian measure resulting in curtailment of personal liberty. The investigating agency must scrupulously satisfy compliance with Section 41 and 41A CrPC.',
        shortSummary:
          'Comprehensive guidelines on personal liberty, anticipatory bail categories, and prevention of arbitrary arrests.',
        source: 'Supreme Court of India Official Repository',
        sourceUrl: 'https://main.sci.gov.in/judgment/2022/577',
        isVerified: true,
        notes: 'Crucial citation for Category A offences where custody is not mandatory.',
        addedAt: '2025-02-12T09:00:00.000Z'
      }
    ],
    drafts: [
      {
        id: 'draft_1',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        caseTitle: 'Cheque Dishonour Notice & Recovery under Section 138 NI Act',
        clientName: 'Rohan Deshmukh',
        clientId: 'cl_1',
        lawyerId: 'l_1',
        lawyerName: 'Adv. Rajeshwar Sharma',
        documentType: 'Legal Notice',
        title: 'Statutory Demand Notice under Section 138 of Negotiable Instruments Act 1881',
        content:
          'LEGAL STATUTORY DEMAND NOTICE\n\n' +
          'To,\n' +
          'M/S APEX INFRASTRUCTURE PVT. LTD. & MR. VIKRAM MALHOTRA (DIRECTOR)\n' +
          '[ADDRESS OF NOTICEE: SECTOR 62, NOIDA, UTTAR PRADESH]\n\n' +
          'SUBJECT: STATUTORY DEMAND NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881 FOR DISHONOUR OF CHEQUE NO. [INFORMATION REQUIRED: CHEQUE NUMBER] DRAWN ON HDFC BANK LTD. FOR RS. [INFORMATION REQUIRED: DISHONOURED AMOUNT].\n\n' +
          'Sir/Madam,\n\n' +
          'Under express instructions and on behalf of my client, Mr. Rohan Deshmukh, resident of New Delhi (hereinafter referred to as "My Client"), I hereby serve upon you this Statutory Demand Notice:\n\n' +
          '1. That My Client had rendered professional consultancy and infrastructure advisory services to you, against which you admitted your legally enforceable liability to pay the agreed professional fees.\n\n' +
          '2. That in partial discharge of your legally enforceable debt, you issued Cheque bearing No. [INFORMATION REQUIRED: CHEQUE NUMBER] dated [INFORMATION REQUIRED: CHEQUE DATE] for an amount of Rs. [INFORMATION REQUIRED: AMOUNT] drawn on HDFC Bank Ltd.\n\n' +
          '3. That My Client presented the said cheque for encashment through his banker, State Bank of India, Saket Branch. However, to the utmost shock of My Client, the said cheque was dishonoured and returned unpaid vide Bank Return Memo dated [INFORMATION REQUIRED: DATE OF RETURN MEMO] with the official remark "FUNDS INSUFFICIENT".\n\n' +
          '4. That as held by the Hon\'ble Supreme Court in Bir Singh v. Mukesh Kumar (2019) 4 SCC 197, once the issuance of the signed instrument is established, the statutory presumption under Section 139 NI Act operates strictly against the drawer.\n\n' +
          '5. That you have committed an offence punishable under Section 138 of the Negotiable Instruments Act, 1881, as well as offences of cheating and breach of trust.\n\n' +
          'DEMAND CLAUSE:\n' +
          'I hereby call upon you to pay the total outstanding sum of Rs. [INFORMATION REQUIRED: AMOUNT] along with statutory interest @ 18% per annum to My Client within a statutory period of 15 (FIFTEEN) DAYS from the date of receipt of this notice, failing which My Client shall initiate criminal complaint proceedings under Section 138/142 of the Negotiable Instruments Act before the competent jurisdictional Magistrate at New Delhi, entirely at your risk, cost, and consequence.\n\n' +
          'Yours faithfully,\n\n' +
          'Adv. Rajeshwar Sharma\n' +
          'Advocate on Record, Enrolment No: D/1482/2011\n' +
          'Chamber No. 342, Lawyers Block, Saket District Court, New Delhi',
        courtDetails: 'BEFORE THE HON\'BLE CHIEF METROPOLITAN MAGISTRATE',
        jurisdiction: 'NEW DELHI DISTRICT, SAKET COURTS',
        relevantSections: ['Section 138 NI Act', 'Section 142 NI Act', 'Section 139 NI Act'],
        authorities: [
          {
            id: 'auth_1',
            caseId: 'case_1',
            lawyerId: 'l_1',
            caseName: 'Dashrath Rupsingh Rathod v. State of Maharashtra',
            citation: '(2014) 9 SCC 129',
            court: 'Supreme Court of India',
            decisionDate: '2014-08-01',
            relevantPassage: 'Territorial jurisdiction for initiating complaint under Section 138 lies at the place where the drawee bank is located.',
            source: 'Supreme Court Reports (SCR)',
            sourceUrl: 'https://main.sci.gov.in/judgment/2014/129',
            isVerified: true,
            addedAt: '2025-02-10T10:30:00.000Z'
          }
        ],
        language: 'English',
        status: 'UNDER REVIEW',
        isSharedWithClient: false,
        versions: [
          {
            id: 'v_1',
            versionNumber: 1,
            title: 'Initial AI First Draft',
            content: 'Initial statutory notice draft generated based on case intake facts.',
            status: 'DRAFT',
            modifiedAt: '2025-02-10T11:00:00.000Z',
            modifiedBy: 'Adv. Rajeshwar Sharma',
            changeSummary: 'Generated initial structured statutory legal notice.'
          },
          {
            id: 'v_2',
            versionNumber: 2,
            title: 'Advocate Verified Version 2',
            content:
              'LEGAL STATUTORY DEMAND NOTICE\n\nTo,\nM/S APEX INFRASTRUCTURE PVT. LTD...\n[Content expanded with Bir Singh precedent and 18% statutory interest demand]',
            status: 'UNDER REVIEW',
            modifiedAt: '2025-02-11T16:30:00.000Z',
            modifiedBy: 'Adv. Rajeshwar Sharma',
            changeSummary: 'Added Section 139 precedent citation and strengthened 15-day statutory demand timeline.'
          }
        ],
        createdAt: '2025-02-10T11:00:00.000Z',
        updatedAt: '2025-02-11T16:30:00.000Z'
      }
    ],
    advocateAuditLogs: [
      {
        id: 'audit_1',
        lawyerId: 'l_1',
        lawyerName: 'Adv. Rajeshwar Sharma',
        action: 'judgment_searched',
        actionLabel: 'Precedent Research Executed',
        details: 'Searched verified case law database for "Section 138 territorial jurisdiction".',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        timestamp: '2025-02-10T10:25:00.000Z'
      },
      {
        id: 'audit_2',
        lawyerId: 'l_1',
        lawyerName: 'Adv. Rajeshwar Sharma',
        action: 'judgment_saved',
        actionLabel: 'Authority Saved to Case',
        details: 'Saved precedent "Dashrath Rupsingh Rathod v. State of Maharashtra" ((2014) 9 SCC 129) to Case LS-2025-1001.',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        timestamp: '2025-02-10T10:30:00.000Z'
      },
      {
        id: 'audit_3',
        lawyerId: 'l_1',
        lawyerName: 'Adv. Rajeshwar Sharma',
        action: 'draft_generated',
        actionLabel: 'AI Legal Draft Created',
        details: 'Generated first draft of Legal Notice under Section 138 NI Act with strict non-fabrication placeholders.',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        draftId: 'draft_1',
        timestamp: '2025-02-10T11:00:00.000Z'
      },
      {
        id: 'audit_4',
        lawyerId: 'l_1',
        lawyerName: 'Adv. Rajeshwar Sharma',
        action: 'draft_edited',
        actionLabel: 'Draft Modified & Reviewed',
        details: 'Advocate edited statutory demand clauses and verified jurisdictional recitals (Version 2).',
        caseId: 'case_1',
        caseNumber: 'LS-2025-1001',
        draftId: 'draft_1',
        timestamp: '2025-02-11T16:30:00.000Z'
      }
    ]
  };
}

let activeDbState: DatabaseState | null = null;

/**
 * Returns the live persistent database instance backed directly by SQLite.
 */
export function getDb(): DatabaseState {
  if (!activeDbState) {
    activeDbState = loadStateFromSqlite();
  }
  return activeDbState;
}

/**
 * Resets memory cache and reloads state from SQLite disk
 */
export function resetDb(): void {
  activeDbState = loadStateFromSqlite();
}

/**
 * Get accurate metrics of all 16 entities separating demo data from real user data
 */
export function getDatabaseMetrics() {
  const db = getSqliteDb();
  const tables = [
    'users', 'clients', 'lawyers', 'law_firms', 'cases',
    'case_documents', 'case_messages', 'case_updates', 'case_participants',
    'payments', 'invoices', 'appointments', 'reviews', 'notifications',
    'legal_queries', 'public_content'
  ];

  const metrics: Record<string, { total: number; demo: number; real: number }> = {};

  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo, SUM(CASE WHEN is_demo = 0 THEN 1 ELSE 0 END) as real FROM ${table};`).get() as any;
      metrics[table] = {
        total: row.total || 0,
        demo: row.demo || 0,
        real: row.real || 0
      };
    } catch {
      metrics[table] = { total: 0, demo: 0, real: 0 };
    }
  }

  return metrics;
}

export { checkCaseAccessRaw as checkCaseAccess };
export { checkDocumentAccessRaw as checkDocumentAccess };
export { checkMessageAccessRaw as checkMessageAccess };
export { checkDeadlineAccessRaw as checkDeadlineAccess };
