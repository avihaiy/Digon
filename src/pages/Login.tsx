import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;
const ATTEMPT_STORAGE_KEY = 'login_attempts';
const ATTEMPT_TIMESTAMP_KEY = 'login_attempt_timestamp';
const ATTEMPT_RESET_TIME = 15 * 60 * 1000; // 15 minutes

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Login form state - can be email or username
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Load failed attempts from localStorage on mount
  useEffect(() => {
    const storedAttempts = localStorage.getItem(ATTEMPT_STORAGE_KEY);
    const storedTimestamp = localStorage.getItem(ATTEMPT_TIMESTAMP_KEY);
    
    if (storedAttempts && storedTimestamp) {
      const timestamp = parseInt(storedTimestamp, 10);
      const now = Date.now();
      
      // Reset attempts if enough time has passed
      if (now - timestamp > ATTEMPT_RESET_TIME) {
        localStorage.removeItem(ATTEMPT_STORAGE_KEY);
        localStorage.removeItem(ATTEMPT_TIMESTAMP_KEY);
        setFailedAttempts(0);
      } else {
        setFailedAttempts(parseInt(storedAttempts, 10));
      }
    }
  }, []);

  const updateFailedAttempts = (count: number) => {
    setFailedAttempts(count);
    localStorage.setItem(ATTEMPT_STORAGE_KEY, count.toString());
    localStorage.setItem(ATTEMPT_TIMESTAMP_KEY, Date.now().toString());
  };

  const resetFailedAttempts = () => {
    setFailedAttempts(0);
    localStorage.removeItem(ATTEMPT_STORAGE_KEY);
    localStorage.removeItem(ATTEMPT_TIMESTAMP_KEY);
  };

  const notifyAdminAboutLock = async (identifier: string, attemptCount: number) => {
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-account-locked`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ identifier, attemptCount }),
        }
      );
      console.log('Admin notified about account lock');
    } catch (err) {
      console.error('Failed to notify admin:', err);
    }
  };

  const remainingAttempts = MAX_ATTEMPTS - failedAttempts;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let email = loginIdentifier;
      
      // Check if input is not an email (no @ symbol) - treat as username
      if (!loginIdentifier.includes('@')) {
        // Look up email by username
        const { data, error } = await supabase.rpc('get_email_by_username', {
          _username: loginIdentifier
        });
        
        if (error || !data) {
          const newAttempts = failedAttempts + 1;
          updateFailedAttempts(newAttempts);
          
          if (newAttempts >= MAX_ATTEMPTS) {
            notifyAdminAboutLock(loginIdentifier, newAttempts);
            toast.error('החשבון ננעל', {
              description: 'נסית להתחבר יותר מדי פעמים. נסה שוב בעוד 15 דקות או פנה למנהל.',
              duration: 8000,
            });
          } else {
            toast.error('שגיאה בהתחברות', {
              description: `שם משתמש או סיסמה שגויים. נותרו ${MAX_ATTEMPTS - newAttempts} נסיונות.`,
            });
          }
          setLoading(false);
          return;
        }
        
        email = data;
      }

      const { error } = await signIn(email, loginPassword);

      if (error) {
        const newAttempts = failedAttempts + 1;
        updateFailedAttempts(newAttempts);
        
        // Check if account is locked
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('locked') || errorMessage.includes('banned') || errorMessage.includes('too many')) {
          notifyAdminAboutLock(loginIdentifier, newAttempts);
          toast.error('החשבון נעול', {
            description: 'החשבון שלך נעול עקב נסיונות התחברות כושלים. פנה למנהל המערכת לשחרור החשבון.',
            duration: 8000,
          });
        } else if (newAttempts >= MAX_ATTEMPTS) {
          notifyAdminAboutLock(loginIdentifier, newAttempts);
          toast.error('החשבון עלול להינעל', {
            description: 'הגעת למספר המקסימלי של נסיונות. המתן 15 דקות או פנה למנהל.',
            duration: 8000,
          });
        } else if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid')) {
          toast.error('שגיאה בהתחברות', {
            description: `אימייל/שם משתמש או סיסמה שגויים. נותרו ${MAX_ATTEMPTS - newAttempts} נסיונות.`,
          });
        } else if (errorMessage.includes('email not confirmed')) {
          toast.error('האימייל לא אומת', {
            description: 'יש לאמת את כתובת האימייל לפני ההתחברות',
          });
        } else {
          toast.error('שגיאה בהתחברות', {
            description: error.message,
          });
        }
      } else {
        resetFailedAttempts();
        toast.success('ברוכים הבאים!');
        navigate('/');
      }
    } catch (err) {
      toast.error('שגיאה בהתחברות', {
        description: 'אירעה שגיאה בלתי צפויה',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/digon-logo.jpg" 
            alt="דיגון" 
            className="w-20 h-20 object-cover rounded-2xl shadow-lg mx-auto mb-4 animate-scale-in hover-scale"
          />
          <h1 className="text-2xl font-bold text-foreground animate-fade-in">דיגון</h1>
          <p className="text-muted-foreground mt-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>מערכת הדייג של ישראל</p>
        </div>

        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-center">התחברות למערכת</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Warning alert when attempts are running low */}
            {failedAttempts >= 3 && remainingAttempts > 0 && (
              <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  נותרו לך {remainingAttempts} נסיונות התחברות לפני נעילת החשבון
                </AlertDescription>
              </Alert>
            )}
            
            {/* Locked alert */}
            {remainingAttempts <= 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  הגעת למספר המקסימלי של נסיונות. המתן 15 דקות או פנה למנהל המערכת.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-identifier">אימייל או שם משתמש</Label>
                <Input
                  id="login-identifier"
                  type="text"
                  placeholder="אימייל או שם משתמש"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">סיסמה</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-primary-gradient animate-fade-in hover-scale"
                style={{ animationDelay: '0.3s' }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מתחבר...
                  </>
                ) : (
                  'התחברות'
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground pt-4 border-t">
              אין לך חשבון? פנה למנהל המערכת
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground/60 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          מערכת דיגון - כל הזכויות שמורות &copy; {new Date().getFullYear()}      </div>
      </div>
    </div>
  );
}