import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Upload,
  Clock,
  MapPin,
  Scale,
  Sparkles,
  HelpCircle,
  FileCheck,
  Gavel
} from 'lucide-react';
import { LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';

interface NewCaseFormProps {
  lawyers: LawyerProfile[];
  preselectedLawyerId?: string;
  onSuccess: (caseId: string) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const NewCaseForm: React.FC<NewCaseFormProps> = ({
  lawyers,
  preselectedLawyerId,
  onSuccess,
  onCancel,
  isModal = false
}) => {
  // 7-step multi-step form
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Legal problem category
  const [category, setCategory] = useState('Tenancy & Rental');

  // Step 2: Describe the problem in client's own words
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reliefSought, setReliefSought] = useState('');

  // Step 3: Location
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [courtJurisdiction, setCourtJurisdiction] = useState('Saket District Court');

  // Step 4: Urgency
  const [urgencyLevel, setUrgencyLevel] = useState<'standard' | 'high' | 'urgent'>('standard');
  const [urgencyReason, setUrgencyReason] = useState('');

  // Step 5: Upload evidence (PDF, Images, Audio, Video)
  const [uploadedFiles, setUploadedFiles] = useState<{
    id: string;
    title: string;
    fileName: string;
    fileType: 'pdf' | 'image' | 'audio' | 'video' | 'doc';
    fileSize: string;
    category: 'evidence' | 'notice' | 'reply' | 'order' | 'petition' | 'id_proof';
    fileUrl: string;
  }[]>([]);
  const [customDocTitle, setCustomDocTitle] = useState('');

  // Step 6: Review & Disclaimers
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>(preselectedLawyerId || '');
  const [acceptedDisclaimers, setAcceptedDisclaimers] = useState({
    noGuarantee: false,
    privilege: false,
    intermediary: false
  });

  // Categories list
  const categories = [
    {
      id: 'Tenancy & Rental',
      title: 'Tenancy & Rental',
      sub: 'Security deposit disputes, evictions, rental agreements',
      badge: 'Order 37 / Rent Control'
    },
    {
      id: 'Cheque Bounce (Sec 138)',
      title: 'Cheque Bounce (Sec 138)',
      sub: 'Dishonour of negotiable instruments, 15-day statutory notice',
      badge: 'NI Act'
    },
    {
      id: 'Consumer Protection',
      title: 'Consumer Protection',
      sub: 'Defective goods, unfair trade practices, airline/builder refund',
      badge: 'CPA 2019'
    },
    {
      id: 'Civil Debt Recovery',
      title: 'Civil Debt Recovery',
      sub: 'Recovery of money, loan default, breach of commercial contract',
      badge: 'Civil Procedure'
    },
    {
      id: 'Family & Matrimonial',
      title: 'Family & Matrimonial',
      sub: 'Mutual divorce, maintenance (125 CrPC), custody, domestic welfare',
      badge: 'HMA / SMA'
    },
    {
      id: 'Property & Real Estate',
      title: 'Property & Real Estate',
      sub: 'Partition, injunctions, mutation, RERA builder delays',
      badge: 'Transfer of Property'
    },
    {
      id: 'Employment & Labor',
      title: 'Employment & Labor',
      sub: 'Wrongful termination, unpaid gratuity/PF, non-compete notice',
      badge: 'Labor Codes'
    },
    {
      id: 'Cyber Crime & Fraud',
      title: 'Cyber Crime & Fraud',
      sub: 'UPI fraud, unauthorized debit, impersonation, IT Act violations',
      badge: 'IT Act 2000'
    }
  ];

  // File upload simulation / file picker handler
  const handleFileSelect = (type: 'pdf' | 'image' | 'audio' | 'video', titleOverride?: string) => {
    const fileId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ext = type === 'pdf' ? 'pdf' : type === 'image' ? 'jpg' : type === 'audio' ? 'mp3' : 'mp4';
    const displayTitle = titleOverride || customDocTitle || (
      type === 'pdf' ? 'Agreement_or_Receipt.pdf' :
      type === 'image' ? 'Cheque_Leaf_Photo.jpg' :
      type === 'audio' ? 'Verbal_Admission_Audio.mp3' : 'Site_Walkthrough_Video.mp4'
    );
    const fileName = displayTitle.endsWith(`.${ext}`) ? displayTitle : `${displayTitle}.${ext}`;

    setUploadedFiles((prev) => [
      ...prev,
      {
        id: fileId,
        title: displayTitle.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        fileName,
        fileType: type,
        fileSize: type === 'pdf' ? '2.1 MB' : type === 'image' ? '1.4 MB' : type === 'audio' ? '4.8 MB' : '18.2 MB',
        category: 'evidence',
        fileUrl: `/vault/${fileName}`
      }
    ]);
    setCustomDocTitle('');
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Step validation
  const validateCurrentStep = (): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!category) {
        setError('Please select a legal problem category.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!title.trim() || title.trim().length < 5) {
        setError('Please provide a brief title for your case (at least 5 characters).');
        return false;
      }
      if (!description.trim() || description.trim().length < 20) {
        setError('Please describe your legal problem in your own words (at least 20 characters).');
        return false;
      }
    } else if (currentStep === 3) {
      if (!city.trim() || !state.trim()) {
        setError('Please specify both city and state for appropriate jurisdiction.');
        return false;
      }
    } else if (currentStep === 4) {
      if (urgencyLevel === 'urgent' && (!urgencyReason || urgencyReason.trim().length < 5)) {
        setError('Please provide a brief reason for requesting urgent legal redressal.');
        return false;
      }
    } else if (currentStep === 5) {
      // Evidence is optional but recommended
      return true;
    } else if (currentStep === 6) {
      if (!acceptedDisclaimers.noGuarantee || !acceptedDisclaimers.privilege || !acceptedDisclaimers.intermediary) {
        setError('Please acknowledge and accept all statutory legal disclaimers before proceeding to submit.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Step 7 Submission
  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) return;

    setSubmitting(true);
    setError(null);

    try {
      const fullDescription = reliefSought
        ? `${description}\n\n[Relief Sought by Client]: ${reliefSought}\n[Jurisdiction]: ${courtJurisdiction}`
        : `${description}\n\n[Jurisdiction]: ${courtJurisdiction}`;

      const res = await api.submitCase({
        title: title.trim(),
        category,
        description: fullDescription,
        isUrgent: urgencyLevel === 'urgent',
        lawyerId: selectedLawyerId || undefined,
        city: city.trim(),
        state: state.trim(),
        initialDocuments: uploadedFiles
      });

      if (res.success && res.case) {
        onSuccess(res.case.id);
      } else {
        throw new Error('Case creation failed on server');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit legal matter. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${
      isModal ? 'max-w-3xl w-full' : 'max-w-4xl mx-auto my-6 sm:my-8'
    }`}>
      {/* Step Indicator Header */}
      <div className="px-6 py-5 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              Step {currentStep} of 7
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">
              Client Legal Case Intake
            </span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
        </div>

        <h1 className="text-lg sm:text-xl font-bold font-serif text-white mt-2">
          {currentStep === 1 && 'Step 1: Select Legal Problem Category'}
          {currentStep === 2 && 'Step 2: Describe the Problem in Your Own Words'}
          {currentStep === 3 && 'Step 3: Location & Territorial Jurisdiction'}
          {currentStep === 4 && 'Step 4: Matter Urgency & Timeline'}
          {currentStep === 5 && 'Step 5: Upload Supporting Evidence'}
          {currentStep === 6 && 'Step 6: Review Case Details & Statutory Disclaimers'}
          {currentStep === 7 && 'Step 7: Confirm & Submit to Verified Advocate'}
        </h1>

        {/* 7-Step Progress Dots */}
        <div className="grid grid-cols-7 gap-1.5 mt-4 pt-3 border-t border-slate-800/80">
          {[
            '1. Category',
            '2. Problem',
            '3. Location',
            '4. Urgency',
            '5. Evidence',
            '6. Review',
            '7. Submit'
          ].map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <div key={label} className="space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isDone
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-amber-400'
                      : 'bg-slate-800'
                  }`}
                />
                <span className={`text-[10px] truncate block ${
                  isCurrent ? 'text-amber-300 font-bold' : isDone ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 sm:p-8 space-y-6 text-xs text-slate-700">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 1: LEGAL PROBLEM CATEGORY */}
        {/* ===================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                What area of Indian law does your dispute or requirement involve?
              </h3>
              <p className="text-slate-500 text-xs">
                Select the legal classification that best matches your situation. This determines relevant advocate specialization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    category === cat.id
                      ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-xs">{cat.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {cat.badge}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{cat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 2: DESCRIBE THE PROBLEM IN YOUR OWN WORDS */}
        {/* ===================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block font-bold text-slate-900 text-xs mb-1">
                Case Title / One-Line Grievance Summary *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Unlawful Withholding of Security Deposit of ₹1,40,000 upon Flat Handover"
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-xs"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                A concise description of the conflict or relief needed.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-900 text-xs mb-1">
                Describe the Facts in Your Own Words *
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened chronologically: dates, verbal promises made, communications sent, amounts involved, and opposing party actions..."
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-xs leading-relaxed"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Please be objective and include specific dates and monetary figures. Confidentiality is safeguarded under Section 126 of the Evidence Act.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-900 text-xs mb-1">
                What outcome or relief do you seek? (Optional)
              </label>
              <input
                type="text"
                value={reliefSought}
                onChange={(e) => setReliefSought(e.target.value)}
                placeholder="e.g., Full refund of deposit with 18% statutory interest and ₹25,000 litigation costs"
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-xs"
              />
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 3: LOCATION & JURISDICTION */}
        {/* ===================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <MapPin className="w-4 h-4 text-amber-600" />
                Territorial Court Jurisdiction
              </span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Under the Code of Civil Procedure (CPC) and Criminal Procedure Code (CrPC), lawsuits and statutory notices must be initiated within the territorial jurisdiction where the cause of action arose or where the property/respondent is situated.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-900 text-xs mb-1">City / District *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. New Delhi, Bengaluru, Mumbai"
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 text-xs mb-1">State / Union Territory *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Delhi, Karnataka, Maharashtra"
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-900 text-xs mb-1">
                Preferred Court / Commission (If Known)
              </label>
              <input
                type="text"
                value={courtJurisdiction}
                onChange={(e) => setCourtJurisdiction(e.target.value)}
                placeholder="e.g. Saket District Court, South Delhi Consumer Commission, NCLT Principal Bench"
                className="w-full p-3 border border-slate-300 rounded-xl text-xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                If unknown, your assigned advocate will verify the competent forum.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 4: URGENCY & TIMELINES */}
        {/* ===================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                How urgently does this matter require advocate attention?
              </h3>
              <p className="text-slate-500 text-xs">
                Statutory limitation periods and interim injunctions require expedited handling.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div
                onClick={() => setUrgencyLevel('standard')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  urgencyLevel === 'standard'
                    ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-slate-900 text-xs block mb-1">Standard Priority</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Regular notice drafting or legal opinion within 3 to 5 business days.
                </p>
              </div>

              <div
                onClick={() => setUrgencyLevel('high')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  urgencyLevel === 'high'
                    ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-slate-900 text-xs block mb-1">High Priority</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Notice period expiry or hearing scheduled within next 10-14 days.
                </p>
              </div>

              <div
                onClick={() => setUrgencyLevel('urgent')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  urgencyLevel === 'urgent'
                    ? 'border-rose-600 bg-rose-50/50 shadow-xs ring-1 ring-rose-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-bold text-rose-700 text-xs block mb-1">Urgent / Emergency</span>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Imminent arrest, eviction threat, caveat, or limitation deadline expiring within 48 hours.
                </p>
              </div>
            </div>

            {urgencyLevel === 'urgent' && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                <label className="block font-bold text-rose-900 text-xs">
                  Reason for Emergency / Urgent Redressal *
                </label>
                <input
                  type="text"
                  value={urgencyReason}
                  onChange={(e) => setUrgencyReason(e.target.value)}
                  placeholder="e.g. 15-day notice response period ends on Friday; bank freeze threat"
                  className="w-full p-2.5 border border-rose-300 rounded-lg text-xs bg-white focus:outline-none focus:border-rose-600"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 5: UPLOAD EVIDENCE (Supported: PDF, Images, Audio, Video) */}
        {/* ===================================================================== */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Upload Contemporaneous Evidence & Supporting Documents
              </h3>
              <p className="text-slate-500 text-xs">
                LAWShin supports PDF documents, High-Resolution Images, Audio call recordings, and Video inspection walkthroughs.
              </p>
            </div>

            {/* Quick Add Sample or Manual Entry */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <label className="block font-semibold text-slate-800 text-xs">
                Attach Evidence Files (PDF, Images, Audio, Video)
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customDocTitle}
                  onChange={(e) => setCustomDocTitle(e.target.value)}
                  placeholder="Enter file description (e.g. Executed Lease Deed, WhatsApp Export)"
                  className="flex-1 p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              {/* Supported file type clickers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleFileSelect('pdf')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 text-xs text-slate-800 font-medium"
                >
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span>+ PDF Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileSelect('image')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 text-xs text-slate-800 font-medium"
                >
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span>+ Image / Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileSelect('audio')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 text-xs text-slate-800 font-medium"
                >
                  <Mic className="w-4 h-4 text-emerald-500" />
                  <span>+ Audio Recording</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileSelect('video')}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center gap-2 text-xs text-slate-800 font-medium"
                >
                  <Video className="w-4 h-4 text-purple-500" />
                  <span>+ Video Recording</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                All electronic files are hashed for evidentiary certification under Section 65B Indian Evidence Act.
              </p>
            </div>

            {/* Uploaded files list */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs">
                Attached Case Records ({uploadedFiles.length})
              </h4>
              {uploadedFiles.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  No files attached yet. You can attach contracts, bills, audio recordings, or photos now or inside the Case Room later.
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {file.fileType === 'pdf' && <FileText className="w-5 h-5 text-rose-500 shrink-0" />}
                        {file.fileType === 'image' && <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />}
                        {file.fileType === 'audio' && <Mic className="w-5 h-5 text-emerald-500 shrink-0" />}
                        {file.fileType === 'video' && <Video className="w-5 h-5 text-purple-500 shrink-0" />}
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate">{file.title}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{file.fileType} • {file.fileSize}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 6: REVIEW */}
        {/* ===================================================================== */}
        {currentStep === 6 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Review Your Grievance Summary Before Submission
              </h3>
              <p className="text-slate-500 text-xs">
                Verify all entered facts. You can proceed to submit or assign a specific advocate.
              </p>
            </div>

            {/* Summary card */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Category</span>
                  <span className="font-bold text-slate-900 text-sm">{category}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Urgency</span>
                  <span className={`font-bold capitalize ${urgencyLevel === 'urgent' ? 'text-rose-600' : 'text-slate-800'}`}>
                    {urgencyLevel} Priority
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Territorial Jurisdiction</span>
                  <span className="font-semibold text-slate-800">{city}, {state} ({courtJurisdiction})</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Evidence Uploaded</span>
                  <span className="font-semibold text-slate-800">{uploadedFiles.length} files attached</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Matter Title</span>
                <p className="font-bold text-slate-900 text-sm">{title}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Narrative Description</span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {description}
                </p>
              </div>

              {/* Advocate Selection / Assignment */}
              <div className="pt-3 border-t border-slate-200">
                <label className="block font-bold text-slate-800 text-xs mb-1.5">
                  Select Advocate for Direct Representation:
                </label>
                <select
                  value={selectedLawyerId}
                  onChange={(e) => setSelectedLawyerId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">Auto-Assign Best-Matched Verified Advocate</option>
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} — {l.city} ({l.practiceAreas.slice(0, 2).join(', ')}) • {l.experienceYears}+ yrs exp
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Statutory Disclaimers */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-3">
              <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Statutory Legal Disclaimers & Bar Council Acknowledgment
              </h4>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedDisclaimers.noGuarantee}
                  onChange={(e) =>
                    setAcceptedDisclaimers((prev) => ({ ...prev, noGuarantee: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] text-amber-900 leading-relaxed">
                  I understand that under Bar Council of India rules, no legal outcome or court decree is ever guaranteed by advocates or LAWShin.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedDisclaimers.privilege}
                  onChange={(e) =>
                    setAcceptedDisclaimers((prev) => ({ ...prev, privilege: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] text-amber-900 leading-relaxed">
                  I acknowledge that attorney-client privileged communication applies directly between me and the assigned advocate under Section 126 of the Evidence Act.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedDisclaimers.intermediary}
                  onChange={(e) =>
                    setAcceptedDisclaimers((prev) => ({ ...prev, intermediary: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-[11px] text-amber-900 leading-relaxed">
                  I acknowledge that LAWShin operates as an IT intermediary platform under Section 79 of the IT Act 2000 and is not a law firm.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STEP 7: SUBMIT */}
        {/* ===================================================================== */}
        {currentStep === 7 && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
              <Gavel className="w-8 h-8" />
            </div>

            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold font-serif text-slate-900">
                Ready to Formally Initiate Your Case?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submitting this form will register a legal matter record in the LAWShin database and establish your private, end-to-end encrypted Case Room.
              </p>
            </div>

            <div className="p-4 max-w-lg mx-auto bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Matter:</span>
                <span className="font-semibold text-slate-900">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-slate-900">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jurisdiction:</span>
                <span className="font-semibold text-slate-900">{city}, {state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Evidence Count:</span>
                <span className="font-semibold text-slate-900">{uploadedFiles.length} file(s)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="btn-final-case-submit"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md text-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering Matter in Legal Database...
                  </>
                ) : (
                  <>
                    <span>Confirm & Register Legal Case</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer Navigation Controls */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 7 && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <span>{currentStep === 6 ? 'Proceed to Final Submission' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
