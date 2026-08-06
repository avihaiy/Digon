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
import TermsOfUse from "@/pages/TermsOfUse";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Install from "@/pages/Install";
import FishingHome from "@/pages/fishing/Home";
import Community from "@/pages/fishing/Community";
import Forecast from "@/pages/fishing/Forecast";
import LiveCamsPage from "@/pages/fishing/LiveCamsPage";
import Locations from "@/pages/fishing/Locations";
import Identify from "@/pages/fishing/Identify";
import Wiki from "@/pages/fishing/Wiki";
import Knots from "@/pages/fishing/Knots";
import Radar from "@/pages/fishing/Radar";
import WeightCalculator from "@/pages/fishing/WeightCalculator";
import Logbook from "@/pages/fishing/Logbook";
import TackleBox from "@/pages/fishing/TackleBox";
import Store from "@/pages/fishing/Store";
import Analytics from "@/pages/fishing/Analytics";
import Settings from "@/pages/fishing/Settings";
import Leaderboard from "@/pages/fishing/Leaderboard";
import Profile from "@/pages/fishing/Profile";
import Tournaments from "@/pages/fishing/Tournaments";
import TournamentView from "@/pages/fishing/TournamentView";
import Messages from "@/pages/fishing/Messages";
import SearchUsers from "@/pages/fishing/Search";
import SecretAnalyzer from "@/pages/fishing/SecretAnalyzer";
import Welcome from "@/pages/fishing/Welcome";
import Reels from "@/pages/fishing/Reels";
import GearRecommendations from "@/pages/fishing/GearRecommendations";
import { PWAUpdateProvider } from "@/hooks/usePWAUpdate";
import { OfflineSyncManager } from "@/hooks/useOfflineSync";

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
