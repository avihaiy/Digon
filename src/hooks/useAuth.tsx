import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Models, Query } from 'appwrite';
import { account, databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID } from '@/lib/appwrite';

type UserRole = 'ADMIN' | 'gabai' | 'viewer' | 'USER';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  session: Models.Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isManager: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [session, setSession] = useState<Models.Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserAndRole = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      
      const currentSession = await account.getSession('current');
      setSession(currentSession);

      // Fetch role from profiles collection
      const docs = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
        Query.equal('user_id', currentUser.$id)
      ]);
      
      let role: UserRole = 'USER';
      if (docs.documents.length > 0) {
        role = docs.documents[0].role as UserRole;
      }
      
      const finalRole = currentUser.email === 'avihaidj0@gmail.com' ? 'ADMIN' : role;
      setUserRole(finalRole);
    } catch (e) {
      setUser(null);
      setSession(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndRole();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      try {
        await account.deleteSession('current');
      } catch (e) {
        // Ignore if no session exists
      }
      const sess = await account.createEmailPasswordSession(email, password);
      await fetchUserAndRole();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const u = await account.create('unique()', email, password, fullName);
      // Auto login
      await account.createEmailPasswordSession(email, password);
      // Create profile
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, 'unique()', {
        user_id: u.$id,
        full_name: fullName,
        role: 'USER'
      });
      await fetchUserAndRole();
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {}
    setUser(null);
    setSession(null);
    setUserRole(null);
  };

  const isManager = userRole === 'ADMIN' || userRole === 'gabai';
  const isAdmin = userRole === 'ADMIN';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userRole,
      loading,
      signIn,
      signUp,
      signOut,
      isManager,
      isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
