import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state - can be email or username
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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
          toast.error('שגיאה בהתחברות', {
            description: 'שם משתמש או סיסמה שגויים',
          });
          setLoading(false);
          return;
        }
        
        email = data;
      }

      const { error } = await signIn(email, loginPassword);

      if (error) {
        toast.error('שגיאה בהתחברות', {
          description: 'אימייל/שם משתמש או סיסמה שגויים',
        });
      } else {
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">מערכת ניהול גבאות</h1>
          <p className="text-muted-foreground mt-2">בית הכנסת</p>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">התחברות למערכת</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
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
                className="w-full btn-primary-gradient"
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          מערכת ניהול גבאות - כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}