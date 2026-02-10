import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SettingsTab } from '@/components/admin/SettingsTab';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState('akko');
  const [locationLoaded, setLocationLoaded] = useState(false);

  const { data: locationSetting } = useQuery({
    queryKey: ['app-settings-location'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_location')
        .single();
      return data?.value || 'akko';
    },
  });

  useEffect(() => {
    if (locationSetting && !locationLoaded) {
      setSelectedLocation(locationSetting);
      setLocationLoaded(true);
    }
  }, [locationSetting, locationLoaded]);

  const saveLocationMutation = useMutation({
    mutationFn: async (location: string) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'display_location', value: location }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-location'] });
      toast({ title: 'המיקום נשמר בהצלחה' });
    },
    onError: () => toast({ title: 'שגיאה בשמירת המיקום', variant: 'destructive' }),
  });

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    saveLocationMutation.mutate(location);
  };

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
      <SettingsTab selectedLocation={selectedLocation} onLocationChange={handleLocationChange} />
    </div>
  );
}
