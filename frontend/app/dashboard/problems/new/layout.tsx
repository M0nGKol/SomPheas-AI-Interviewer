import { RoleGuard } from '@/components/auth/role-guard';

export default function NewProblemLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['INTERVIEWER', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
