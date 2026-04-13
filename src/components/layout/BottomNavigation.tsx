import { Link, useLocation } from 'react-router-dom';
import { Home, Users, CreditCard, Megaphone, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/', icon: Home, label: 'בקרה' },
  { href: '/members', icon: Users, label: 'חברים' },
  { href: '/payments', icon: CreditCard, label: 'תשלומים' },
  { href: '/manage-ads', icon: Megaphone, label: 'מודעות' },
  { href: '/settings', icon: Settings, label: 'הגדרות' },
];

export default function BottomNavigation() {
  const location = useLocation();

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
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
