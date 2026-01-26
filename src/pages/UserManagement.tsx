import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Shield, Search, UserCog, Users, Crown, Eye, UserPlus, Mail, Key, Phone, Pencil, Trash2, KeyRound } from 'lucide-react';
import { USER_ROLES } from '@/lib/hebrew-utils';
import type { Database } from '@/integrations/supabase/types';
import { z } from 'zod';

type AppRole = Database['public']['Enums']['app_role'];

const newUserSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  fullName: z.string().min(2, 'שם מלא חייב להכיל לפחות 2 תווים'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'gabai', 'viewer']),
});

const editUserSchema = z.object({
  fullName: z.string().min(2, 'שם מלא חייב להכיל לפחות 2 תווים'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'gabai', 'viewer']).nullable(),
});

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole | null;
}

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'viewer' as AppRole,
  });
  
  const [editUserForm, setEditUserForm] = useState({
    fullName: '',
    phone: '',
    role: null as AppRole | null,
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Fetch users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles?.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        role: roleMap.get(p.user_id) || null,
      })) as UserWithRole[];
    },
    enabled: isAdmin,
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUserForm) => {
      // Sign up the new user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: data.fullName },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('לא ניתן ליצור משתמש');

      // Wait a moment for the profile to be created by the trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update profile with phone and email
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          phone: data.phone || null,
          email: data.email,
        })
        .eq('user_id', authData.user.id);

      if (profileError) console.error('Profile update error:', profileError);

      // Assign the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: data.role });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('המשתמש נוצר בהצלחה! נשלח אימייל לאימות');
      setCreateDialogOpen(false);
      setNewUserForm({ email: '', password: '', fullName: '', phone: '', role: 'viewer' });
      setFormErrors({});
    },
    onError: (error: Error) => {
      if (error.message.includes('already registered')) {
        toast.error('כתובת האימייל כבר קיימת במערכת');
      } else {
        toast.error('שגיאה ביצירת המשתמש: ' + error.message);
      }
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: typeof editUserForm }) => {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          phone: data.phone || null,
        })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Update role
      if (data.role) {
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('user_roles')
            .update({ role: data.role })
            .eq('user_id', userId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_roles')
            .insert({ user_id: userId, role: data.role });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('פרטי המשתמש עודכנו בהצלחה');
      setEditDialogOpen(false);
      setSelectedUser(null);
      setEditFormErrors({});
    },
    onError: (error: Error) => {
      toast.error('שגיאה בעדכון המשתמש: ' + error.message);
    },
  });

  // Delete user mutation (removes profile and role, auth user remains but cannot access)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete user role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('המשתמש נמחק בהצלחה');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('שגיאה במחיקת המשתמש: ' + error.message);
    },
  });

  // Assign or update role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('התפקיד עודכן בהצלחה');
      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון התפקיד: ' + error.message);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('התפקיד הוסר בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה בהסרת התפקיד: ' + error.message);
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('לא מחובר');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'שגיאה באיפוס הסיסמה');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('הסיסמה אופסה בהצלחה');
      setResetPasswordDialogOpen(false);
      setUserToResetPassword(null);
      setNewPassword('');
    },
    onError: (error: Error) => {
      toast.error('שגיאה באיפוס הסיסמה: ' + error.message);
    },
  });

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     user.email?.toLowerCase().includes(search.toLowerCase()) ||
     user.phone?.includes(search))
  );

  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.role || '');
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditUserForm({
      fullName: user.full_name || '',
      phone: user.phone || '',
      role: user.role,
    });
    setEditFormErrors({});
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const openResetPasswordDialog = (user: UserWithRole) => {
    setUserToResetPassword(user);
    setNewPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleResetPassword = () => {
    if (!userToResetPassword || newPassword.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    resetPasswordMutation.mutate({ userId: userToResetPassword.user_id, newPassword });
  };

  const handleAssignRole = () => {
    if (!selectedUser || !selectedRole) return;
    assignRoleMutation.mutate({
      userId: selectedUser.user_id,
      role: selectedRole as AppRole,
    });
  };

  const handleCreateUser = () => {
    setFormErrors({});
    const result = newUserSchema.safeParse(newUserForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }
    createUserMutation.mutate(newUserForm);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    setEditFormErrors({});
    const result = editUserSchema.safeParse(editUserForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setEditFormErrors(errors);
      return;
    }
    editUserMutation.mutate({ userId: selectedUser.user_id, data: editUserForm });
  };

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteUserMutation.mutate(userToDelete.user_id);
  };

  const getRoleIcon = (role: AppRole | null) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'gabai':
        return <UserCog className="w-4 h-4" />;
      case 'viewer':
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'gabai':
        return 'default';
      case 'viewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Stats
  const adminCount = users.filter(u => u.role === 'admin').length;
  const gabaiCount = users.filter(u => u.role === 'gabai').length;
  const viewerCount = users.filter(u => u.role === 'viewer').length;
  const noRoleCount = users.filter(u => !u.role).length;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">גישה מוגבלת</h2>
        <p className="text-muted-foreground">רק מנהלים יכולים לגשת לדף זה</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            ניהול משתמשים
          </h1>
          <p className="text-muted-foreground mt-1">הקצאת תפקידים והרשאות למשתמשים</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          הוסף משתמש חדש
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Crown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{adminCount}</p>
              <p className="text-sm text-muted-foreground">מנהלים</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{gabaiCount}</p>
              <p className="text-sm text-muted-foreground">גבאים</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Eye className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{viewerCount}</p>
              <p className="text-sm text-muted-foreground">צופים</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{noRoleCount}</p>
              <p className="text-sm text-muted-foreground">ללא תפקיד</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="glass-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            רשימת משתמשים
          </CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              לא נמצאו משתמשים
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם</TableHead>
                      <TableHead>אימייל</TableHead>
                      <TableHead>טלפון</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {user.full_name?.slice(0, 2) || '??'}
                              </span>
                            </div>
                            <p className="font-medium">{user.full_name || 'משתמש'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground" dir="ltr">
                            {user.email || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground" dir="ltr">
                            {user.phone || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                              {getRoleIcon(user.role)}
                              {USER_ROLES[user.role]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              ללא תפקיד
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="w-4 h-4 ml-1" />
                              עריכה
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openResetPasswordDialog(user)}
                            >
                              <KeyRound className="w-4 h-4 ml-1" />
                              איפוס סיסמה
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(user)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-3">
                {filteredUsers.map((user) => (
                  <Card key={user.user_id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.full_name?.slice(0, 2) || '??'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || 'משתמש'}</p>
                          {user.role ? (
                            <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1 mt-1">
                              {getRoleIcon(user.role)}
                              {USER_ROLES[user.role]}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground mt-1">
                              ללא תפקיד
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openResetPasswordDialog(user)}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      {user.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span dir="ltr">{user.email}</span>
                        </div>
                      )}
                      {user.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span dir="ltr">{user.phone}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              הקצאת תפקיד
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">משתמש:</p>
              <p className="font-medium">{selectedUser?.full_name || 'משתמש'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">בחר תפקיד:</p>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      מנהל - גישה מלאה לכל המערכת
                    </div>
                  </SelectItem>
                  <SelectItem value="gabai">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      גבאי - ניהול חברים, עליות ותשלומים
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      צופה - צפייה בלבד
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole || assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? 'שומר...' : 'שמור תפקיד'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              הוספת משתמש חדש
            </DialogTitle>
            <DialogDescription>
              צור חשבון חדש למשתמש במערכת
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">שם מלא *</Label>
              <Input
                id="fullName"
                placeholder="ישראל ישראלי"
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
              />
              {formErrors.fullName && (
                <p className="text-sm text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">אימייל *</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  className="pr-9"
                  dir="ltr"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="050-1234567"
                  className="pr-9"
                  dir="ltr"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">סיסמה זמנית *</Label>
              <div className="relative">
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="לפחות 6 תווים"
                  className="pr-9"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                />
              </div>
              {formErrors.password && (
                <p className="text-sm text-destructive">{formErrors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">המשתמש יוכל לשנות את הסיסמה לאחר הכניסה הראשונה</p>
            </div>

            <div className="space-y-2">
              <Label>תפקיד *</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      מנהל
                    </div>
                  </SelectItem>
                  <SelectItem value="gabai">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      גבאי
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      צופה
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'יוצר משתמש...' : 'צור משתמש'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              עריכת משתמש
            </DialogTitle>
            <DialogDescription>
              עדכן את פרטי המשתמש
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">שם מלא *</Label>
              <Input
                id="editFullName"
                placeholder="ישראל ישראלי"
                value={editUserForm.fullName}
                onChange={(e) => setEditUserForm({ ...editUserForm, fullName: e.target.value })}
              />
              {editFormErrors.fullName && (
                <p className="text-sm text-destructive">{editFormErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">טלפון</Label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="editPhone"
                  type="tel"
                  placeholder="050-1234567"
                  className="pr-9"
                  dir="ltr"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select
                value={editUserForm.role || ''}
                onValueChange={(value) => setEditUserForm({ ...editUserForm, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      מנהל
                    </div>
                  </SelectItem>
                  <SelectItem value="gabai">
                    <div className="flex items-center gap-2">
                      <UserCog className="w-4 h-4" />
                      גבאי
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      צופה
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={editUserMutation.isPending}
            >
              {editUserMutation.isPending ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המשתמש "{userToDelete?.full_name}" מהמערכת.
              לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? 'מוחק...' : 'מחק משתמש'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              איפוס סיסמה
            </DialogTitle>
            <DialogDescription>
              הגדר סיסמה חדשה עבור המשתמש "{userToResetPassword?.full_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">סיסמה חדשה *</Label>
              <div className="relative">
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="לפחות 6 תווים"
                  className="pr-9"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">המשתמש יוכל להתחבר עם הסיסמה החדשה מיד</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending || newPassword.length < 6}
            >
              {resetPasswordMutation.isPending ? 'מאפס...' : 'אפס סיסמה'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
