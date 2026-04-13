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

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/40 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.4)]" />
      
      <div className="relative flex items-center justify-around h-[68px]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              onClick={triggerHaptic}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-300 relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:scale-90'
              )}
            >
              {/* Active indicator line - top */}
              <div
                className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b-full bg-primary transition-all duration-400 ease-out',
                  isActive ? 'w-10 opacity-100' : 'w-0 opacity-0'
                )}
              />

              <div className="relative flex items-center justify-center w-10 h-7">
                {/* Glow effect behind icon */}
                {isActive && (
                  <div className="absolute inset-0 mx-auto w-8 h-8 -top-0.5 bg-primary/15 rounded-full blur-lg glow-pulse" />
                )}
                <tab.icon
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-300 relative z-10',
                    isActive ? 'scale-115 text-primary' : 'text-muted-foreground'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge && activeAdsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold z-20 shadow-sm">
                    {activeAdsCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight transition-all duration-300',
                  isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
