import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  PlusCircle,
  MapPin,
  AlertCircle,
  XCircle,
  User,
  Check,
  AlertTriangle,
  RotateCcw,
  Navigation,
  DollarSign
} from 'lucide-react';
import { Appointment, LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';

interface ClientAppointmentsViewProps {
  lawyers: LawyerProfile[];
  preselectedLawyerId?: string;
  onBookSuccess?: () => void;
}

const DEFAULT_CHAMBER_ADDRESSES: Record<string, string> = {
  lawyer_1: 'Chamber No. 412, Lawyers Chambers Block, Saket District Court, New Delhi - 110017',
  lawyer_2: 'Chamber No. 208, Patiala House Courts Complex, India Gate, New Delhi - 110001',
  lawyer_3: 'Chamber No. 518, Delhi High Court Chambers Extension Block, Sher Shah Road, New Delhi - 110503'
};

export const ClientAppointmentsView: React.FC<ClientAppointmentsViewProps> = ({
  lawyers,
  preselectedLawyerId,
  onBookSuccess
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled'>('All');
  const [modalOpen, setModalOpen] = useState(!!preselectedLawyerId);

  // Form State
  const [selectedLawyerId, setSelectedLawyerId] = useState(
    preselectedLawyerId || (lawyers[0]?.id || 'lawyer_1')
  );

  // Default to tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(tomorrowStr);
  const [timeSlot, setTimeSlot] = useState('02:00 PM - 02:45 PM');
  const [locationType, setLocationType] = useState<'chamber' | 'court' | 'custom'>('chamber');
  const [customLocation, setCustomLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Lawyer Availability State
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<
    {
      timeSlot: string;
      isAvailable: boolean;
      status: 'Available' | 'Requested' | 'Confirmed';
      clientName?: string;
    }[]
  >([]);

  // Cancel Modal State
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load appointments
  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await api.getAppointments();
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Fetch lawyer's available slots when lawyer or date changes
  useEffect(() => {
    if (!selectedLawyerId || !date) return;

    const fetchAvailability = async () => {
      try {
        setAvailabilityLoading(true);
        const res = await api.getLawyerAvailability(selectedLawyerId, date);
        setAvailableSlots(res.slots || []);

        // If currently selected time slot is taken, auto-select first available
        const currentSlotData = res.slots.find((s) => s.timeSlot === timeSlot);
        if (currentSlotData && !currentSlotData.isAvailable) {
          const firstFree = res.slots.find((s) => s.isAvailable);
          if (firstFree) {
            setTimeSlot(firstFree.timeSlot);
          }
        }
      } catch (err) {
        console.error('Failed to fetch advocate availability:', err);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [selectedLawyerId, date]);

  const currentLawyer = lawyers.find((l) => l.id === selectedLawyerId) || lawyers[0];
  const lawyerChamber =
    currentLawyer?.chamberAddress ||
    DEFAULT_CHAMBER_ADDRESSES[selectedLawyerId] ||
    'Chamber No. 412, Lawyers Chambers Block, Saket District Court, New Delhi';

  // Submit new offline consultation
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Conflict safety check in client UI
    const slotCheck = availableSlots.find((s) => s.timeSlot === timeSlot);
    if (slotCheck && !slotCheck.isAvailable) {
      setFormError(
        `Scheduling Conflict: This slot is already marked ${slotCheck.status.toUpperCase()}. Please select an available slot.`
      );
      return;
    }

    let finalLocation = lawyerChamber;
    if (locationType === 'court') {
      finalLocation = `Advocates Consultation Room, ${currentLawyer?.city || 'Delhi'} Court Complex`;
    } else if (locationType === 'custom') {
      if (!customLocation.trim()) {
        setFormError('Please provide the physical meeting address or chamber location.');
        return;
      }
      finalLocation = customLocation.trim();
    }

    setBooking(true);
    try {
      await api.createAppointment({
        lawyerId: selectedLawyerId,
        date,
        timeSlot,
        location: finalLocation,
        locationType,
        mode: 'Offline Chamber Meeting',
        notes: notes.trim() || 'Offline Chamber consultation regarding legal strategy and rights.',
        fee: currentLawyer?.consultationFee || 1500
      });

      setModalOpen(false);
      setNotes('');
      setCustomLocation('');
      await loadAppointments();
      if (onBookSuccess) onBookSuccess();
    } catch (err: any) {
      setFormError(err.message || 'Failed to book offline appointment. Please verify scheduling.');
    } finally {
      setBooking(false);
    }
  };

  // Handle status updates (e.g. Cancel by client, or Confirm/Complete)
  const handleUpdateStatus = async (
    apptId: string,
    newStatus: 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled',
    reason?: string
  ) => {
    try {
      setActionLoading(true);
      await api.updateAppointmentStatus(apptId, newStatus, reason);
      await loadAppointments();
      setCancellingAppt(null);
      setCancelReason('');
    } catch (err: any) {
      alert(err.message || 'Failed to update consultation status');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((a) => {
    if (statusFilter === 'All') return true;
    return a.status === statusFilter;
  });

  // Count states
  const counts = {
    total: appointments.length,
    requested: appointments.filter((a) => a.status === 'Requested').length,
    confirmed: appointments.filter((a) => a.status === 'Confirmed').length,
    completed: appointments.filter((a) => a.status === 'Completed').length,
    cancelled: appointments.filter((a) => a.status === 'Cancelled').length
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'Requested':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Requested (Pending Confirmation)
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Confirmed (Chamber Booked)
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
            <Check className="w-3 h-3 text-blue-600" />
            Completed Consultation
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 text-slate-500" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="client-appointments-view" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-amber-700" />
            Offline Chamber Consultations
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            In-Person Advocate Consultations
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Book structured, face-to-face offline consultations at an advocate’s official court chamber or judicial complex.
            Scheduling conflicts are strictly prevented across advocate calendars.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer shrink-0 transition-colors"
          id="btn-book-offline-consultation"
        >
          <PlusCircle className="w-4 h-4" />
          Book Offline Consultation
        </button>
      </div>

      {/* State Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        {(['All', 'Requested', 'Confirmed', 'Completed', 'Cancelled'] as const).map((tab) => {
          const count =
            tab === 'All'
              ? counts.total
              : tab === 'Requested'
              ? counts.requested
              : tab === 'Confirmed'
              ? counts.confirmed
              : tab === 'Completed'
              ? counts.completed
              : counts.cancelled;

          const isActive = statusFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs">
          <Clock className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
          Loading consultation records...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            {statusFilter === 'All'
              ? 'No Offline Consultations Scheduled'
              : `No ${statusFilter} Consultations`}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Schedule an offline chamber briefing with designated counsel to examine physical documents, draft pleadings, or prepare court hearings.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-amber-700 text-white font-semibold text-xs rounded-lg hover:bg-amber-800"
          >
            Schedule Consultation Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
              id={`appointment-card-${apt.id}`}
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base font-serif">
                        {apt.lawyerName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {apt.caseTitle || 'Offline Chamber Consultation & Strategy'}
                    </p>
                  </div>
                  {getStatusBadge(apt.status)}
                </div>

                {/* Date & Time */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <Calendar className="w-4 h-4 text-amber-700" />
                      <span>{apt.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 font-semibold font-mono">
                      <Clock className="w-4 h-4 text-amber-700" />
                      <span>{apt.timeSlot}</span>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60 text-slate-600">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Meeting Location: </span>
                      <span>{apt.location || 'Advocate Chamber, District Court Complex'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {apt.notes && (
                  <div className="text-xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/50">
                    <span className="font-semibold text-amber-900">Consultation Focus: </span>
                    {apt.notes}
                  </div>
                )}

                {/* Cancellation Reason if cancelled */}
                {apt.status === 'Cancelled' && apt.cancellationReason && (
                  <div className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    <span className="font-semibold">Cancellation Note: </span>
                    {apt.cancellationReason}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-600 font-medium">
                  <span>Fee: </span>
                  <span className="font-bold text-slate-900">₹{(apt.fee || 1500).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex items-center gap-2">
                  {apt.status === 'Requested' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(apt.id, 'Confirmed')}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] shadow-xs flex items-center gap-1"
                        title="Advocate / Demo confirmation"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancellingAppt(apt)}
                        className="px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold text-[11px]"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {apt.status === 'Confirmed' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(apt.id, 'Completed')}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] shadow-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancellingAppt(apt)}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-[11px]"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {apt.status === 'Completed' && (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Consultation Concluded
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BOOK OFFLINE CONSULTATION */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Direct Chamber Booking
                </span>
                <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 mt-0.5">
                  Schedule Offline Legal Consultation
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Select Advocate */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  1. Select Advocate *
                </label>
                <select
                  value={selectedLawyerId}
                  onChange={(e) => setSelectedLawyerId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-amber-600"
                >
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} • {l.specialization || 'Advocate'} (Fee: ₹
                      {l.consultationFee.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Date */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  2. Select Consultation Date *
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              {/* 3. Select Time Slot with Live Conflict Prevention */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-800">
                    3. Select Time Slot (Conflict-Checked) *
                  </label>
                  {availabilityLoading && (
                    <span className="text-[10px] text-amber-700 animate-pulse">
                      Checking availability...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1">
                  {availableSlots.map((slot) => {
                    const isSelected = timeSlot === slot.timeSlot;
                    const isConflict = !slot.isAvailable;

                    return (
                      <button
                        key={slot.timeSlot}
                        type="button"
                        disabled={isConflict}
                        onClick={() => setTimeSlot(slot.timeSlot)}
                        className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                          isConflict
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                            : isSelected
                            ? 'bg-amber-50 border-amber-600 text-amber-900 ring-1 ring-amber-600 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-mono text-[11px]">{slot.timeSlot}</span>
                        <div className="mt-1 flex items-center justify-between">
                          {isConflict ? (
                            <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Booked
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Available
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Greyed-out slots are already reserved by other matters to prevent double booking.
                </p>
              </div>

              {/* 4. Select Location */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-800">
                  4. Consultation Location *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationType('chamber')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      locationType === 'chamber'
                        ? 'bg-amber-50 border-amber-600 text-amber-900 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                    Advocate Chamber
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationType('court')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      locationType === 'court'
                        ? 'bg-amber-50 border-amber-600 text-amber-900 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4 mx-auto mb-1 text-rose-700" />
                    Court Complex
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationType('custom')}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                      locationType === 'custom'
                        ? 'bg-amber-50 border-amber-600 text-amber-900 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Navigation className="w-4 h-4 mx-auto mb-1 text-blue-700" />
                    Custom Venue
                  </button>
                </div>

                {locationType === 'chamber' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                    <strong className="text-slate-900">Official Chamber Address: </strong>
                    {lawyerChamber}
                  </div>
                )}

                {locationType === 'court' && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                    <strong className="text-slate-900">Jurisdictional Meeting Point: </strong>
                    Advocates Consultation Lounge, {currentLawyer?.city || 'Delhi'} District / High Court Complex.
                  </div>
                )}

                {locationType === 'custom' && (
                  <div>
                    <input
                      type="text"
                      placeholder="Specify office address, chamber number, or landmark..."
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 5. Notes */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  5. Brief Consultation Objectives (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. In-person review of disputed property documents and written statement drafting."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Fee notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-amber-900 font-medium">Consultation Fee:</span>
                <span className="font-bold text-amber-950 font-mono text-sm">
                  ₹{(currentLawyer?.consultationFee || 1500).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={booking}
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                >
                  {booking ? 'Scheduling...' : 'Confirm Offline Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CANCEL APPOINTMENT */}
      {/* ========================================================================= */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 text-xs space-y-4">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              Cancel Consultation
            </div>
            <p className="text-slate-600">
              Are you sure you want to cancel the offline consultation with{' '}
              <strong className="text-slate-900">{cancellingAppt.lawyerName}</strong> scheduled on{' '}
              <strong className="text-slate-900">{cancellingAppt.date}</strong> at{' '}
              <strong className="text-slate-900">{cancellingAppt.timeSlot}</strong>?
            </p>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule clash, matter settled, or rescheduled to later date..."
                className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingAppt(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  handleUpdateStatus(cancellingAppt.id, 'Cancelled', cancelReason.trim() || undefined)
                }
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
