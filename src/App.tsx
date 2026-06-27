import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import CareerForgeNavbar from '@/components/layout/CareerForgeNavbar';
import LandingPage from '@/components/pages/LandingPage';
import Assessment from '@/components/pages/Assessment';
import Dashboard from '@/components/pages/Dashboard';
import AIAssistant from '@/components/shared/AIAssistant';
import { Welcome } from '@/components/auth/Welcome';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import '@/styles/globals.css';

/* ── Lazy-load heavy routes (ReactFlow, recharts, Monaco) ─ */
const StudyMaterialsPage = lazy(() => import('@/components/pages/StudyMaterialsPage'));
const StudyPlannerPage = lazy(() => import('@/components/pages/StudyPlannerPage'));
const InterviewHubPage = lazy(() => import('@/components/pages/InterviewHubPage'));
const ResumeAnalyzerPage = lazy(() => import('@/components/pages/ResumeAnalyzerPage'));
const AnalyticsPage = lazy(() => import('@/components/pages/AnalyticsPage'));

const LessonInterface = lazy(() => import('@/components/pages/LessonInterface'));
const RedemptionStore = lazy(() => import('@/components/pages/RedemptionStore'));
const VoiceDev = lazy(() => import('@/components/pages/VoiceDev'));

/* ── Scroll-to-top on route change ───────────────────────── */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

/* ── Premium page loader ─────────────────────────────────── */
function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 animate-pulse" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 blur-md opacity-60 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3.5 w-3.5 rounded-full bg-white/90" />
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase animate-pulse">Loading</p>
      </div>
    </div>
  );
}

/* ── Layout wrapper — hides nav on auth/landing ──────────── */
function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  // Auth page gets a completely clean, minimal layout — no nav, no padding
  const isAuthPage = pathname === '/auth';
  // Landing page keeps nav for CTA links but no top padding offset
  const isLandingPage = pathname === '/';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] transition-colors duration-250">
      <ScrollToTop />

      {/* Never render nav on the auth/onboarding screen */}
      {!isAuthPage && <CareerForgeNavbar />}

      <AIAssistant />

      <main className={isAuthPage || isLandingPage ? '' : 'pt-16'}>
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* ── Public ─────────────────────────────── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/simple" element={<Navigate to="/" replace />} />
              <Route path="/demo" element={<LandingPage />} />

              {/*
               * Auth route — always accessible.
               * If already signed in, the Welcome component itself redirects
               * to /dashboard, preventing a stuck loop.
               */}
              <Route path="/auth" element={<Welcome />} />
              <Route path="/assessment" element={<Assessment />} />

              {/* ── Protected ──────────────────────────── */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/study-materials"
                element={
                  <ProtectedRoute>
                    <StudyMaterialsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lesson"
                element={
                  <ProtectedRoute>
                    <LessonInterface />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/redemption"
                element={
                  <ProtectedRoute>
                    <RedemptionStore />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/study-planner"
                element={
                  <ProtectedRoute>
                    <StudyPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interviewhub"
                element={
                  <ProtectedRoute>
                    <InterviewHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/voice-dev"
                element={
                  <ProtectedRoute>
                    <VoiceDev />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resume-analyzer"
                element={
                  <ProtectedRoute>
                    <ResumeAnalyzerPage />
                  </ProtectedRoute>
                }
              />

              {/* ── 404 fallback ───────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
