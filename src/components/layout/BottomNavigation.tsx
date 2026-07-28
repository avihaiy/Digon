import { Link, useLocation } from 'react-router-dom';
import { Home, MapPin, Activity, Trophy, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function BottomNavigation() {
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const tabs = [
    { href: '/', icon: Home, label: 'ראשי' },
    { href: '/fishing/locations', icon: MapPin, label: 'מיקומי דיג' },
    { href: '/fishing/community', icon: ShoppingCart, label: 'יד 2' },
    { href: '/leaderboard', icon: Trophy, label: 'אלופים' },
    ...(isAdmin ? [{ href: '/admin', icon: Activity, label: 'ניהול' }] : []),
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-center justify-around p-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-12 transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className={cn("w-5 h-5 mb-1", isActive && "animate-bounce-subtle")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
