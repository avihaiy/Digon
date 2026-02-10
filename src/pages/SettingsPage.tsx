import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SettingsTab } from '@/components/admin/SettingsTab';

export default function SettingsPage() {
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

  return (
    <div className="p-6" dir="rtl">
      <SettingsTab />
    </div>
  );
}
