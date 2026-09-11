import React, { useState } from 'react';
import { Star, AlertCircle, CheckCircle2, X, Lock, ShieldCheck } from 'lucide-react';
import { LegalCase } from '../../types.js';
import { api } from '../../services/api.js';

interface ReviewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: LegalCase;
  onSuccess: () => void;
}

export const ReviewCaseModal: React.FC<ReviewCaseModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onSuccess
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const isCaseClosed = caseData.stage === 'Closed' || caseData.status === 'closed' || caseData.status === 'resolved';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaseClosed) {
      setError('Under Counselia policy, client reviews can only be submitted after case proceedings are concluded or closed by counsel.');
      return;
    }
    if (!caseData.lawyerId) {
      setError('No advocate is assigned to this matter.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 15) {
      setError('Please provide a substantive review of at least 15 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.submitReview({
        lawyerId: caseData.lawyerId,
        caseId: caseData.id,
        rating,
        comment: comment.trim(),
        writtenReview: comment.trim(),
        caseCategory: caseData.category
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Verified Client Review
            </span>
            <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 mt-0.5">
              Rate Your Legal Counsel
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Case banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 text-sm">{caseData.title}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Advocate: <strong className="text-slate-800">{caseData.lawyerName || 'Assigned Counsel'}</strong> • {caseData.category}
              </p>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
              isCaseClosed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {caseData.stage}
            </span>
          </div>

          {!isCaseClosed ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Reviews Restricted Until Case Closure</span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed">
                In strict compliance with Bar Council standards and fair evaluation principles, verified ratings and written feedback can only be published once the legal matter has reached final closure.
              </p>
              <p className="text-[11px] text-amber-700 font-medium">
                Current stage: <strong className="font-semibold">{caseData.stage}</strong>. Once your matter is marked Closed, the review form will automatically unlock.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs"
                >
                  Understood
                </button>
              </div>
            </div>
          ) : success ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Review Submitted for Verification</h3>
              <p className="text-slate-600 text-xs leading-relaxed max-w-sm mx-auto">
                Thank you for your feedback. In accordance with Bar Council integrity standards, your review has been recorded with status <strong>Pending Moderation</strong>. Approved reviews are displayed publicly on the advocate’s profile.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Star rating selector */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Overall Rating (1 to 5 Stars) *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= (hoverRating || rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-bold text-sm text-slate-700 font-mono">
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Written review textarea */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Written Feedback & Case Experience *
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe your advocate's responsiveness, clarity of legal guidance, speed of drafting, and court representation..."
                  className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Minimum 15 characters. This review will be marked with a "Verified Client" badge.
                </p>
              </div>

              {/* Statutory disclaimer */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  By submitting, you confirm you are the verified litigant of this closed matter. Reviews are moderated for objective professional conduct.
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Publishing...' : 'Publish Verified Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
