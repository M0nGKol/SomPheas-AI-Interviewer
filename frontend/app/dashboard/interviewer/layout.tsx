import { RoleGuard } from '@/components/auth/role-guard';

export default function InterviewerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['INTERVIEWER', 'ADMIN']}>
      {children}
    </RoleGuard>
  );
}
