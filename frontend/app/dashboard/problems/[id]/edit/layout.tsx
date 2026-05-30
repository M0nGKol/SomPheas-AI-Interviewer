import { RoleGuard } from '@/components/auth/role-guard';

export default function EditProblemLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['INTERVIEWER', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
