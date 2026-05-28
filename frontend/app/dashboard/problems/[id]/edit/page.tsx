'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

import { problemsApi, type ProblemUpdate } from '@/lib/api/problems';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const canEdit = user?.role === 'INTERVIEWER' || user?.role === 'ADMIN';

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: () => problemsApi.get(Number(id)),
  });

  const [form, setForm] = useState<ProblemUpdate>({});
  const [testCasesRaw, setTestCasesRaw] = useState('');
  const [testCasesError, setTestCasesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (problem) {
      setForm({
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        language: problem.language,
        starter_code: problem.starter_code ?? '',
        expected_solution: problem.expected_solution ?? '',
      });
      setTestCasesRaw(problem.test_cases ? JSON.stringify(problem.test_cases, null, 2) : '');
    }
  }, [problem]);

  const mutation = useMutation({
    mutationFn: (data: ProblemUpdate) => problemsApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem', id] });
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast.success('Problem updated!');
      router.push(`/dashboard/problems/${id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!canEdit) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>You do not have permission to edit problems.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/problems">Back to problems</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-64 w-full" /></div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTestCasesError(null);

    let parsedTestCases: unknown = undefined;
    if (testCasesRaw.trim()) {
      try {
        parsedTestCases = JSON.parse(testCasesRaw);
      } catch {
        setTestCasesError('Test cases must be valid JSON');
        return;
      }
    }

    mutation.mutate({ ...form, test_cases: parsedTestCases });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/problems/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Problem</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Problem Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required disabled={mutation.isPending} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={5} disabled={mutation.isPending} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as 'EASY' | 'MEDIUM' | 'HARD' })} disabled={mutation.isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })} disabled={mutation.isPending}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="starter_code">Starter Code</Label>
              <Textarea id="starter_code" value={form.starter_code ?? ''} onChange={(e) => setForm({ ...form, starter_code: e.target.value })} rows={6} className="font-mono text-sm" disabled={mutation.isPending} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_cases">Test Cases (JSON)</Label>
              <Textarea id="test_cases" value={testCasesRaw} onChange={(e) => { setTestCasesRaw(e.target.value); setTestCasesError(null); }} rows={4} className="font-mono text-sm" disabled={mutation.isPending} />
              {testCasesError && <p className="text-xs text-destructive">{testCasesError}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_solution">Expected Solution</Label>
              <Textarea id="expected_solution" value={form.expected_solution ?? ''} onChange={(e) => setForm({ ...form, expected_solution: e.target.value })} rows={6} className="font-mono text-sm" disabled={mutation.isPending} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
              </Button>
              <Button asChild variant="outline" disabled={mutation.isPending}>
                <Link href={`/dashboard/problems/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
