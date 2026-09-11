import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, UserCheck, MessageSquare, ArrowRight, Scale } from 'lucide-react';
import { Review } from '../../types.js';
import { api } from '../../services/api.js';
import { Card, Badge, Button, LoadingState } from '../ui/index.js';

interface ReviewsRatingsViewProps {
  onSelectLawyer: (lawyerId: string) => void;
}

export const ReviewsRatingsView: React.FC<ReviewsRatingsViewProps> = ({ onSelectLawyer }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const data = await api.getReviews();
        setReviews(data.reviews || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge variant="primary" size="sm">
          Verified Case Client Feedback
        </Badge>
        <h1 className="text-3xl font-bold font-serif text-slate-900">
          Client Experiences & Advocate Ratings
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Reviews are submitted by verified clients upon formal matter conclusion and protected from commercial solicitation.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Loading verified client reviews..." />
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-200 p-8 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700 text-sm">No verified reviews recorded yet.</p>
          <p className="text-xs text-slate-500">Reviews are published only after a case reaches closed stage.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((rev) => (
            <Card key={rev.id} variant="default" className="p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{rev.reviewText || rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 text-xs">{rev.clientName}</p>
                  <p className="text-[10px] text-emerald-700 flex items-center gap-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Case Client
                  </p>
                </div>

                {rev.lawyerId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-700 hover:text-amber-800 p-1 text-xs"
                    onClick={() => onSelectLawyer(rev.lawyerId!)}
                  >
                    View Advocate
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
