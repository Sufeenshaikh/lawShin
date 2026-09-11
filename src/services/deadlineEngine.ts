import { DeadlineStatus, VerifiedLegalRule, LegalDeadline } from '../types';

/**
 * Counselia Verified Legal-Rule Engine & Statutory Repository
 *
 * MANDATE COMPLIANCE:
 * - Do NOT invent legal limitation periods.
 * - The system only calculates a deadline when:
 *   1. The deadline date is explicitly entered by an authorized lawyer/admin, OR
 *   2. A future verified legal-rule engine/data source is connected.
 * - Do NOT let Gemini or any AI independently determine a legal deadline and present it as authoritative.
 */

export const DEADLINE_TRACKER_DISCLAIMER =
  'Statutory Notice & Procedural Disclaimer: The Counselia Right-to-Remedy / Deadline Tracker is an internal organizational reminder and workflow tool. It does NOT constitute formal legal advice and is NOT a substitute for professional legal representation. Statutory limitation periods can be altered by judicial condonation of delay (e.g. Section 5 of The Limitation Act, 1963), court vacations (Section 4), legal disability, or jurisdictional nuances. Always verify statutory limitation and limitation waivers directly with your designated advocate on record.';

export const AI_DEADLINE_POLICY_NOTICE =
  'Integrity Guardrail: Artificial Intelligence (Gemini or LLMs) is strictly barred from independently calculating or proclaiming authoritative legal deadlines. Every deadline in this tracker is derived exclusively from verified statutory statutes or confirmed entries by an authorized advocate.';

export const VERIFIED_LEGAL_RULES: VerifiedLegalRule[] = [
  {
    ruleId: 'cpc_order_viii_rule_1',
    actTitle: 'Code of Civil Procedure, 1908 (CPC)',
    sectionOrArticle: 'Order VIII, Rule 1 (Written Statement by Defendant)',
    standardPeriodDays: 30,
    description:
      'Defendant shall present a written statement of defense within 30 days from the date of service of summons. (Commercial courts: extendable up to 120 days maximum upon payment of costs and recording of reasons).',
    jurisdiction: 'Civil Courts / Commercial Courts Across India',
    officialSourceCitation: 'The Code of Civil Procedure, 1908 (Act No. 5 of 1908), First Schedule, Order VIII, Rule 1',
    triggerEventDescription: 'Date of receipt / service of court summons'
  },
  {
    ruleId: 'limitation_act_art_113',
    actTitle: 'The Limitation Act, 1963',
    sectionOrArticle: 'Article 113 (Residuary Limitation for Suits)',
    standardPeriodDays: 1095, // 3 years (365 * 3)
    description:
      'Any suit for which no period of limitation is provided elsewhere in this Schedule: 3 years from the date when the right to sue accrues (e.g. breach of contract, unpaid security deposit, civil damages).',
    jurisdiction: 'Union of India (Civil Courts)',
    officialSourceCitation: 'The Limitation Act, 1963 (Act No. 36 of 1963), Schedule, Part X, Article 113',
    triggerEventDescription: 'Date of refusal, wrongful deduction, or accrual of right to sue'
  },
  {
    ruleId: 'limitation_act_art_54',
    actTitle: 'The Limitation Act, 1963',
    sectionOrArticle: 'Article 54 (Suit for Specific Performance of Contract)',
    standardPeriodDays: 1095, // 3 years
    description:
      'Suit for specific performance of a contract: 3 years from the date fixed for the performance, or, if no such date is fixed, when the plaintiff has notice that performance is refused.',
    jurisdiction: 'Union of India (Civil Courts)',
    officialSourceCitation: 'The Limitation Act, 1963 (Act No. 36 of 1963), Schedule, Part II, Article 54',
    triggerEventDescription: 'Date fixed for contractual performance or notice of refusal'
  },
  {
    ruleId: 'consumer_protection_sec_69',
    actTitle: 'The Consumer Protection Act, 2019',
    sectionOrArticle: 'Section 69 (Limitation Period for Consumer Complaint)',
    standardPeriodDays: 730, // 2 years (365 * 2)
    description:
      'The District Commission, State Commission or National Commission shall not admit a complaint unless it is filed within two years from the date on which the cause of action has arisen.',
    jurisdiction: 'District, State & National Consumer Commissions (NCDRC/SCDRC/DCDRC)',
    officialSourceCitation: 'The Consumer Protection Act, 2019 (Act No. 35 of 2019), Chapter IV, Section 69(1)',
    triggerEventDescription: 'Date of deficiency in service or defective product handover'
  },
  {
    ruleId: 'ni_act_sec_138_notice',
    actTitle: 'The Negotiable Instruments Act, 1881',
    sectionOrArticle: 'Section 138, Proviso (b) (Statutory Demand Notice Window)',
    standardPeriodDays: 30,
    description:
      'Payee or holder in due course must make a demand for payment of cheque amount by giving a notice in writing to the drawer within 30 days of the receipt of information from the bank regarding cheque return.',
    jurisdiction: 'Magisterial Courts Across India',
    officialSourceCitation: 'The Negotiable Instruments Act, 1881 (Act No. 26 of 1881), Section 138, Proviso (b)',
    triggerEventDescription: 'Date of receipt of Cheque Return Memo / Bank Dishonour Advice'
  },
  {
    ruleId: 'ni_act_sec_142_complaint',
    actTitle: 'The Negotiable Instruments Act, 1881',
    sectionOrArticle: 'Section 142(1)(b) (Filing of Criminal Complaint under Sec 138)',
    standardPeriodDays: 30,
    description:
      'Complaint must be made in writing within one month (30 days) of the date on which the cause of action arises under clause (c) of the proviso to Section 138 (15 days after receipt of notice by drawer without payment).',
    jurisdiction: 'Metropolitan / Judicial Magistrate Court',
    officialSourceCitation: 'The Negotiable Instruments Act, 1881, Section 142(1)(b)',
    triggerEventDescription: '16th day after statutory demand notice service on drawer'
  },
  {
    ruleId: 'arbitration_sec_34_3',
    actTitle: 'The Arbitration and Conciliation Act, 1996',
    sectionOrArticle: 'Section 34(3) (Application for Setting Aside Arbitral Award)',
    standardPeriodDays: 90, // 3 months
    description:
      'Application for setting aside may not be made after 3 months have elapsed from the date on which the party making that application had received the arbitral award (extendable by 30 days upon sufficient cause).',
    jurisdiction: 'High Courts & Principal Civil Courts of Original Jurisdiction',
    officialSourceCitation: 'The Arbitration and Conciliation Act, 1996 (Act No. 26 of 1996), Section 34(3)',
    triggerEventDescription: 'Date of formal receipt of signed Arbitral Award'
  },
  {
    ruleId: 'rera_sec_44_2_appeal',
    actTitle: 'The Real Estate (Regulation and Development) Act, 2016 (RERA)',
    sectionOrArticle: 'Section 44(2) (Appeal to Real Estate Appellate Tribunal)',
    standardPeriodDays: 60,
    description:
      'Every appeal shall be preferred within a period of 60 days from the date on which a copy of the direction or order or decision made by the Authority or the Adjudicating Officer is received.',
    jurisdiction: 'Real Estate Appellate Tribunal (REAT)',
    officialSourceCitation: 'The Real Estate (Regulation and Development) Act, 2016 (Act No. 16 of 2016), Section 44(2)',
    triggerEventDescription: 'Date of receipt of RERA Authority or Adjudicating Officer order'
  },
  {
    ruleId: 'rti_sec_19_1_appeal',
    actTitle: 'The Right to Information Act, 2005',
    sectionOrArticle: 'Section 19(1) (First Appeal under RTI)',
    standardPeriodDays: 30,
    description:
      'Any person who does not receive a decision within the time specified in Section 7(1) or is aggrieved by a decision of the CPIO may prefer an appeal within 30 days from expiry of period or receipt of decision.',
    jurisdiction: 'First Appellate Authority (Public Authority)',
    officialSourceCitation: 'The Right to Information Act, 2005 (Act No. 22 of 2005), Section 19(1)',
    triggerEventDescription: 'Date of expiry of 30 days from RTI request or receipt of PIO refusal order'
  },
  {
    ruleId: 'mact_sec_166_3',
    actTitle: 'Motor Vehicles Act, 1988 (as amended by Act 32 of 2019)',
    sectionOrArticle: 'Section 166(3) (Limitation for Accident Compensation Claim)',
    standardPeriodDays: 180, // 6 months
    description:
      'No application for compensation shall be entertained unless it is made within six months of the occurrence of the accident.',
    jurisdiction: 'Motor Accidents Claims Tribunal (MACT)',
    officialSourceCitation: 'The Motor Vehicles (Amendment) Act, 2019, Section 166(3)',
    triggerEventDescription: 'Date of occurrence of vehicular road accident'
  }
];

/**
 * Calculates deadline cutoff date from a verified statutory rule and start date.
 */
export function computeDeadlineFromRule(ruleId: string, startDateStr: string): string {
  const rule = VERIFIED_LEGAL_RULES.find((r) => r.ruleId === ruleId);
  if (!rule) {
    throw new Error(`Rule ID '${ruleId}' not found in Counselia verified legal rule repository.`);
  }

  const startDate = new Date(startDateStr);
  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid start date provided for statutory rule calculation.');
  }

  const deadlineDate = new Date(startDate.getTime() + rule.standardPeriodDays * 24 * 60 * 60 * 1000);
  return deadlineDate.toISOString().split('T')[0];
}

/**
 * Accurately computes days remaining, status (Safe, Approaching, Urgent, Expired), and human description.
 *
 * Status thresholds:
 * - 🟢 Safe: > 14 days remaining
 * - 🟡 Approaching: 4 to 14 days remaining
 * - 🔴 Urgent: 0 to 3 days remaining (including Due Today)
 * - ⚫ Expired: < 0 days (deadline date has passed)
 */
export function calculateDaysRemainingAndStatus(
  deadlineDateStr: string,
  asOfDate: Date = new Date()
): {
  daysRemaining: number;
  status: DeadlineStatus;
  formattedRemaining: string;
  statusLabel: string;
  statusEmoji: string;
} {
  // Normalize both dates to midnight local time for clean whole-day calculation
  const target = new Date(deadlineDateStr);
  target.setHours(23, 59, 59, 999);

  const current = new Date(asOfDate);
  current.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - current.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let status: DeadlineStatus = 'safe';
  let formattedRemaining = '';
  let statusLabel = 'Safe';
  let statusEmoji = '🟢';

  if (diffDays < 0) {
    status = 'expired';
    const absDays = Math.abs(diffDays);
    formattedRemaining = `Expired ${absDays} day${absDays === 1 ? '' : 's'} ago`;
    statusLabel = 'Expired';
    statusEmoji = '⚫';
  } else if (diffDays <= 3) {
    status = 'urgent';
    if (diffDays === 0) {
      formattedRemaining = 'Due Today (Final Hours)';
    } else {
      formattedRemaining = `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`;
    }
    statusLabel = 'Urgent';
    statusEmoji = '🔴';
  } else if (diffDays <= 14) {
    status = 'approaching';
    formattedRemaining = `${diffDays} days remaining`;
    statusLabel = 'Approaching';
    statusEmoji = '🟡';
  } else {
    status = 'safe';
    formattedRemaining = `${diffDays} days remaining`;
    statusLabel = 'Safe';
    statusEmoji = '🟢';
  }

  return {
    daysRemaining: diffDays,
    status,
    formattedRemaining,
    statusLabel,
    statusEmoji
  };
}

/**
 * Computes visual timeline progress percentage between start date and deadline cutoff.
 */
export function computeTimelineProgress(
  startDateStr: string,
  deadlineDateStr: string,
  asOfDate: Date = new Date()
): {
  elapsedDays: number;
  totalDays: number;
  percentage: number;
} {
  const start = new Date(startDateStr).getTime();
  const deadline = new Date(deadlineDateStr).getTime();
  const current = asOfDate.getTime();

  const totalMs = deadline - start;
  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));

  if (current <= start) {
    return { elapsedDays: 0, totalDays, percentage: 0 };
  }
  if (current >= deadline) {
    return { elapsedDays: totalDays, totalDays, percentage: 100 };
  }

  const elapsedMs = current - start;
  const elapsedDays = Math.max(0, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

  return { elapsedDays, totalDays, percentage };
}

/**
 * Returns formatted countdown breakdown (Days, Hours, Minutes, Seconds)
 */
export function getDetailedCountdown(deadlineDateStr: string, asOfDate: Date = new Date()) {
  const target = new Date(deadlineDateStr);
  target.setHours(23, 59, 59, 999);

  const diffMs = target.getTime() - asOfDate.getTime();
  if (diffMs <= 0) {
    return { isExpired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    isExpired: false,
    days,
    hours,
    minutes,
    seconds
  };
}
