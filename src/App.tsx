import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";
import { ThemeProvider } from "@/components/theme-provider";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import FridayDashboard from "@/pages/FridayDashboard";
import Members from "@/pages/Members";
import Aliyot from "@/pages/Aliyot";
import Payments from "@/pages/Payments";
import Receipts from "@/pages/Receipts";
import Reports from "@/pages/Reports";
import UserManagement from "@/pages/UserManagement";
import Budget from "@/pages/Budget";
import Equipment from "@/pages/Equipment";
import Expenses from "@/pages/Expenses";
import ExpenseReports from "@/pages/ExpenseReports";
import Admin from "@/pages/Admin";
import AdminMobile from "@/pages/AdminMobile";
import Backups from "@/pages/Backups";
import DisplayGeneral from "@/pages/DisplayGeneral";
import DisplayMemorial from "@/pages/DisplayMemorial";
import DisplayFinance from "@/pages/DisplayFinance";
import DisplayTV from "@/pages/DisplayTV";
import Install from "@/pages/Install";
import NotFound from "@/pages/NotFound";
import ManageAds from "@/pages/ManageAds";
import Display from "@/pages/Display";
import SettingsPage from "@/pages/SettingsPage";
import { OfflineSyncProvider } from "@/hooks/useOfflineSync";
import { PWAUpdateProvider } from "@/hooks/usePWAUpdate";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";

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
        <Route path="/login" element={<PublicRoute><PageTransition><Login /></PageTransition></PublicRoute>} />
        <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
        <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/friday" element={<ProtectedRoute><PageTransition><FridayDashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/members" element={<ProtectedRoute><PageTransition><Members /></PageTransition></ProtectedRoute>} />
        <Route path="/aliyot" element={<ProtectedRoute><PageTransition><Aliyot /></PageTransition></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><PageTransition><Payments /></PageTransition></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute><PageTransition><Receipts /></PageTransition></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><PageTransition><Reports /></PageTransition></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><PageTransition><UserManagement /></PageTransition></ProtectedRoute>} />
        <Route path="/budget" element={<ProtectedRoute><PageTransition><Budget /></PageTransition></ProtectedRoute>} />
        <Route path="/equipment" element={<ProtectedRoute><PageTransition><Equipment /></PageTransition></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><PageTransition><Expenses /></PageTransition></ProtectedRoute>} />
        <Route path="/expense-reports" element={<ProtectedRoute><PageTransition><ExpenseReports /></PageTransition></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><PageTransition><Admin /></PageTransition></ProtectedRoute>} />
        <Route path="/backups" element={<ProtectedRoute><PageTransition><Backups /></PageTransition></ProtectedRoute>} />
        <Route path="/manage-ads" element={<ProtectedRoute><PageTransition><ManageAds /></PageTransition></ProtectedRoute>} />
        <Route path="/admin-mobile" element={<PageTransition><AdminMobile /></PageTransition>} />
        <Route path="/display-general" element={<PageTransition><DisplayGeneral /></PageTransition>} />
        <Route path="/display-memorial" element={<PageTransition><DisplayMemorial /></PageTransition>} />
        <Route path="/display-finance" element={<PageTransition><DisplayFinance /></PageTransition>} />
        <Route path="/display-tv" element={<PageTransition><DisplayTV /></PageTransition>} />
        <Route path="/display" element={<Display />} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <OfflineSyncProvider>
          <PWAUpdateProvider>
            <Toaster />
            <Sonner />
            <PWAUpdatePrompt />
          <BrowserRouter>
            <AuthProvider>
              <AnimatedRoutes />
            </AuthProvider>
          </BrowserRouter>
          </PWAUpdateProvider>
        </OfflineSyncProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
