import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);

  // Form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [fullName, setFullName] = useState('');

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
    console.log('Account locked notification logic to be implemented for Appwrite');
  };

  const remainingAttempts = MAX_ATTEMPTS - failedAttempts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let email = loginIdentifier;
      
      if (!email.includes('@')) {
        toast.error('שגיאה', { description: 'אנא הזן כתובת אימייל חוקית' });
        setLoading(false);
        return;
      }

      if (isRegistering) {
        if (!fullName.trim()) {
          toast.error('שגיאה', { description: 'אנא הזן שם מלא' });
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, loginPassword, fullName);
        
        if (error) {
          console.error('Registration error:', error);
          toast.error('שגיאה בהרשמה', {
            description: error.message || 'אירעה שגיאה בלתי צפויה',
          });
        } else {
          toast.success('ברוכים הבאים לדיגון!');
          navigate('/');
        }
      } else {
        const { error } = await signIn(email, loginPassword);

        if (error) {
          console.error('Login error:', error);
          
          const newAttempts = failedAttempts + 1;
          updateFailedAttempts(newAttempts);
          
          if (newAttempts >= MAX_ATTEMPTS) {
            notifyAdminAboutLock(loginIdentifier, newAttempts);
            toast.error('החשבון עלול להינעל', {
              description: 'הגעת למספר המקסימלי של נסיונות. המתן 15 דקות או פנה למנהל.',
              duration: 8000,
            });
          } else {
            toast.error('שגיאה בהתחברות', {
              description: `אימייל או סיסמה שגויים. נותרו ${MAX_ATTEMPTS - newAttempts} נסיונות.`,
            });
          }
        } else {
          resetFailedAttempts();
          toast.success('התחברת בהצלחה!');
          navigate('/');
        }
      }
    } catch (err) {
      toast.error('שגיאה', {
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
            <CardTitle className="text-center">
              {isRegistering ? 'הרשמה למערכת' : 'התחברות למערכת'}
            </CardTitle>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div className="space-y-2">
                  <Label htmlFor="full-name">שם מלא</Label>
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="שם מלא"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="login-identifier">אימייל</Label>
                <Input
                  id="login-identifier"
                  type="email"
                  placeholder="כתובת אימייל"
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
                    {isRegistering ? 'נרשם...' : 'מתחבר...'}
                  </>
                ) : (
                  isRegistering ? 'הרשמה' : 'התחברות'
                )}
              </Button>
              
              {isRegistering && (
                <p className="text-xs text-center text-muted-foreground mt-3 animate-fade-in">
                  בעצם ההרשמה, אני מסכים ל<a href="/terms" target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline">תנאי השימוש ומדיניות הפרטיות</a>.
                </p>
              )}
            </form>

            <div className="text-center pt-4 border-t">
              <button 
                type="button" 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm text-cyan-500 hover:text-cyan-400 font-medium"
              >
                {isRegistering ? 'יש לך כבר חשבון? התחבר כאן' : 'אין לך חשבון? הירשם עכשיו'}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground/60 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          מערכת דיגון - כל הזכויות שמורות &copy; {new Date().getFullYear()}      </div>
      </div>
    </div>
  );
}