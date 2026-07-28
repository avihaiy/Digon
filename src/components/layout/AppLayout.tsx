import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { APP_CONFIG } from '@/config/app';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  PieChart,
  RefreshCw,
  ChevronDown,
  Megaphone,
  Fish,
  MapPin,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', icon: Home, label: 'ראשי' },
  { href: '/admin', icon: Settings, label: 'פאנל ניהול' },
  { href: '/fishing/locations', icon: MapPin, label: 'מיקומי דיג' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, userRole, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { needRefresh, updateServiceWorker } = usePWAUpdate();

  // downloadAnyDeskBat is now in ScreensManagementPanel
  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'מש';

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-64 bg-sidebar lg:translate-x-0 lg:static',
          'transition-all duration-300 ease-out',
          sidebarOpen 
            ? 'translate-x-0 opacity-100 shadow-2xl' 
            : 'translate-x-full opacity-0 lg:opacity-100 lg:shadow-none'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/digon-logo.jpg"
                  alt="Digon Logo"
                  className="w-12 h-12 object-contain animate-scale-in hover-scale rounded-xl shadow-sm"
                />
                <div>
                  <h1 className="text-lg font-bold text-sidebar-foreground">דיגון</h1>
                  <p className="text-xs text-sidebar-foreground/60">פאנל ניהול ראשי</p>
                </div>
              </div>
              <button
                onClick={() => { triggerHaptic(); setSidebarOpen(false); }}
                className="lg:hidden text-sidebar-foreground active:scale-90 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn('nav-item animate-fade-in', isActive && 'active')}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            

            
            {/* Install App Link */}
            <div className="my-3 border-t border-sidebar-border pt-3">
              <Link
                to="/install"
                onClick={() => setSidebarOpen(false)}
                className={cn('nav-item', location.pathname === '/install' && 'active')}
              >
                <Download className="w-5 h-5" />
                <span>התקן אפליקציה</span>
              </Link>
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email}
                </p>
                {userRole && (
                  <Badge variant="outline" className="mt-1 text-xs border-sidebar-primary/50 text-sidebar-primary">
                    {USER_ROLES[userRole]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen 
            ? "bg-black/50 opacity-100 pointer-events-auto" 
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        {/* Offline Banner */}
        <OfflineBanner />
        
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 lg:px-6 flex items-center justify-between" style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(4rem + env(safe-area-inset-top))' }}>
          <button
            onClick={() => { triggerHaptic(); setSidebarOpen(true); }}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg active:scale-95 transition-transform"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* AnyDesk Connection Button / Screens Panel */}
            {isAdmin && (
              <ScreensManagementPanel screens={anydeskScreens || []}>
                <Button
                  variant="ghost"
                  size="icon"
                  title="פאנל ניהול מסכים"
                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  <Monitor className="w-5 h-5" />
                </Button>
              </ScreensManagementPanel>
            )}

            {/* Refresh Button with Update Indicator */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => needRefresh ? updateServiceWorker() : window.location.reload()}
              title={needRefresh ? "עדכון זמין - לחץ לרענון" : "רענן עמוד"}
              className="relative"
            >
              <RefreshCw className={cn("w-5 h-5", needRefresh && "animate-spin")} />
              {needRefresh && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
              )}
            </Button>
            
            {/* Offline Indicator */}
            <OfflineIndicator />
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Notifications */}
            <NotificationDropdown />

            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="w-4 h-4 ml-2" />
                    הגדרות
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 ml-2" />
                  יציאה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-x-hidden">
          {children}
        </main>

        {/* Footer credit */}
        <footer className="border-t border-border px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">דיגון</span> - מערכת הדייג של ישראל
            <span className="mx-2">•</span>
            נבנתה ע"י <span className="font-medium text-foreground">{APP_CONFIG.developer.name}</span>
            <span className="mx-2">•</span>
            <span className="text-muted-foreground/70">v{APP_CONFIG.version}</span>
          </p>
        </footer>
      </div>
      <BottomNavigation />
    </div>
  );
}
