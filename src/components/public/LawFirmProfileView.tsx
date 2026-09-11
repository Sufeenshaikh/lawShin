import React, { useState, useEffect } from 'react';
import {
  Building,
  ShieldCheck,
  MapPin,
  Scale,
  Phone,
  Mail,
  ArrowLeft,
  Users,
  Award,
  Calendar,
  Send,
  ExternalLink
} from 'lucide-react';
import { LawFirm, LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';
import { Button, Badge, Card, LoadingState } from '../ui/index.js';

interface LawFirmProfileViewProps {
  firmId: string;
  onBack: () => void;
  onSubmitMatterToFirm: () => void;
  onSelectLawyer: (lawyerId: string) => void;
}

export const LawFirmProfileView: React.FC<LawFirmProfileViewProps> = ({
  firmId,
  onBack,
  onSubmitMatterToFirm,
  onSelectLawyer,
}) => {
  const [firm, setFirm] = useState<LawFirm | null>(null);
  const [partners, setPartners] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFirm = async () => {
      setLoading(true);
      try {
        const data = await api.getLawFirmById(firmId);
        if (data.lawFirm) {
          setFirm(data.lawFirm);
          setPartners(data.lawyers || []);
        }
      } catch (err) {
        console.error('Error fetching law firm profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFirm();
  }, [firmId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <LoadingState message="Loading law firm credentials..." />
      </div>
    );
  }

  if (!firm) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-600">Law firm profile not found or unavailable.</p>
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Law Firms
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        className="text-slate-600"
      >
        Back to Law Firms Directory
      </Button>

      {/* Header Card */}
      <Card variant="bordered" className="p-6 bg-slate-900 text-white border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 text-amber-400 font-serif font-bold text-2xl flex items-center justify-center border border-amber-500/30 shrink-0">
              <Building className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-serif text-slate-50">{firm.name}</h1>
                {firm.isVerified && (
                  <Badge variant="success" size="sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Verified Legal Practice
                  </Badge>
                )}
              </div>
              <p className="text-xs text-amber-300 font-mono">
                Registration: {firm.registrationNumber || 'LLP-DEL-2018-092'}
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {firm.address || `${firm.city}, ${firm.state}`}
                </span>
                <span>•</span>
                <span>Est. {firm.establishedYear || '2012'}</span>
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Send className="w-3.5 h-3.5" />}
            onClick={onSubmitMatterToFirm}
            className="shrink-0"
          >
            Submit Case to Firm
          </Button>
        </div>
      </Card>

      {/* Grid: Firm Overview & Partners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card variant="default" className="p-6 space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900">About the Firm & Practice Philosophy</h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {firm.description || 'Full-service law firm providing legal representation before Supreme Court of India, High Courts, NCLT, and District Courts.'}
            </p>
          </Card>

          {/* Firm Advocates / Partners */}
          <Card variant="default" className="p-6 space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900">
              Partners & Associate Advocates ({partners.length})
            </h3>
            {partners.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No partners listed yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {partners.map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{p.fullName}</h4>
                      <p className="text-[11px] text-slate-500">{p.experienceYears} Years Exp • {p.barCouncilNumber}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectLawyer(p.id)}
                    >
                      View Profile
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Practice Areas */}
        <div className="space-y-6">
          <Card variant="default" className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Practice Capabilities</h4>
            <div className="flex flex-wrap gap-1.5">
              {(firm.practiceAreas || ['Corporate Litigation', 'Arbitration', 'Real Estate', 'Banking & Debt']).map((area) => (
                <Badge key={area} variant="neutral" size="sm">
                  {area}
                </Badge>
              ))}
            </div>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Offices & Chambers</h4>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{firm.city}, {firm.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-mono text-[11px]">{firm.email || 'contact@lawfirm.in'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
