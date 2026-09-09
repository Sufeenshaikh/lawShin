import React, { useState, useEffect } from 'react';
import { LegalDisclaimerBanner } from './components/common/LegalDisclaimerBanner.js';
import { Header } from './components/common/Header.js';
import { Footer } from './components/common/Footer.js';

// Public views
import { HomeView } from './components/public/HomeView.js';
import { FindLawyerView } from './components/public/FindLawyerView.js';
import { LawyerProfileView } from './components/public/LawyerProfileView.js';
import { FindLawFirmView } from './components/public/FindLawFirmView.js';
import { LawFirmProfileView } from './components/public/LawFirmProfileView.js';
import { AnonymousQueryView } from './components/public/AnonymousQueryView.js';
import { ReviewsRatingsView } from './components/public/ReviewsRatingsView.js';
import { AboutUsView } from './components/public/AboutUsView.js';
import { TermsConditionsView } from './components/public/TermsConditionsView.js';
import { PrivacyPolicyView } from './components/public/PrivacyPolicyView.js';
import { LegalDisclaimerView } from './components/public/LegalDisclaimerView.js';

// Client views
import { ClientDashboard } from './components/client/ClientDashboard.js';
import { SubmitCaseModal } from './components/client/SubmitCaseModal.js';
import { ClientPaymentsView } from './components/client/ClientPaymentsView.js';
import { ClientAppointmentsView } from './components/client/ClientAppointmentsView.js';
import { MyCasesView } from './components/client/MyCasesView.js';
import { NewCaseForm } from './components/client/NewCaseForm.js';
import { ClientProfileView } from './components/client/ClientProfileView.js';
import { ClientNotificationsView } from './components/client/ClientNotificationsView.js';

// Lawyer views
import { LawyerDashboard } from './components/lawyer/LawyerDashboard.js';
import { AIDraftingTool } from './components/lawyer/AIDraftingTool.js';
import { JudgmentSearchTool } from './components/lawyer/JudgmentSearchTool.js';

// Admin views
import { AdminDashboard } from './components/admin/AdminDashboard.js';

// Case Room
import { CaseRoomView } from './components/caseroom/CaseRoomView.js';

// Auth & Access Control
import { AuthModal } from './components/auth/AuthModal.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { UnauthorizedView } from './components/auth/UnauthorizedView.js';
import { ForbiddenView } from './components/auth/ForbiddenView.js';

// UI Design System
import { BottomNav } from './components/ui/index.js';
import { Home, Briefcase, Search, MessageSquare, PlusCircle } from 'lucide-react';

import { User, ClientProfile, LawyerProfile, LegalCase } from './types.js';
import { api, SessionData } from './services/api.js';

export function App() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>('home');
  const [viewParams, setViewParams] = useState<any>({});

  // Global data
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  // Modals
  const [submitCaseOpen, setSubmitCaseOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [preselectedLawyerId, setPreselectedLawyerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    initApp();

    // Hash listener for direct role routing: /client/*, /lawyer/*, /admin/*
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash || hash === '') {
        setCurrentView('home');
      } else if (hash.startsWith('client/')) {
        const sub = hash.replace('client/', '');
        if (sub === 'dashboard') {
          setCurrentView('client-dashboard');
        } else if (sub === 'cases/new') {
          setCurrentView('client-new-case');
        } else if (sub === 'cases' || sub === 'cases/') {
          setCurrentView('client-cases');
        } else if (sub.startsWith('cases/')) {
          const rest = sub.replace('cases/', '');
          const parts = rest.split('/');
          const cId = parts[0];
          const subTab = parts[1] || 'overview';
          setActiveCaseId(cId);
          setViewParams({ tab: subTab, caseId: cId });
          setCurrentView('case-room');
        } else if (sub === 'payments') {
          setCurrentView('client-payments');
        } else if (sub === 'appointments' || sub === 'consultations') {
          setCurrentView('client-appointments');
        } else if (sub === 'profile') {
          setCurrentView('client-profile');
        } else if (sub === 'notifications') {
          setCurrentView('client-notifications');
        } else {
          setCurrentView('client-dashboard');
        }
      } else if (hash.startsWith('lawyer/')) {
        const sub = hash.replace('lawyer/', '');
        if (sub === 'ai-drafting') setCurrentView('ai-drafting');
        else if (sub === 'judgment-search') setCurrentView('judgment-search');
        else setCurrentView('lawyer-dashboard');
      } else if (hash.startsWith('admin/')) {
        setCurrentView('admin-dashboard');
      } else if (hash.startsWith('case/')) {
        const rest = hash.replace('case/', '');
        const parts = rest.split('/');
        const cId = parts[0];
        const subTab = parts[1] || 'overview';
        setActiveCaseId(cId);
        setViewParams({ tab: subTab, caseId: cId });
        setCurrentView('case-room');
      } else if (hash.startsWith('lawyer-profile/')) {
        const lId = hash.replace('lawyer-profile/', '');
        setViewParams({ lawyerId: lId });
        setPreselectedLawyerId(lId);
        setCurrentView('lawyer-profile');
      } else if (hash.startsWith('firm-profile/')) {
        const fId = hash.replace('firm-profile/', '');
        setViewParams({ firmId: fId });
        setCurrentView('firm-profile');
      } else if (hash === 'unauthorized') {
        setCurrentView('unauthorized');
      } else if (hash === 'forbidden') {
        setCurrentView('forbidden');
      } else {
        setCurrentView(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (window.location.hash) {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      const [sessionData, casesData, lawyersData] = await Promise.all([
        api.getSession(),
        api.getCases().catch(() => ({ cases: [] })),
        api.getLawyers()
      ]);
      setSession(sessionData);
      setCases(casesData.cases);
      setLawyers(lawyersData.lawyers);
    } catch (err) {
      console.error('Initialization error', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshCases = async () => {
    try {
      const res = await api.getCases();
      setCases(res.cases);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await api.switchSession(userId);
      if (res.success) {
        const [newSession, newCases] = await Promise.all([
          api.getSession(),
          api.getCases().catch(() => ({ cases: [] }))
        ]);
        setSession(newSession);
        setCases(newCases.cases);

        // Intelligently redirect to role's primary view
        if (newSession.user?.role === 'client') {
          handleNavigate('client-dashboard');
        } else if (newSession.user?.role === 'lawyer') {
          handleNavigate('lawyer-dashboard');
        } else if (newSession.user?.role === 'admin') {
          handleNavigate('admin-dashboard');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = async (user: User) => {
    try {
      const [newSession, newCases] = await Promise.all([
        api.getSession(),
        api.getCases().catch(() => ({ cases: [] }))
      ]);
      setSession(newSession);
      setCases(newCases.cases);

      if (user.role === 'client') {
        handleNavigate('client-dashboard');
      } else if (user.role === 'lawyer') {
        handleNavigate('lawyer-dashboard');
      } else if (user.role === 'admin') {
        handleNavigate('admin-dashboard');
      }
    } catch (err) {
      console.error('Post-auth refresh error', err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setSession({
        user: null,
        clientProfile: null,
        lawyerProfile: null,
        availableUsers: session?.availableUsers || []
      });
      setCases([]);
      handleNavigate('home');
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavigate = (view: string, params?: any) => {
    setCurrentView(view);
    if (params) {
      setViewParams(params);
      if (params.lawyerId) {
        setPreselectedLawyerId(params.lawyerId);
      }
    } else {
      setViewParams({});
    }

    // Synchronize URL Hash for role routing
    let newHash = '';
    if (view === 'client-dashboard') newHash = '#/client/dashboard';
    else if (view === 'client-cases') newHash = '#/client/cases';
    else if (view === 'client-new-case') newHash = '#/client/cases/new';
    else if (view === 'client-appointments' || view === 'client-consultations') newHash = '#/client/appointments';
    else if (view === 'client-payments') newHash = '#/client/payments';
    else if (view === 'client-profile') newHash = '#/client/profile';
    else if (view === 'client-notifications') newHash = '#/client/notifications';
    else if (view === 'case-room') {
      const cId = params?.caseId || activeCaseId;
      const tab = params?.tab || viewParams?.tab;
      if (cId) {
        newHash = tab && tab !== 'overview' ? `#/client/cases/${cId}/${tab}` : `#/client/cases/${cId}`;
      } else {
        newHash = '#/client/cases';
      }
    }
    else if (view === 'lawyer-dashboard') newHash = '#/lawyer/dashboard';
    else if (view === 'ai-drafting') newHash = '#/lawyer/ai-drafting';
    else if (view === 'judgment-search') newHash = '#/lawyer/judgment-search';
    else if (view === 'admin-dashboard') newHash = '#/admin/dashboard';
    else if (view === 'unauthorized') newHash = '#/unauthorized';
    else if (view === 'forbidden') newHash = '#/forbidden';
    else if (view === 'lawyer-profile' && params?.lawyerId) newHash = `#/lawyer-profile/${params.lawyerId}`;
    else if (view === 'firm-profile' && params?.firmId) newHash = `#/firm-profile/${params.firmId}`;
    else if (view === 'home') newHash = '';
    else newHash = `#/${view}`;

    if (newHash) {
      window.history.pushState(null, '', newHash);
    } else {
      window.history.pushState(null, '', window.location.pathname);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCaseRoom = (caseId: string, subTab?: string) => {
    setActiveCaseId(caseId);
    const tab = subTab || 'overview';
    setViewParams({ tab, caseId });
    setCurrentView('case-room');
    const hash = tab && tab !== 'overview' ? `#/client/cases/${caseId}/${tab}` : `#/client/cases/${caseId}`;
    window.history.pushState(null, '', hash);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCaseSubmitted = async (newCaseId: string) => {
    await refreshCases();
    setActiveCaseId(newCaseId);
    setViewParams({ tab: 'overview', caseId: newCaseId });
    setCurrentView('case-room');
    window.history.pushState(null, '', `#/client/cases/${newCaseId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-slate-950 mb-4 animate-pulse">
          <span className="font-serif font-bold text-xl">LW</span>
        </div>
        <h2 className="font-serif font-bold text-lg text-white">LAWShin Legal-Tech Platform</h2>
        <p className="text-xs text-slate-500 mt-1">Connecting Citizens with Verified Indian Advocates...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Statutory Legal Disclaimer Banner */}
      <LegalDisclaimerBanner />

      {/* Main Header & Role Switcher */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={session?.user || null}
        onSwitchUser={handleSwitchUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onSubmitCaseClick={() => {
          setPreselectedLawyerId(undefined);
          setSubmitCaseOpen(true);
        }}
        availableUsers={session?.availableUsers || []}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentView === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onSubmitCaseClick={() => {
              setPreselectedLawyerId(undefined);
              setSubmitCaseOpen(true);
            }}
            featuredLawyers={lawyers}
          />
        )}

        {currentView === 'find-lawyer' && (
          <FindLawyerView
            initialPracticeArea={viewParams?.practiceArea || ''}
            initialCity={viewParams?.city || ''}
            onSelectLawyerForCase={(lawyerId) => {
              setPreselectedLawyerId(lawyerId);
              setSubmitCaseOpen(true);
            }}
            onBookAppointment={(lawyerId) => {
              setPreselectedLawyerId(lawyerId);
              handleNavigate('client-consultations');
            }}
            onViewProfile={(lawyerId) => {
              handleNavigate('lawyer-profile', { lawyerId });
            }}
          />
        )}

        {currentView === 'lawyer-profile' && (
          <LawyerProfileView
            lawyerId={viewParams?.lawyerId || lawyers[0]?.id || 'lawyer_01'}
            onBack={() => handleNavigate('find-lawyer')}
            onRequestLegalHelp={(lawyerId) => {
              setPreselectedLawyerId(lawyerId);
              setSubmitCaseOpen(true);
            }}
            onBookAppointment={(lawyerId) => {
              setPreselectedLawyerId(lawyerId);
              handleNavigate('client-consultations');
            }}
          />
        )}

        {currentView === 'find-firm' && (
          <FindLawFirmView
            onSubmitCaseClick={() => {
              setPreselectedLawyerId(undefined);
              setSubmitCaseOpen(true);
            }}
            onSelectFirm={(firmId) => {
              handleNavigate('firm-profile', { firmId });
            }}
          />
        )}

        {currentView === 'firm-profile' && (
          <LawFirmProfileView
            firmId={viewParams?.firmId || 'firm_01'}
            onBack={() => handleNavigate('find-firm')}
            onSubmitMatterToFirm={() => {
              setPreselectedLawyerId(undefined);
              setSubmitCaseOpen(true);
            }}
            onSelectLawyer={(lawyerId) => {
              handleNavigate('lawyer-profile', { lawyerId });
            }}
          />
        )}

        {currentView === 'queries' && (
          <AnonymousQueryView currentUser={session?.user || null} />
        )}

        {currentView === 'reviews' && (
          <ReviewsRatingsView
            onSelectLawyer={(lawyerId) => {
              handleNavigate('lawyer-profile', { lawyerId });
            }}
          />
        )}

        {currentView === 'about' && <AboutUsView />}

        {currentView === 'terms' && (
          <TermsConditionsView onBackToHome={() => handleNavigate('home')} />
        )}

        {currentView === 'privacy' && (
          <PrivacyPolicyView onBackToHome={() => handleNavigate('home')} />
        )}

        {currentView === 'disclaimer' && (
          <LegalDisclaimerView onBackToHome={() => handleNavigate('home')} />
        )}

        {/* CLIENT PORTAL VIEWS (Protected for role: client) */}
        {currentView === 'client-dashboard' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/dashboard"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <ClientDashboard
              cases={cases}
              onOpenCaseRoom={handleOpenCaseRoom}
              onSubmitCaseClick={() => {
                handleNavigate('client-new-case');
              }}
              onNavigate={handleNavigate}
              clientName={session?.user?.name || 'Citizen'}
            />
          </ProtectedRoute>
        )}

        {currentView === 'client-cases' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/cases"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <MyCasesView
              onOpenCaseRoom={handleOpenCaseRoom}
              onNavigateToNewCase={() => handleNavigate('client-new-case')}
              onNavigate={handleNavigate}
            />
          </ProtectedRoute>
        )}

        {currentView === 'client-new-case' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/cases/new"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <div className="max-w-4xl mx-auto px-4 py-8">
              <NewCaseForm
                onCaseCreated={handleCaseSubmitted}
                onCancel={() => handleNavigate('client-cases')}
              />
            </div>
          </ProtectedRoute>
        )}

        {(currentView === 'client-appointments' || currentView === 'client-consultations') && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/appointments"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <ClientAppointmentsView
              lawyers={lawyers}
              preselectedLawyerId={preselectedLawyerId}
              onBookSuccess={() => {}}
            />
          </ProtectedRoute>
        )}

        {currentView === 'client-payments' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/payments"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <ClientPaymentsView />
          </ProtectedRoute>
        )}

        {currentView === 'client-profile' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/profile"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <ClientProfileView onNavigate={handleNavigate} />
          </ProtectedRoute>
        )}

        {currentView === 'client-notifications' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['client']}
            attemptedPath="/client/notifications"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <ClientNotificationsView
              onOpenCaseRoom={handleOpenCaseRoom}
              onNavigate={handleNavigate}
            />
          </ProtectedRoute>
        )}

        {/* LAWYER PORTAL VIEWS (Protected for role: lawyer) */}
        {currentView === 'lawyer-dashboard' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['lawyer']}
            attemptedPath="/lawyer/dashboard"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            {session?.lawyerProfile ? (
              <LawyerDashboard
                lawyer={session.lawyerProfile}
                cases={cases}
                onOpenCaseRoom={handleOpenCaseRoom}
                onNavigate={handleNavigate}
                onRefreshCases={refreshCases}
              />
            ) : (
              <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <p className="text-slate-600">Lawyer profile details are being verified.</p>
              </div>
            )}
          </ProtectedRoute>
        )}

        {currentView === 'ai-drafting' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['lawyer']}
            attemptedPath="/lawyer/ai-drafting"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <AIDraftingTool
              cases={cases}
              onAttachToCase={() => {
                refreshCases();
              }}
            />
          </ProtectedRoute>
        )}

        {currentView === 'judgment-search' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['lawyer']}
            attemptedPath="/lawyer/judgment-search"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <JudgmentSearchTool />
          </ProtectedRoute>
        )}

        {/* ADMIN PORTAL VIEWS (Protected for role: admin) */}
        {currentView === 'admin-dashboard' && (
          <ProtectedRoute
            currentUser={session?.user || null}
            allowedRoles={['admin']}
            attemptedPath="/admin/dashboard"
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
          >
            <AdminDashboard onOpenCaseRoom={handleOpenCaseRoom} />
          </ProtectedRoute>
        )}

        {/* EXPLICIT ERROR VIEWS */}
        {currentView === 'unauthorized' && (
          <UnauthorizedView
            attemptedRoute={viewParams?.attemptedRoute || '/client/dashboard'}
            onLoginClick={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('home')}
          />
        )}

        {currentView === 'forbidden' && (
          <ForbiddenView
            currentRole={session?.user?.role}
            requiredRole={viewParams?.requiredRole}
            onNavigateHome={() => handleNavigate('home')}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
            reason={viewParams?.reason}
          />
        )}

        {/* PRIVATE CASE ROOM VIEW (Server & Client Authorized) */}
        {currentView === 'case-room' && activeCaseId && (
          <CaseRoomView
            caseId={activeCaseId}
            currentUser={session?.user || null}
            initialTab={viewParams?.tab || 'overview'}
            onTabChange={(newTab) => {
              setViewParams((prev: any) => ({ ...prev, tab: newTab }));
              const hash = newTab && newTab !== 'overview' ? `#/client/cases/${activeCaseId}/${newTab}` : `#/client/cases/${activeCaseId}`;
              window.history.replaceState(null, '', hash);
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSwitchAccountClick={() => setAuthModalOpen(true)}
            onBack={() => {
              if (session?.user?.role === 'lawyer') {
                handleNavigate('lawyer-dashboard');
              } else if (session?.user?.role === 'admin') {
                handleNavigate('admin-dashboard');
              } else {
                handleNavigate('client-cases');
              }
            }}
            onPaymentSuccess={refreshCases}
          />
        )}
      </main>

      {/* Global Footer with All Required Statutory Disclaimers */}
      <Footer onNavigate={handleNavigate} />

      {/* Submit Case Modal */}
      <SubmitCaseModal
        isOpen={submitCaseOpen}
        onClose={() => setSubmitCaseOpen(false)}
        onSuccess={handleCaseSubmitted}
        lawyers={lawyers}
        preselectedLawyerId={preselectedLawyerId}
      />

      {/* Auth Modal with Login, Signup, OTP, Reset Password */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        availableUsers={session?.availableUsers || []}
        onSelectPredefinedUser={handleSwitchUser}
      />

      {/* Mobile Bottom Navigation (when not in full Case Room mode) */}
      {currentView !== 'case-room' && (
        <BottomNav
          items={[
            {
              id: 'home',
              label: session?.user?.role === 'lawyer' ? 'Console' : session?.user?.role === 'admin' ? 'Audit' : 'Home',
              icon: <Home className="w-5 h-5" />,
              active:
                currentView === 'home' ||
                currentView === 'client-dashboard' ||
                currentView === 'lawyer-dashboard' ||
                currentView === 'admin-dashboard',
              onClick: () => {
                if (session?.user?.role === 'lawyer') {
                  handleNavigate('lawyer-dashboard');
                } else if (session?.user?.role === 'admin') {
                  handleNavigate('admin-dashboard');
                } else if (session?.user?.role === 'client') {
                  handleNavigate('client-dashboard');
                } else {
                  handleNavigate('home');
                }
              },
            },
            {
              id: 'find-lawyer',
              label: 'Advocates',
              icon: <Search className="w-5 h-5" />,
              active: currentView === 'find-lawyer',
              onClick: () => handleNavigate('find-lawyer'),
            },
            {
              id: 'submit-case',
              label: 'File Case',
              icon: <PlusCircle className="w-5 h-5 text-amber-600" />,
              active: false,
              onClick: () => {
                setPreselectedLawyerId(undefined);
                setSubmitCaseOpen(true);
              },
            },
            {
              id: 'cases',
              label: 'Caseload',
              icon: <Briefcase className="w-5 h-5" />,
              active: currentView === 'client-dashboard' || currentView === 'case-room',
              badge: cases.length > 0 ? cases.length : undefined,
              onClick: () => {
                if (session?.user?.role === 'lawyer') {
                  handleNavigate('lawyer-dashboard');
                } else if (session?.user?.role === 'admin') {
                  handleNavigate('admin-dashboard');
                } else {
                  handleNavigate('client-dashboard');
                }
              },
            },
            {
              id: 'queries',
              label: 'Legal Q&A',
              icon: <MessageSquare className="w-5 h-5" />,
              active: currentView === 'queries',
              onClick: () => handleNavigate('queries'),
            },
          ]}
        />
      )}
    </div>
  );
}
export default App;
