import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CreditCard, Megaphone, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const tabs = [
  { href: '/', icon: Home, label: 'בקרה', badge: false },
  { href: '/members', icon: Users, label: 'חברים', badge: false },
  { href: '/payments', icon: CreditCard, label: 'תשלומים', badge: false },
  { href: '/manage-ads', icon: Megaphone, label: 'מודעות', badge: true },
  { href: '/settings', icon: Settings, label: 'הגדרות', badge: false },
];

export default function BottomNavigation() {
  const location = useLocation();

  const { data: activeAdsCount = 0 } = useQuery({
    queryKey: ['active-ads-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('scheduled_announcements')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    },
  });

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-background/80 backdrop-blur-lg border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200 relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <tab.icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
                {tab.badge && activeAdsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                    {activeAdsCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
