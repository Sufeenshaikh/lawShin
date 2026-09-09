import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';

interface SubmitCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (caseId: string) => void;
  lawyers: LawyerProfile[];
  preselectedLawyerId?: string;
}

export const SubmitCaseModal: React.FC<SubmitCaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lawyers,
  preselectedLawyerId
}) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState('Tenancy');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedLawyerId, setSelectedLawyerId] = useState(preselectedLawyerId || '');

  // Files
  const [uploadedFiles, setUploadedFiles] = useState<{
    id: string;
    title: string;
    fileName: string;
    fileType: 'pdf' | 'image' | 'audio' | 'video' | 'doc';
    fileSize: string;
    category: 'evidence' | 'notice' | 'reply' | 'order' | 'petition' | 'id_proof';
    fileUrl: string;
  }[]>([]);

  // Disclaimers acknowledgment
  const [disclaimerNoOutcome, setDisclaimerNoOutcome] = useState(false);
  const [disclaimerConfidentiality, setDisclaimerConfidentiality] = useState(false);
  const [disclaimerIntermediary, setDisclaimerIntermediary] = useState(false);

  if (!isOpen) return null;

  const handleSimulateFileUpload = (type: 'pdf' | 'image' | 'audio' | 'video', customName?: string) => {
    const randomId = Math.random().toString(36).substring(7);
    let sampleTitle = '';
    let fileName = '';
    let size = '1.2 MB';

    switch (type) {
      case 'pdf':
        sampleTitle = customName || 'Rental_Lease_Deed_Executed.pdf';
        fileName = sampleTitle;
        size = '2.4 MB';
        break;
      case 'image':
        sampleTitle = customName || 'Cheque_Leaf_And_Bank_Memo.jpg';
        fileName = sampleTitle;
        size = '840 KB';
        break;
      case 'audio':
        sampleTitle = customName || 'Phone_Recording_Regarding_Demand.mp3';
        fileName = sampleTitle;
        size = '4.1 MB';
        break;
      case 'video':
        sampleTitle = customName || 'Flat_Handover_Inspection_Walkthrough.mp4';
        fileName = sampleTitle;
        size = '18.5 MB';
        break;
    }

    setUploadedFiles((prev) => [
      ...prev,
      {
        id: randomId,
        title: sampleTitle.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        fileName,
        fileType: type,
        fileSize: size,
        category: 'evidence',
        fileUrl: `/uploads/${fileName}`
      }
    ]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!disclaimerNoOutcome || !disclaimerConfidentiality || !disclaimerIntermediary) {
      setError('Please acknowledge and accept all statutory legal disclaimers.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.submitCase({
        title,
        category,
        description,
        isUrgent,
        lawyerId: selectedLawyerId || undefined,
        city,
        state,
        initialDocuments: uploadedFiles
      });

      if (res.success && res.case) {
        onSuccess(res.case.id);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Case submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-serif text-amber-700 uppercase tracking-wider">
                Step {step} of 4
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">New Case Intake</span>
            </div>
            <h2 className="text-lg font-bold font-serif text-slate-900 mt-0.5">
              {step === 1 && 'Describe Your Legal Grievance'}
              {step === 2 && 'Upload Evidence & Supporting Files'}
              {step === 3 && 'Select or Auto-Assign Advocate'}
              {step === 4 && 'Review & Accept Statutory Disclaimers'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: GRIEVANCE DETAILS */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Legal Category / Subject Matter *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Tenancy">Tenancy & Rental Security Deposit</option>
                  <option value="Cheque Bounce">Cheque Bounce (Sec 138 NI Act)</option>
                  <option value="Consumer">Consumer Protection Forum</option>
                  <option value="Civil Litigation">Civil Debt Recovery (Order 37 CPC)</option>
                  <option value="Family">Family & Matrimonial Dispute</option>
                  <option value="Employment">Employment & Full-and-Final Settlement</option>
                  <option value="Cyber">Cyber Crime / Financial Fraud</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Case Title / Grievance Summary *</label>
                <input
                  type="text"
                  placeholder="e.g. Recovery of Security Deposit of ₹1,40,000 from Landlord"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City / Court Jurisdiction *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Facts of the Grievance & Demanded Relief *
                </label>
                <textarea
                  rows={5}
                  placeholder="Detail the chronology: What happened? What dates? What monetary amount is owed or disputed? What efforts were made to resolve? What specific legal remedy do you desire?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 leading-relaxed"
                  required
                />
                <p className="text-[11px] text-slate-600 mt-1">
                  Your assigned advocate will review these facts before drafting legal notices or petitions.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-950 block">Urgent Matter Flag</span>
                  <span className="text-[11px] text-amber-800">Check if immediate injunction or caveat is required within 48 hours</span>
                </div>
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
              </div>
            </div>
          )}

          {/* STEP 2: EVIDENCE UPLOAD */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-3">
                <Upload className="w-8 h-8 text-amber-600 mx-auto" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">Upload Evidence and Relevant Documents</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supports PDF, Images (JPG/PNG), Audio recordings (MP3/WAV), and Video inspections (MP4).
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('pdf', 'Lease_Agreement_Dated_2024.pdf')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-semibold text-slate-700 shadow-sm flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" /> + Add PDF Agreement
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('image', 'Bank_Transfer_Slip_Receipt.png')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-semibold text-slate-700 shadow-sm flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> + Add Cheque / Memo Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('audio', 'Call_Recording_Demand.mp3')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-semibold text-slate-700 shadow-sm flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5 text-amber-500" /> + Add Audio Evidence
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateFileUpload('video', 'Flat_Inspection_Video.mp4')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg font-semibold text-slate-700 shadow-sm flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5 text-purple-500" /> + Add Video Walkthrough
                  </button>
                </div>
              </div>

              {/* Uploaded files list */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 mb-2">
                  Attached Vault Files ({uploadedFiles.length})
                </h4>
                {uploadedFiles.length === 0 ? (
                  <p className="text-slate-600 italic bg-slate-50 p-3 rounded border border-slate-100">
                    No documents attached yet. You can attach evidence now or upload later in your private case room.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.fileType === 'pdf' && <FileText className="w-4 h-4 text-rose-500 shrink-0" />}
                          {file.fileType === 'image' && <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />}
                          {file.fileType === 'audio' && <Mic className="w-4 h-4 text-amber-500 shrink-0" />}
                          {file.fileType === 'video' && <Video className="w-4 h-4 text-purple-500 shrink-0" />}
                          <div className="truncate">
                            <p className="font-semibold text-slate-900 truncate">{file.fileName}</p>
                            <p className="text-[10px] text-slate-600 font-mono">{file.fileSize} • 256-bit encrypted</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
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

          {/* STEP 3: ADVOCATE SELECTION */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-slate-600">
                You can auto-assign an advocate based on practice area and city, or choose a specific advocate from our verified panel.
              </p>

              <div
                onClick={() => setSelectedLawyerId('')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  !selectedLawyerId ? 'bg-amber-50/70 border-amber-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-sm">Automated Best-Match Allocation</span>
                  {!selectedLawyerId && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-slate-500 text-xs">
                  LAWShin will automatically route your case to the highest-rated verified advocate enrolled in {city} handling {category} matters.
                </p>
              </div>

              <div className="pt-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 block mb-2">
                  Or Direct to Specific Advocate:
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {lawyers.map((lawyer) => (
                    <div
                      key={lawyer.id}
                      onClick={() => setSelectedLawyerId(lawyer.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        selectedLawyerId === lawyer.id
                          ? 'bg-amber-50/70 border-amber-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={lawyer.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-900">{lawyer.fullName}</h4>
                            {lawyer.isVerified && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-500">
                            {lawyer.barCouncilNumber} • {lawyer.experienceYears}y exp
                          </p>
                        </div>
                      </div>
                      <span className="font-bold font-mono text-slate-800 text-xs">
                        ₹{lawyer.consultationFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & MANDATORY LEGAL DISCLAIMERS */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-900">{category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Title:</span>
                  <span className="font-bold text-slate-900 truncate max-w-xs">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jurisdiction:</span>
                  <span className="font-bold text-slate-900">{city}, {state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Evidence Files:</span>
                  <span className="font-bold text-slate-900">{uploadedFiles.length} files attached</span>
                </div>
              </div>

              {/* MANDATORY STATUTORY DISCLAIMER CHECKBOXES */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Mandatory Statutory Compliance Acknowledgments</span>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerNoOutcome}
                    onChange={(e) => setDisclaimerNoOutcome(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong>No Outcome Guarantee:</strong> "Case outcomes cannot be guaranteed. Services are provided as per applicable law."
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerConfidentiality}
                    onChange={(e) => setDisclaimerConfidentiality(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong>Confidentiality Policy:</strong> "All personal data and case evidence are kept confidential and protected."
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disclaimerIntermediary}
                    onChange={(e) => setDisclaimerIntermediary(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-amber-600 rounded border-slate-300"
                  />
                  <span className="text-slate-800 leading-snug">
                    <strong>Platform Role:</strong> "This app does not solicit clients. It is only a platform for grievance redressal and legal service delivery. Refunds and cancellations follow the policy mentioned in the Terms & Conditions."
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1 hover:bg-slate-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 1 && (!title || !description)}
              onClick={() => {
                if (step === 1 && (!title || !description)) {
                  setError('Please fill out the case title and description.');
                  return;
                }
                setError(null);
                setStep(step + 1);
              }}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Continue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !disclaimerNoOutcome || !disclaimerConfidentiality || !disclaimerIntermediary}
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? 'Creating Case...' : 'Confirm & File Case'}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
