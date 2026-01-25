import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Eye, EyeOff, Loader2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithPhone, verifyOtp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [otpSent, setOtpSent] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast.error('שגיאה בהתחברות', {
        description: 'אימייל או סיסמה שגויים',
      });
    } else {
      toast.success('ברוכים הבאים!');
      navigate('/');
    }

    setLoading(false);
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Format phone number - ensure it starts with +972
    let formattedPhone = loginPhone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+972' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+972' + formattedPhone;
    }

    const { error } = await signInWithPhone(formattedPhone);

    if (error) {
      toast.error('שגיאה בשליחת קוד', {
        description: error.message,
      });
    } else {
      setOtpSent(true);
      setLoginPhone(formattedPhone);
      toast.success('קוד נשלח!', {
        description: 'בדוק את הודעות ה-SMS שלך',
      });
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await verifyOtp(loginPhone, otpCode);

    if (error) {
      toast.error('קוד שגוי', {
        description: 'נסה שוב',
      });
    } else {
      toast.success('ברוכים הבאים!');
      navigate('/');
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(registerEmail, registerPassword, registerName);

    if (error) {
      toast.error('שגיאה בהרשמה', {
        description: error.message,
      });
    } else {
      toast.success('נרשמת בהצלחה!', {
        description: 'כעת ניתן להתחבר למערכת',
      });
      navigate('/');
    }

    setLoading(false);
  };

  const resetPhoneLogin = () => {
    setOtpSent(false);
    setOtpCode('');
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
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">התחברות</TabsTrigger>
                <TabsTrigger value="register">הרשמה</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login" className="mt-0 space-y-4">
                {/* Login method toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('email'); resetPhoneLogin(); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      loginMethod === 'email'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    אימייל
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('phone'); resetPhoneLogin(); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      loginMethod === 'phone'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    טלפון
                  </button>
                </div>

                {loginMethod === 'email' ? (
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">אימייל</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
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
                ) : (
                  <>
                    {!otpSent ? (
                      <form onSubmit={handlePhoneLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-phone">מספר טלפון</Label>
                          <Input
                            id="login-phone"
                            type="tel"
                            placeholder="050-1234567"
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(e.target.value)}
                            required
                            dir="ltr"
                            className="text-left"
                          />
                          <p className="text-xs text-muted-foreground">הזן מספר טלפון ישראלי</p>
                        </div>

                        <Button
                          type="submit"
                          className="w-full btn-primary-gradient"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              שולח קוד...
                            </>
                          ) : (
                            'שלח קוד אימות'
                          )}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="text-center mb-4">
                          <p className="text-sm text-muted-foreground">
                            קוד אימות נשלח למספר
                          </p>
                          <p className="font-medium" dir="ltr">{loginPhone}</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="otp-code">קוד אימות</Label>
                          <Input
                            id="otp-code"
                            type="text"
                            placeholder="123456"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            required
                            maxLength={6}
                            dir="ltr"
                            className="text-center text-2xl tracking-widest"
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full btn-primary-gradient"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              מאמת...
                            </>
                          ) : (
                            'אימות והתחברות'
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={resetPhoneLogin}
                        >
                          שנה מספר טלפון
                        </Button>
                      </form>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">שם מלא</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="ישראל ישראלי"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">אימייל</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="text-left"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">סיסמה</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        minLength={6}
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
                    <p className="text-xs text-muted-foreground">לפחות 6 תווים</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full btn-primary-gradient"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        נרשם...
                      </>
                    ) : (
                      'הרשמה'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          מערכת ניהול גבאות - כל הזכויות שמורות
        </p>
      </div>
    </div>
  );
}
