'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { problemsApi, type ProblemCreate } from '@/lib/api/problems';
import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewProblemPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ProblemCreate>({
    title: '',
    description: '',
    difficulty: 'EASY',
    language: 'python',
    starter_code: '',
    test_cases: undefined,
    expected_solution: '',
  });
  const [testCasesRaw, setTestCasesRaw] = useState('');
  const [testCasesError, setTestCasesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: problemsApi.create,
    onSuccess: (problem) => {
      queryClient.invalidateQueries({ queryKey: ['problems'] });
      toast.success('Problem created!');
      router.push(`/dashboard/problems/${problem.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (user && user.role !== 'INTERVIEWER' && user.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>You do not have permission to create problems.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/problems">Back to problems</Link>
        </Button>
      </div>
    );
  }

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

    mutation.mutate({
      ...form,
      starter_code: form.starter_code || undefined,
      expected_solution: form.expected_solution || undefined,
      test_cases: parsedTestCases,
    });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/problems">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlusCircle className="h-6 w-6" />
          New Problem
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Two Sum"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the problem clearly..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows={5}
                disabled={mutation.isPending}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty *</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm({ ...form, difficulty: v as ProblemCreate['difficulty'] })}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language *</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm({ ...form, language: v })}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="starter_code">Starter Code</Label>
              <Textarea
                id="starter_code"
                placeholder="def solution(...):"
                value={form.starter_code ?? ''}
                onChange={(e) => setForm({ ...form, starter_code: e.target.value })}
                rows={6}
                className="font-mono text-sm"
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_cases">Test Cases (JSON)</Label>
              <Textarea
                id="test_cases"
                placeholder='[{"input": [2, 7, 11, 15], "expected": [0, 1]}]'
                value={testCasesRaw}
                onChange={(e) => {
                  setTestCasesRaw(e.target.value);
                  setTestCasesError(null);
                }}
                rows={4}
                className="font-mono text-sm"
                disabled={mutation.isPending}
              />
              {testCasesError && (
                <p className="text-xs text-destructive">{testCasesError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_solution">Expected Solution</Label>
              <Textarea
                id="expected_solution"
                placeholder="Reference solution (optional)..."
                value={form.expected_solution ?? ''}
                onChange={(e) => setForm({ ...form, expected_solution: e.target.value })}
                rows={6}
                className="font-mono text-sm"
                disabled={mutation.isPending}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Problem'
                )}
              </Button>
              <Button asChild variant="outline" disabled={mutation.isPending}>
                <Link href="/dashboard/problems">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
