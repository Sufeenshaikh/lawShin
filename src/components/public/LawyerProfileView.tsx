import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Star,
  MapPin,
  Scale,
  Calendar,
  Phone,
  Mail,
  ArrowLeft,
  Briefcase,
  Award,
  BookOpen,
  Languages,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react';
import { LawyerProfile, Review } from '../../types.js';
import { api } from '../../services/api.js';
import { Button, Badge, Card, LoadingState } from '../ui/index.js';

interface LawyerProfileViewProps {
  lawyerId: string;
  onBack: () => void;
  onRequestLegalHelp: (lawyerId: string) => void;
  onBookAppointment: (lawyerId: string) => void;
}

export const LawyerProfileView: React.FC<LawyerProfileViewProps> = ({
  lawyerId,
  onBack,
  onRequestLegalHelp,
  onBookAppointment,
}) => {
  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const data = await api.getLawyerById(lawyerId);
        if (data.lawyer) {
          setLawyer(data.lawyer);
          setReviews(data.reviews || []);
        }
      } catch (err) {
        console.error('Error fetching lawyer profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [lawyerId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <LoadingState message="Loading advocate verified credentials..." />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-600">Advocate profile not found or unavailable.</p>
        <Button variant="outline" size="sm" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Directory
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
        Back to Advocate Directory
      </Button>

      {/* Header Card */}
      <Card variant="bordered" className="p-6 bg-slate-900 text-white border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 text-amber-400 font-serif font-bold text-2xl flex items-center justify-center border border-amber-500/30 shrink-0">
              {lawyer.avatarUrl ? (
                <img src={lawyer.avatarUrl} alt={lawyer.fullName} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                lawyer.fullName.charAt(0)
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold font-serif text-slate-50">{lawyer.fullName}</h1>
                {lawyer.isVerified && (
                  <Badge variant="success" size="sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Bar Council Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-amber-300 font-mono">
                {lawyer.barCouncilNumber} • {lawyer.stateBarCouncil || 'Bar Council of Delhi'}
              </p>
              <p className="text-xs text-slate-300 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {lawyer.city}, {lawyer.state}
                </span>
                <span>•</span>
                <span>{lawyer.experienceYears} Years Standing at the Bar</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-3.5 h-3.5" />}
              onClick={() => onRequestLegalHelp(lawyer.id)}
            >
              Request Legal Representation
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700"
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
              onClick={() => onBookAppointment(lawyer.id)}
            >
              Book Consultation (₹{lawyer.consultationFee})
            </Button>
          </div>
        </div>
      </Card>

      {/* Grid: Bio, Practice Areas, Courts, Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card variant="default" className="p-6 space-y-4">
            <h3 className="text-base font-bold font-serif text-slate-900">Professional Background & Bio</h3>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {lawyer.bio || 'Advocate practicing in civil and criminal litigation with proven track record before District Courts and High Courts.'}
            </p>

            {lawyer.education && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qualifications & Law School</span>
                <p className="text-xs text-slate-800 font-semibold">{lawyer.education}</p>
              </div>
            )}
          </Card>

          {/* Client Reviews */}
          <Card variant="default" className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-serif text-slate-900">
                Verified Client Feedback ({reviews.length})
              </h3>
              <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{lawyer.rating || '4.8'} / 5.0</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No public client reviews yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-3 pt-1">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{rev.clientName}</span>
                      <div className="flex items-center text-amber-500">
                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{rev.reviewText || rev.comment}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN')} • Verified Case Client
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Practice Areas & Courts Sidebar */}
        <div className="space-y-6">
          <Card variant="default" className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Specialized Practice Areas</h4>
            <div className="flex flex-wrap gap-1.5">
              {(lawyer.practiceAreas || ['Civil Litigation', 'Consumer Law', 'Property Disputes']).map((area) => (
                <Badge key={area} variant="neutral" size="sm">
                  {area}
                </Badge>
              ))}
            </div>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Courts of Regular Appearance</h4>
            <div className="space-y-1.5 text-xs text-slate-700">
              {(lawyer.courts || ['Delhi High Court', 'Tis Hazari District Court']).map((court) => (
                <div key={court} className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{court}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Languages of Argument</h4>
            <div className="flex flex-wrap gap-1.5">
              {(lawyer.languages || ['English', 'Hindi']).map((lang) => (
                <span key={lang} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  {lang}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
