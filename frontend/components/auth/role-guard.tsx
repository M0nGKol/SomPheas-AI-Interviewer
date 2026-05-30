'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  /** Where to redirect if role check fails. Defaults to the user's dashboard home. */
  redirectTo?: string;
}

function getDashboardHome(role?: string) {
  if (role === 'INTERVIEWER' || role === 'ADMIN') return '/dashboard/interviewer';
  return '/dashboard/candidate';
}

export function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    const check = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

      if (!token) {
        router.replace('/login');
        return;
      }

      if (!isAuthenticated) {
        await fetchUser();
        return; // re-render will re-run this effect with updated user
      }

      if (user && !allowedRoles.includes(user.role)) {
        router.replace(redirectTo ?? getDashboardHome(user.role));
      }
    };

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return null; // redirect is in flight
  }

  return <>{children}</>;
}
