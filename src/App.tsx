import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";
import { ThemeProvider } from "@/components/theme-provider";
import { DirectionProvider } from "@radix-ui/react-direction";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import { PWAUpdateProvider } from "@/hooks/usePWAUpdate";
import { OfflineSyncManager } from "@/hooks/useOfflineSync";

// Lazy-loaded routes for maximum initial page load speed
const Home = lazy(() => import("@/pages/Home"));
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Install = lazy(() => import("@/pages/Install"));

const FishingHome = lazy(() => import("@/pages/fishing/Home"));
const Forecast = lazy(() => import("@/pages/fishing/Forecast"));
const Locations = lazy(() => import("@/pages/fishing/Locations"));
const Identify = lazy(() => import("@/pages/fishing/Identify"));
const Wiki = lazy(() => import("@/pages/fishing/Wiki"));
const Knots = lazy(() => import("@/pages/fishing/Knots"));
const Radar = lazy(() => import("@/pages/fishing/Radar"));
const WeightCalculator = lazy(() => import("@/pages/fishing/WeightCalculator"));
const Logbook = lazy(() => import("@/pages/fishing/Logbook"));
const Settings = lazy(() => import("@/pages/fishing/Settings"));
const Leaderboard = lazy(() => import("@/pages/fishing/Leaderboard"));
const Profile = lazy(() => import("@/pages/fishing/Profile"));
const TournamentView = lazy(() => import("@/pages/fishing/TournamentView"));
const Messages = lazy(() => import("@/pages/fishing/Messages"));
const SearchUsers = lazy(() => import("@/pages/fishing/Search"));
const Welcome = lazy(() => import("@/pages/fishing/Welcome"));
const GearRecommendations = lazy(() => import("@/pages/fishing/GearRecommendations"));
const Community = lazy(() => import("@/pages/fishing/Community"));
const LiveCamsPage = lazy(() => import("@/pages/fishing/LiveCamsPage"));
const TackleBox = lazy(() => import("@/pages/fishing/TackleBox"));
const Store = lazy(() => import("@/pages/fishing/Store"));
const Analytics = lazy(() => import("@/pages/fishing/Analytics"));
const Tournaments = lazy(() => import("@/pages/fishing/Tournaments"));
const SecretAnalyzer = lazy(() => import("@/pages/fishing/SecretAnalyzer"));
const Reels = lazy(() => import("@/pages/fishing/Reels"));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
  </div>
);

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function LayoutRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><PageTransition><Login /></PageTransition></PublicRoute>} />
        <Route path="/terms" element={<PageTransition><TermsOfUse /></PageTransition>} />
        
        {/* Appwrite Digon Protected Routes */}
        <Route path="/" element={<LayoutRoute><PageTransition><Home /></PageTransition></LayoutRoute>} />
        <Route path="/install" element={<LayoutRoute><PageTransition><Install /></PageTransition></LayoutRoute>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute><PageTransition><Admin /></PageTransition></ProtectedRoute>} />
        
        {/* Fishing Specific Routes */}
        <Route path="/fishing" element={<ProtectedRoute><PageTransition><FishingHome /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/community" element={<ProtectedRoute><PageTransition><Community /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/forecast" element={<ProtectedRoute><PageTransition><Forecast /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/cams" element={<ProtectedRoute><PageTransition><LiveCamsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/locations" element={<ProtectedRoute><PageTransition><Locations /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/identify" element={<ProtectedRoute><PageTransition><Identify /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/wiki" element={<ProtectedRoute><PageTransition><Wiki /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/knots" element={<ProtectedRoute><PageTransition><Knots /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/radar" element={<ProtectedRoute><PageTransition><Radar /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/weight-calculator" element={<ProtectedRoute><PageTransition><WeightCalculator /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/logbook" element={<ProtectedRoute><PageTransition><Logbook /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/tackle-box" element={<ProtectedRoute><PageTransition><TackleBox /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/store" element={<ProtectedRoute><PageTransition><Store /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/analytics" element={<ProtectedRoute><PageTransition><Analytics /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/secret-analyzer" element={<ProtectedRoute><PageTransition><SecretAnalyzer /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/reels" element={<ProtectedRoute><PageTransition><Reels /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/welcome" element={<ProtectedRoute><PageTransition><Welcome /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/leaderboard" element={<ProtectedRoute><PageTransition><Leaderboard /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/profile/:userId" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/profile" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/tournaments" element={<ProtectedRoute><PageTransition><Tournaments /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/tournaments/:tournamentId" element={<ProtectedRoute><PageTransition><TournamentView /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/messages" element={<ProtectedRoute><PageTransition><Messages /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/search" element={<ProtectedRoute><PageTransition><SearchUsers /></PageTransition></ProtectedRoute>} />
        <Route path="/fishing/gear" element={<ProtectedRoute><PageTransition><GearRecommendations /></PageTransition></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><PageTransition><Profile /></PageTransition></ProtectedRoute>} />
        <Route path="/leaderboard" element={<LayoutRoute><PageTransition><Leaderboard /></PageTransition></LayoutRoute>} />
        
        {/* Redirects for old routes */}
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
        
        {/* Catch-all */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
    </Suspense>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="app-theme" themes={['light', 'dark', 'ocean']}>
        <DirectionProvider dir="rtl">
          <AuthProvider>
            <PWAUpdateProvider>
              <TooltipProvider>
                <OfflineSyncManager />
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AnimatedRoutes />
                </BrowserRouter>
              </TooltipProvider>
            </PWAUpdateProvider>
          </AuthProvider>
        </DirectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
