import React, { useState } from 'react';
import {
  Scale,
  Shield,
  User,
  Briefcase,
  SlidersHorizontal,
  ChevronDown,
  PlusCircle,
  LogOut,
  Sparkles,
  Search,
  MessageSquareText,
  Building2,
  FileText,
  CreditCard,
  Calendar,
  Bell
} from 'lucide-react';
import { UserRole, User as UserType } from '../../types.js';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: UserType | null;
  onSwitchUser: (userId: string) => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  onSubmitCaseClick: () => void;
  availableUsers: UserType[];
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onSwitchUser,
  onOpenAuth,
  onLogout,
  onSubmitCaseClick,
  availableUsers
}) => {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'lawyer':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">Advocate</span>;
      case 'admin':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">Admin</span>;
      case 'client':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">Client</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-semibold px-2 py-0.5 rounded-full">Guest</span>;
    }
  };

  return (
    <header id="counselia-main-header" className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <button
              id="brand-logo-btn"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-amber-400 shadow-sm group-hover:bg-slate-900 transition-colors">
                <Scale className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-950 font-serif">Counsel<span className="text-amber-600">ia</span></span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">IN</span>
                </div>
                <p className="text-[10px] text-slate-700 font-medium tracking-wide">Legal Redressal & Verified Advocates</p>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-700">
              <button
                id="nav-home"
                onClick={() => onNavigate('home')}
                className={`px-3 py-2 rounded-md transition-colors ${currentView === 'home' ? 'text-amber-800 bg-amber-50 font-semibold' : 'hover:text-slate-950 hover:bg-slate-100'}`}
              >
                Home
              </button>
              <button
                id="nav-find-lawyer"
                onClick={() => onNavigate('find-lawyer')}
                className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${currentView === 'find-lawyer' ? 'text-amber-800 bg-amber-50 font-semibold' : 'hover:text-slate-950 hover:bg-slate-100'}`}
              >
                <Search className="w-3.5 h-3.5" />
                Find a Lawyer
              </button>
              <button
                id="nav-find-firm"
                onClick={() => onNavigate('find-firm')}
                className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${currentView === 'find-firm' ? 'text-amber-800 bg-amber-50 font-semibold' : 'hover:text-slate-950 hover:bg-slate-100'}`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Law Firms
              </button>
              <button
                id="nav-queries"
                onClick={() => onNavigate('queries')}
                className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${currentView === 'queries' ? 'text-amber-800 bg-amber-50 font-semibold' : 'hover:text-slate-950 hover:bg-slate-100'}`}
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                Anonymous Q&A
              </button>
              <button
                id="nav-reviews"
                onClick={() => onNavigate('reviews')}
                className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${currentView === 'reviews' ? 'text-amber-800 bg-amber-50 font-semibold' : 'hover:text-slate-950 hover:bg-slate-100'}`}
              >
                Reviews
              </button>
              <button
                id="nav-about"
                onClick={() => onNavigate('about')}
                className={`px-3 py-2 rounded-md transition-colors ${currentView === 'about' ? 'text-amber-800 bg-amber-50 font-semibold' : 'hover:text-slate-950 hover:bg-slate-100'}`}
              >
                About Us
              </button>

              {/* Role specific quick portal links */}
              {currentUser?.role === 'lawyer' && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                  <button
                    id="nav-lawyer-dashboard"
                    onClick={() => onNavigate('lawyer-dashboard')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${currentView === 'lawyer-dashboard' ? 'bg-amber-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                  <button
                    id="nav-lawyer-requests"
                    onClick={() => onNavigate('lawyer-requests')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${currentView === 'lawyer-requests' ? 'bg-amber-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    Requests
                  </button>
                  <button
                    id="nav-lawyer-cases"
                    onClick={() => onNavigate('lawyer-cases')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${currentView === 'lawyer-cases' ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    Cases
                  </button>
                  <button
                    id="nav-lawyer-clients"
                    onClick={() => onNavigate('lawyer-clients')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${currentView === 'lawyer-clients' ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    Clients
                  </button>
                  <button
                    id="nav-lawyer-research"
                    onClick={() => onNavigate('lawyer-legal-research')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${currentView === 'lawyer-legal-research' || currentView === 'judgment-search' ? 'bg-amber-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    Legal Research
                  </button>
                  <button
                    id="nav-lawyer-drafting"
                    onClick={() => onNavigate('lawyer-drafting')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${currentView === 'lawyer-drafting' || currentView === 'ai-drafting' ? 'bg-amber-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    AI Drafting
                  </button>
                  <button
                    id="nav-lawyer-drafts"
                    onClick={() => onNavigate('lawyer-drafts')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer ${currentView === 'lawyer-drafts' ? 'bg-amber-800 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Drafts
                  </button>
                  <button
                    id="nav-lawyer-profile"
                    onClick={() => onNavigate('lawyer-profile-manage')}
                    title="Advocate Profile"
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center justify-center ${currentView === 'lawyer-profile-manage' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              )}

              {currentUser?.role === 'client' && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                  <button
                    id="nav-client-dashboard"
                    onClick={() => onNavigate('client-dashboard')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${currentView === 'client-dashboard' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
                  >
                    Dashboard
                  </button>
                  <button
                    id="nav-client-cases"
                    onClick={() => onNavigate('client-cases')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${currentView === 'client-cases' ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    My Cases
                  </button>
                  <button
                    id="nav-client-appointments"
                    onClick={() => onNavigate('client-appointments')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${currentView === 'client-appointments' || currentView === 'client-consultations' ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Appointments
                  </button>
                  <button
                    id="nav-client-payments"
                    onClick={() => onNavigate('client-payments')}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${currentView === 'client-payments' ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-100'}`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Payments
                  </button>
                  <button
                    id="nav-client-notifications"
                    onClick={() => onNavigate('client-notifications')}
                    title="Notifications"
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center justify-center ${currentView === 'client-notifications' ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    id="nav-client-profile"
                    onClick={() => onNavigate('client-profile')}
                    title="Profile"
                    className={`p-1.5 rounded-md text-xs font-semibold flex items-center justify-center ${currentView === 'client-profile' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              )}

              {currentUser?.role === 'admin' && (
                <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200">
                  <button
                    id="nav-admin-dashboard"
                    onClick={() => onNavigate('admin-dashboard')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${currentView === 'admin-dashboard' ? 'bg-purple-900 text-white' : 'bg-purple-50 text-purple-900 hover:bg-purple-100'}`}
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    Admin Portal
                  </button>
                </div>
              )}
            </nav>
          </div>

          {/* Right Actions & Role Switcher */}
          <div className="flex items-center gap-3">
            {/* Primary Submit Case CTA */}
            <button
              id="header-submit-case-btn"
              onClick={onSubmitCaseClick}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Legal Case
            </button>

            {/* Switch Account / Role Selector Demo Dropdown */}
            <div className="relative">
              <button
                id="role-switcher-dropdown-btn"
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-medium text-slate-800 transition-colors"
                title="Switch active persona for demonstration"
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 overflow-hidden">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 text-xs truncate max-w-[110px]">
                      {currentUser?.name || 'Guest User'}
                    </span>
                    {getRoleBadge(currentUser?.role)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isRoleMenuOpen && (
                <div
                  id="role-switcher-popover"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs"
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                      Role & Persona Switcher
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Switch accounts instantly to test Client, Advocate, and Administrator capabilities.
                    </p>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                      Demo User Profiles
                    </div>
                    {availableUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u.id);
                          setIsRoleMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors ${
                          currentUser?.id === u.id ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200" />
                          <div className="truncate">
                            <p className={`font-semibold truncate ${currentUser?.id === u.id ? 'text-amber-900' : 'text-slate-800'}`}>
                              {u.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="shrink-0 ml-2">{getRoleBadge(u.role)}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        onOpenAuth();
                        setIsRoleMenuOpen(false);
                      }}
                      className="w-full py-1.5 text-center text-slate-700 hover:text-slate-900 font-semibold rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Sign In / Register Another Account
                    </button>
                    {currentUser && onLogout && (
                      <button
                        onClick={() => {
                          onLogout();
                          setIsRoleMenuOpen(false);
                        }}
                        className="w-full py-1.5 flex items-center justify-center gap-1.5 text-rose-700 hover:bg-rose-50 font-semibold rounded transition-colors text-xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Log Out of Session
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!currentUser && (
              <button
                onClick={onOpenAuth}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-xs font-semibold text-slate-800"
              >
                <User className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 flex flex-col gap-1 text-sm font-medium text-slate-700">
            <button
              onClick={() => { onNavigate('home'); setIsMobileMenuOpen(false); }}
              className="px-3 py-2 text-left hover:bg-slate-50 rounded"
            >
              Home
            </button>
            <button
              onClick={() => { onNavigate('find-lawyer'); setIsMobileMenuOpen(false); }}
              className="px-3 py-2 text-left hover:bg-slate-50 rounded"
            >
              Find a Lawyer
            </button>
            <button
              onClick={() => { onNavigate('find-firm'); setIsMobileMenuOpen(false); }}
              className="px-3 py-2 text-left hover:bg-slate-50 rounded"
            >
              Law Firms
            </button>
            <button
              onClick={() => { onNavigate('queries'); setIsMobileMenuOpen(false); }}
              className="px-3 py-2 text-left hover:bg-slate-50 rounded"
            >
              Anonymous Legal Q&A
            </button>
            <button
              onClick={() => { onNavigate('reviews'); setIsMobileMenuOpen(false); }}
              className="px-3 py-2 text-left hover:bg-slate-50 rounded"
            >
              Reviews & Ratings
            </button>
            <button
              onClick={() => { onNavigate('about'); setIsMobileMenuOpen(false); }}
              className="px-3 py-2 text-left hover:bg-slate-50 rounded"
            >
              About Us
            </button>
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => { onSubmitCaseClick(); setIsMobileMenuOpen(false); }}
                className="w-full py-2 bg-amber-600 text-white rounded font-bold text-center"
              >
                Submit Legal Case
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
