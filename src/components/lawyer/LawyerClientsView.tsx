import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  ArrowRight,
  MessageSquare,
  Clock,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { LegalCase, LawyerProfile } from '../../types.js';
import { api } from '../../services/api.js';
import {
  Card,
  Button,
  Badge,
  Input,
  EmptyState,
  LoadingState
} from '../ui/index.js';

interface LawyerClientsViewProps {
  lawyer: LawyerProfile;
  onOpenCaseRoom: (caseId: string, tab?: string) => void;
  onNavigate: (view: string) => void;
}

interface ClientRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  activeCasesCount: number;
  closedCasesCount: number;
  totalCasesCount: number;
  latestCase?: LegalCase;
}

export const LawyerClientsView: React.FC<LawyerClientsViewProps> = ({
  lawyer,
  onOpenCaseRoom,
  onNavigate
}) => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getLawyerClients();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term) ||
      c.city.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <LoadingState message="Loading client registry and case history..." />
      </div>
    );
  }

  return (
    <div id="lawyer-clients-registry" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight">
            Client Registry ({clients.length})
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Directory of represented clients, active briefs, contact channels, and historical proceedings.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search clients by name, city, phone..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10 text-slate-400" />}
          title="No Represented Clients Found"
          description={
            searchFilter
              ? 'No client matched your search criteria. Try clearing the filter.'
              : 'Clients will appear here once you accept representation of incoming case inquiries.'
          }
          actionLabel={searchFilter ? 'Clear Search' : 'Review Incoming Inquiries'}
          onAction={() => {
            if (searchFilter) setSearchFilter('');
            else onNavigate('lawyer-requests');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} variant="default" className="p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-base font-serif shrink-0">
                    {client.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{client.fullName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {client.city}, {client.state}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Badge variant={client.activeCasesCount > 0 ? 'success' : 'neutral'} size="sm">
                    {client.activeCasesCount} Active Matter{client.activeCasesCount === 1 ? '' : 's'}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {client.id}</span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
              </div>

              {/* Latest Matter */}
              {client.latestCase ? (
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Latest Matter:</span>
                    <Badge variant="neutral" size="sm">Stage: {client.latestCase.stage}</Badge>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {client.latestCase.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>CNR: {client.latestCase.filingNumber || client.latestCase.caseNumber}</span>
                    <button
                      onClick={() => onOpenCaseRoom(client.latestCase!.id, 'chat')}
                      className="text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      <MessageSquare className="w-3 h-3" /> Open Privileged Chat
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Card Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  Total Cases: <strong>{client.totalCasesCount}</strong>
                </span>

                {client.latestCase && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenCaseRoom(client.latestCase!.id, 'overview')}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Open Case Room
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
