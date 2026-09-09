import React, { useState, useEffect } from 'react';
import { Calendar, Video, Phone, Building, Clock, CheckCircle, PlusCircle, ExternalLink } from 'lucide-react';
import { Appointment, LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';

interface ClientAppointmentsViewProps {
  lawyers: LawyerProfile[];
  preselectedLawyerId?: string;
  onBookSuccess?: () => void;
}

export const ClientAppointmentsView: React.FC<ClientAppointmentsViewProps> = ({
  lawyers,
  preselectedLawyerId,
  onBookSuccess
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(!!preselectedLawyerId);

  // Form
  const [lawyerId, setLawyerId] = useState(preselectedLawyerId || (lawyers[0]?.id || ''));
  const [date, setDate] = useState('2025-03-25');
  const [timeSlot, setTimeSlot] = useState('04:00 PM - 04:30 PM');
  const [mode, setMode] = useState<'Video Call' | 'Phone Call' | 'Chamber Meeting'>('Video Call');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const data = await api.getAppointments();
      setAppointments(data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    try {
      await api.createAppointment({
        lawyerId,
        date,
        timeSlot,
        mode,
        notes
      });
      setModalOpen(false);
      setNotes('');
      await loadAppointments();
      if (onBookSuccess) onBookSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div id="client-appointments-view" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Legal Consultations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            Scheduled Advocate Consultations
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            Connect directly with your advocate via secure video consultation, telephonic briefing, or chamber meeting.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Schedule Consultation
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-800 text-sm">No upcoming appointments</p>
          <p className="text-xs text-slate-500 mt-1">
            Book a 30-minute legal consultation to discuss strategy or review drafted documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{apt.lawyerName}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {apt.date} • {apt.timeSlot}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
                  {apt.mode === 'Video Call' && <Video className="w-4 h-4" />}
                  {apt.mode === 'Phone Call' && <Phone className="w-4 h-4" />}
                  {apt.mode === 'Chamber Meeting' && <Building className="w-4 h-4" />}
                </div>
              </div>

              {apt.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {apt.notes}
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Mode: {apt.mode}</span>
                {apt.meetingLink && (
                  <a
                    href={apt.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
                  >
                    Join Video Consultation <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Consultation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 text-xs">
            <h2 className="text-base font-bold font-serif text-slate-900 mb-1">
              Book Advocate Consultation
            </h2>
            <p className="text-slate-500 mb-4 text-xs">
              Select date, preferred consultation mode, and advocate.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Advocate</label>
                <select
                  value={lawyerId}
                  onChange={(e) => setLawyerId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} (₹{l.consultationFee.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Consultation Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Video Call', 'Phone Call', 'Chamber Meeting'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`p-2 rounded-lg border text-center font-semibold text-[11px] transition-colors ${
                        mode === m ? 'bg-amber-50 border-amber-600 text-amber-900' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                    <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                    <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                    <option value="06:00 PM - 06:30 PM">06:00 PM - 06:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Brief Notes for Advocate</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Want to discuss legal notice response received today"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {booking ? 'Scheduling...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
