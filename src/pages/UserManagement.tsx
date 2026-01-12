import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Shield, Search, UserCog, Users, Crown, Eye } from 'lucide-react';
import { USER_ROLES } from '@/lib/hebrew-utils';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  email: string;
  role: AppRole | null;
}

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Create a map of roles
      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Combine the data - we'll use user_id as email placeholder since we can't access auth.users
      return profiles?.map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.full_name || p.user_id.slice(0, 8), // Use full_name or partial user_id
        role: roleMap.get(p.user_id) || null,
      })) as UserWithRole[];
    },
    enabled: isAdmin,
  });

  // Assign or update role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if user already has a role
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new role
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

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     user.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.role || '');
    setDialogOpen(true);
  };

  const handleAssignRole = () => {
    if (!selectedUser || !selectedRole) return;
    assignRoleMutation.mutate({
      userId: selectedUser.user_id,
      role: selectedRole as AppRole,
    });
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            רשימת משתמשים
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש משתמש..."
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם</TableHead>
                    <TableHead>תפקיד נוכחי</TableHead>
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
                          <div>
                            <p className="font-medium">{user.full_name || 'משתמש'}</p>
                            <p className="text-sm text-muted-foreground">{user.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
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
                            onClick={() => openRoleDialog(user)}
                          >
                            <UserCog className="w-4 h-4 ml-1" />
                            שנה תפקיד
                          </Button>
                          {user.role && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRoleMutation.mutate(user.user_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              הסר תפקיד
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
    </div>
  );
}
