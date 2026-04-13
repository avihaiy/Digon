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
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-background/85 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              onClick={triggerHaptic}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-300 relative group',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:scale-95'
              )}
            >
              {/* Active indicator line */}
              <div
                className={cn(
                  'absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary transition-all duration-300',
                  isActive ? 'w-8 opacity-100' : 'w-0 opacity-0'
                )}
              />

              <div className="relative">
                {/* Glow effect */}
                {isActive && (
                  <div className="absolute inset-0 w-5 h-5 mx-auto bg-primary/20 rounded-full blur-md animate-fade-in" />
                )}
                <tab.icon
                  className={cn(
                    'w-5 h-5 transition-all duration-300 relative z-10',
                    isActive && 'scale-110'
                  )}
                />
                {tab.badge && activeAdsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold z-20">
                    {activeAdsCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] transition-all duration-300',
                  isActive ? 'font-bold' : 'font-medium'
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
