import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Award,
  BookOpen,
  MapPin,
  Scale,
  Calendar,
  DollarSign,
  Languages,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Camera,
  Save
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

interface LawyerProfileViewProps {
  initialLawyer: LawyerProfile;
  onNavigate: (view: string) => void;
  onProfileUpdated?: (updated: LawyerProfile) => void;
}

export const LawyerProfileView: React.FC<LawyerProfileViewProps> = ({
  initialLawyer,
  onNavigate,
  onProfileUpdated
}) => {
  const [lawyer, setLawyer] = useState<LawyerProfile>(initialLawyer);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState(initialLawyer.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(initialLawyer.avatarUrl || '');
  const [barCouncilNumber, setBarCouncilNumber] = useState(initialLawyer.barCouncilNumber || '');
  const [stateBarCouncil, setStateBarCouncil] = useState(initialLawyer.stateBarCouncil || '');
  const [experienceYears, setExperienceYears] = useState(String(initialLawyer.experienceYears || ''));
  const [practiceAreasInput, setPracticeAreasInput] = useState((initialLawyer.practiceAreas || []).join(', '));
  const [courtsInput, setCourtsInput] = useState((initialLawyer.courts || []).join(', '));
  const [languagesInput, setLanguagesInput] = useState((initialLawyer.languages || []).join(', '));
  const [bio, setBio] = useState(initialLawyer.bio || '');
  const [education, setEducation] = useState(initialLawyer.education || '');
  const [consultationFee, setConsultationFee] = useState(String(initialLawyer.consultationFee || ''));
  const [city, setCity] = useState(initialLawyer.city || '');
  const [state, setState] = useState(initialLawyer.state || '');

  useEffect(() => {
    loadFreshProfile();
  }, []);

  const loadFreshProfile = async () => {
    try {
      const data = await api.getLawyerProfile();
      if (data.lawyer) {
        setLawyer(data.lawyer);
        setFullName(data.lawyer.fullName);
        setAvatarUrl(data.lawyer.avatarUrl || '');
        setBarCouncilNumber(data.lawyer.barCouncilNumber);
        setStateBarCouncil(data.lawyer.stateBarCouncil);
        setExperienceYears(String(data.lawyer.experienceYears));
        setPracticeAreasInput((data.lawyer.practiceAreas || []).join(', '));
        setCourtsInput((data.lawyer.courts || []).join(', '));
        setLanguagesInput((data.lawyer.languages || []).join(', '));
        setBio(data.lawyer.bio || '');
        setEducation(data.lawyer.education || '');
        setConsultationFee(String(data.lawyer.consultationFee));
        setCity(data.lawyer.city);
        setState(data.lawyer.state);
      }
    } catch (err) {
      console.error('Error fetching lawyer profile:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const practiceAreas = practiceAreasInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const courts = courtsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const languages = languagesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await api.updateLawyerProfile({
        fullName,
        avatarUrl,
        barCouncilNumber,
        stateBarCouncil,
        experienceYears: Number(experienceYears) || lawyer.experienceYears,
        practiceAreas,
        courts,
        languages,
        bio,
        education,
        consultationFee: Number(consultationFee) || lawyer.consultationFee,
        city,
        state
      });

      if (res.success && res.lawyer) {
        setLawyer(res.lawyer);
        setSuccessMessage('Advocate credentials and public bio saved successfully.');
        if (onProfileUpdated) onProfileUpdated(res.lawyer);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update lawyer profile');
    } finally {
      setSaving(false);
    }
  };

  const isVerified = lawyer.isVerified && lawyer.verificationStatus === 'verified';

  return (
    <div id="lawyer-profile-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header with Verification Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">
            Advocate Profile & Practicing Credentials
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Your credentials, practice areas, courts of standing, and Bar Council verification status.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('lawyer-verification')}
          leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
        >
          Manage Bar Council Verification
        </Button>
      </div>

      {successMessage && (
        <Alert variant="success" title="Changes Recorded">
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="danger" title="Update Error">
          {errorMessage}
        </Alert>
      )}

      {/* Verification Status Alert Banner */}
      <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
        isVerified
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : lawyer.verificationStatus === 'rejected'
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          {isVerified ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
          ) : lawyer.verificationStatus === 'rejected' ? (
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-amber-600 shrink-0" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">
                Status:{' '}
                {isVerified
                  ? 'Verified Practicing Advocate (Bar Council Approved)'
                  : lawyer.verificationStatus === 'rejected'
                  ? 'Verification Declined - Action Required'
                  : 'Pending Bar Council Verification'}
              </span>
              <Badge
                variant={isVerified ? 'success' : lawyer.verificationStatus === 'rejected' ? 'danger' : 'warning'}
                size="sm"
              >
                {lawyer.verificationStatus || (isVerified ? 'verified' : 'pending')}
              </Badge>
            </div>
            <p className="text-xs opacity-90 mt-0.5">
              {isVerified
                ? 'Your profile is officially approved and visible to clients in the public Lawyer Directory.'
                : lawyer.verificationStatus === 'rejected'
                ? 'Your enrollment certificate could not be confirmed. Please re-submit valid credentials.'
                : 'Your enrollment record is under review. Only verified lawyers appear in the public directory.'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('lawyer-verification')}
          className="shrink-0 bg-white"
        >
          Check Status
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card variant="default" className="p-6 sm:p-7 space-y-6">
          <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-3">
            Primary Identification & Photograph
          </h2>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative shrink-0">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=200'}
                alt={fullName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center text-white shadow">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name (with Advocate Title)"
                  placeholder="e.g. Adv. Rajesh Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  label="Photo URL (Secure Cloud Hosted)"
                  placeholder="https://images.unsplash.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                <span>Quick Photo Avatars:</span>
                <button
                  type="button"
                  onClick={() => setAvatarUrl('https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=200')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
                >
                  Counsel 1
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarUrl('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
                >
                  Counsel 2
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarUrl('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200')}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
                >
                  Counsel 3
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Bar Council Credentials */}
        <Card variant="default" className="p-6 sm:p-7 space-y-4">
          <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-3">
            Bar Council Registration & Jurisdiction
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bar Council Enrolment Number"
              placeholder="e.g. D/1842/2012"
              value={barCouncilNumber}
              onChange={(e) => setBarCouncilNumber(e.target.value)}
              required
            />
            <Input
              label="State Bar Council"
              placeholder="e.g. Bar Council of Delhi"
              value={stateBarCouncil}
              onChange={(e) => setStateBarCouncil(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Years of Active Practice Standing"
              type="number"
              min={1}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              required
            />
            <Input
              label="City"
              placeholder="e.g. New Delhi"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="State"
              placeholder="e.g. Delhi"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
          </div>
        </Card>

        {/* Practice Areas, Courts & Education */}
        <Card variant="default" className="p-6 sm:p-7 space-y-4">
          <h2 className="text-base font-bold font-serif text-slate-900 border-b border-slate-200 pb-3">
            Practice Specialization & Courts of Standing
          </h2>

          <Input
            label="Practice Areas (Comma-separated)"
            placeholder="Civil Litigation, Real Estate RERA, Cheque Bounce (Sec 138 NI Act), Arbitration, Consumer Disputes"
            value={practiceAreasInput}
            onChange={(e) => setPracticeAreasInput(e.target.value)}
          />

          <Input
            label="Courts of Regular Practice (Comma-separated)"
            placeholder="Supreme Court of India, High Court of Delhi, Tis Hazari Courts, Saket District Courts"
            value={courtsInput}
            onChange={(e) => setCourtsInput(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Educational Qualifications"
              placeholder="e.g. B.A. LL.B. (Hons.), LL.M. (Commercial Law)"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />
            <Input
              label="Initial Consultation Retainer Fee (₹ INR)"
              type="number"
              placeholder="e.g. 2500"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
            />
          </div>

          <Input
            label="Languages for Client Consultation (Comma-separated)"
            placeholder="English, Hindi, Punjabi"
            value={languagesInput}
            onChange={(e) => setLanguagesInput(e.target.value)}
          />

          <Textarea
            label="About / Professional Bio"
            placeholder="Summarize your courtroom litigation experience, landmark cases argued, and advisory background..."
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={saving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Advocate Profile
          </Button>
        </div>
      </form>
    </div>
  );
};
