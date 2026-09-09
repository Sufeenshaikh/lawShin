import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  MessageSquare,
  FileText,
  AlertCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { Notification } from '../../types.js';
import { api } from '../../services/api.js';

interface ClientNotificationsViewProps {
  onOpenCaseRoom: (caseId: string) => void;
  onNavigateAppointments: () => void;
  onNavigatePayments: () => void;
}

export const ClientNotificationsView: React.FC<ClientNotificationsViewProps> = ({
  onOpenCaseRoom,
  onNavigateAppointments,
  onNavigatePayments
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) {
      handleMarkRead(n.id);
    }
    if (n.entityType === 'case' && n.entityId) {
      onOpenCaseRoom(n.entityId);
    } else if (n.type === 'appointment') {
      onNavigateAppointments();
    } else if (n.type === 'payment') {
      onNavigatePayments();
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'case_update':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'new_message':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'appointment':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.isRead;
    return n.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div id="client-notifications-view" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Real-Time Feed
          </span>
          <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 mt-2">
            Legal Notifications & Activity Alerts
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Audit updates on hearings, courier dispatch logs, advocate notes, and milestone invoices.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-slate-500" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Alerts', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'case_update', label: 'Case Stages', count: notifications.filter((n) => n.type === 'case_update').length },
          { id: 'appointment', label: 'Hearings & Appointments', count: notifications.filter((n) => n.type === 'appointment').length },
          { id: 'payment', label: 'Payments', count: notifications.filter((n) => n.type === 'payment').length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filterType === tab.id
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterType === tab.id ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading legal notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Notifications</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You are all caught up. Hearing notices and advocate messages will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                !n.isRead ? 'bg-amber-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  !n.isRead ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {getNotificationIcon(n.type)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    )}
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed">
                    {n.content}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {!n.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(n.id);
                    }}
                    title="Mark as read"
                    className="text-slate-400 hover:text-slate-700 p-1 rounded"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
