import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
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

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/install" element={<Install />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/friday" element={<ProtectedRoute><FridayDashboard /></ProtectedRoute>} />
    <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
    <Route path="/aliyot" element={<ProtectedRoute><Aliyot /></ProtectedRoute>} />
    <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
    <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
    <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
    <Route path="/equipment" element={<ProtectedRoute><Equipment /></ProtectedRoute>} />
    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
    <Route path="/expense-reports" element={<ProtectedRoute><ExpenseReports /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="/backups" element={<ProtectedRoute><Backups /></ProtectedRoute>} />
    <Route path="/admin-mobile" element={<AdminMobile />} />
    <Route path="/display-general" element={<DisplayGeneral />} />
    <Route path="/display-memorial" element={<DisplayMemorial />} />
    <Route path="/display-finance" element={<DisplayFinance />} />
    <Route path="/display-tv" element={<DisplayTV />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
