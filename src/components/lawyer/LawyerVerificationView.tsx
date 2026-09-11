import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  Upload,
  FileText,
  Building,
  Scale,
  ArrowRight,
  Info,
  ChevronLeft
} from 'lucide-react';
import { LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';
import {
  Card,
  Button,
  Badge,
  Input,
  Textarea,
  Alert,
  LoadingState
} from '../ui/index.js';

interface LawyerVerificationViewProps {
  lawyer: LawyerProfile;
  onNavigate: (view: string) => void;
  onRefreshProfile?: () => void;
}

export const LawyerVerificationView: React.FC<LawyerVerificationViewProps> = ({
  lawyer,
  onNavigate,
  onRefreshProfile
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [isVerified, setIsVerified] = useState(false);
  const [barCouncilNumber, setBarCouncilNumber] = useState(lawyer.barCouncilNumber || '');
  const [stateBarCouncil, setStateBarCouncil] = useState(lawyer.stateBarCouncil || 'Bar Council of Delhi');
  const [notes, setNotes] = useState(lawyer.verificationNotes || '');
  const [certificateUrl, setCertificateUrl] = useState('https://storage.counselia.internal/demo-samples/sanad-sample.pdf');
  const [idCardUrl, setIdCardUrl] = useState('https://storage.counselia.internal/demo-samples/bar-id-sample.pdf');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getLawyerVerification();
      setStatus(data.verificationStatus);
      setIsVerified(data.isVerified);
      if (data.barCouncilNumber) setBarCouncilNumber(data.barCouncilNumber);
      if (data.stateBarCouncil) setStateBarCouncil(data.stateBarCouncil);
      if (data.verificationNotes) setNotes(data.verificationNotes);
    } catch (err) {
      console.error(err);
      setStatus(lawyer.verificationStatus || (lawyer.isVerified ? 'verified' : 'pending'));
      setIsVerified(!!lawyer.isVerified);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async (simulateInstant: boolean = false) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.submitLawyerVerification({
        barCouncilNumber,
        stateBarCouncil,
        certificateUrl,
        notes,
        simulateInstantApproval: simulateInstant
      });

      if (res.success) {
        setStatus(res.lawyer.verificationStatus);
        setIsVerified(res.lawyer.isVerified);
        setFeedback({
          type: 'success',
          message: res.message
        });
        if (onRefreshProfile) onRefreshProfile();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit verification'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <LoadingState message="Fetching official Bar Council verification status..." />
      </div>
    );
  }

  return (
    <div id="lawyer-verification-view" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Nav */}
      <button
        onClick={() => onNavigate('lawyer-profile')}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Advocate Profile
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">
          Bar Council of India Verification Portal
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Under the Advocates Act, 1961, only verified advocates enrolled with a State Bar Council appear in the public directory and can receive client inquiries.
        </p>
      </div>

      {feedback && (
        <Alert variant={feedback.type === 'success' ? 'success' : 'danger'} title={feedback.type === 'success' ? 'Status Updated' : 'Submission Failed'}>
          {feedback.message}
        </Alert>
      )}

      {/* Status Card */}
      <Card variant="bordered" className={`p-6 sm:p-7 border-2 ${
        status === 'verified'
          ? 'bg-emerald-50/50 border-emerald-300'
          : status === 'rejected'
          ? 'bg-rose-50/50 border-rose-300'
          : 'bg-amber-50/50 border-amber-300'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl shrink-0 ${
              status === 'verified'
                ? 'bg-emerald-100 text-emerald-800'
                : status === 'rejected'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {status === 'verified' ? (
                <ShieldCheck className="w-8 h-8" />
              ) : status === 'rejected' ? (
                <XCircle className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-serif text-slate-900">
                  Verification Status:
                </h2>
                <Badge
                  variant={status === 'verified' ? 'success' : status === 'rejected' ? 'danger' : 'warning'}
                  size="md"
                  className="uppercase tracking-wider font-bold"
                >
                  {status}
                </Badge>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed max-w-xl">
                {status === 'verified' ? (
                  <>
                    <strong>Bar Council Verified Advocate.</strong> Your credentials have been authenticated against the State Bar Council register. Your profile is active and publicly discoverable in the public directory.
                  </>
                ) : status === 'rejected' ? (
                  <>
                    <strong>Verification Rejected.</strong> The submitted certificate or enrolment number could not be validated. Please update the details below and re-submit for scrutiny.
                  </>
                ) : (
                  <>
                    <strong>Enrolment Verification Pending.</strong> Your Sanad certificate is under review by our compliance team. During this review period, your profile remains hidden from the public directory.
                  </>
                )}
              </p>

              {notes && (
                <p className="text-xs font-mono text-slate-600 bg-white/80 p-2 rounded border border-slate-200 mt-2">
                  Compliance Log: {notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick Simulation Button for Demo / Evaluation */}
          <div className="flex flex-col gap-2 shrink-0 sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Evaluation Tools</span>
            {status !== 'verified' ? (
              <Button
                variant="success"
                size="sm"
                isLoading={submitting}
                onClick={() => handleSubmitVerification(true)}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Approve (Verify Now)
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                isLoading={submitting}
                onClick={() => handleSubmitVerification(false)}
                leftIcon={<Clock className="w-3.5 h-3.5" />}
              >
                Set to Pending Review
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Strict Compliance Notice */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-white">Rule 36, Standards of Professional Conduct (Bar Council of India)</p>
          <p className="text-slate-300 leading-relaxed">
            Counselia strictly abides by Bar Council regulations. <strong>Only verified and approved advocates</strong> are displayed in the public advocate directory. Unverified or pending advocate profiles are strictly withheld from client public search results until certified.
          </p>
        </div>
      </div>

      {/* Verification Submission / Update Form */}
      <Card variant="default" className="p-6 sm:p-8 space-y-6">
        <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-amber-600" />
          Statutory Bar Council Enrolment Records
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Bar Council Enrolment Number"
            placeholder="e.g. D/1842/2012"
            value={barCouncilNumber}
            onChange={(e) => setBarCouncilNumber(e.target.value)}
            helperText="Exact format as stated on your Enrolment Sanad"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              State Bar Council Jurisdiction
            </label>
            <select
              value={stateBarCouncil}
              onChange={(e) => setStateBarCouncil(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="Bar Council of Delhi">Bar Council of Delhi</option>
              <option value="Bar Council of Maharashtra & Goa">Bar Council of Maharashtra & Goa</option>
              <option value="Bar Council of Karnataka">Bar Council of Karnataka</option>
              <option value="Bar Council of Tamil Nadu & Puducherry">Bar Council of Tamil Nadu & Puducherry</option>
              <option value="Bar Council of Uttar Pradesh">Bar Council of Uttar Pradesh</option>
              <option value="Bar Council of West Bengal">Bar Council of West Bengal</option>
              <option value="Bar Council of Punjab & Haryana">Bar Council of Punjab & Haryana</option>
            </select>
          </div>
        </div>

        {/* Uploaded Files Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Supporting Statutory Proof Documents
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Bar Enrolment Certificate (Sanad)
                </span>
                <Badge variant="success" size="sm">PDF Attached</Badge>
              </div>
              <Input
                label=""
                placeholder="https://..."
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                Official certificate issued upon enrollment by the State Bar Council.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  Bar Association Identity Card
                </span>
                <Badge variant="success" size="sm">PDF Attached</Badge>
              </div>
              <Input
                label=""
                placeholder="https://..."
                value={idCardUrl}
                onChange={(e) => setIdCardUrl(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                Current court bar association photo identity card or certificate of practice.
              </p>
            </div>
          </div>

          <Textarea
            label="Additional Notes / Chamber Verification Remarks"
            placeholder="Chamber number, court premises, or verification contact details..."
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Submission initiates audit against Bar Council roster registers.
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('lawyer-dashboard')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={submitting}
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => handleSubmitVerification(false)}
            >
              Submit Credentials for Verification
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
