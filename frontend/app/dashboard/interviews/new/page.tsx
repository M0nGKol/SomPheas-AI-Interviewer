'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';

import { interviewsApi, type InterviewCreate } from '@/lib/api/interviews';
import { problemsApi } from '@/lib/api/problems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
];

export default function NewInterviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<InterviewCreate>({
    title: '',
    problem_id: null,
    language: 'python',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: problems } = useQuery({
    queryKey: ['problems'],
    queryFn: problemsApi.list,
  });

  const mutation = useMutation({
    mutationFn: interviewsApi.create,
    onSuccess: (interview) => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      toast.success('Interview created!');
      router.push(`/dashboard/interviews/${interview.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/interviews">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Plus className="h-6 w-6" />
          New Interview
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Details</CardTitle>
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
                placeholder="e.g. Data Structures Practice"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                disabled={mutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problem">Problem (optional)</Label>
              <Select
                value={form.problem_id?.toString() ?? 'none'}
                onValueChange={(v) =>
                  setForm({ ...form, problem_id: v === 'none' ? null : Number(v) })
                }
                disabled={mutation.isPending}
              >
                <SelectTrigger id="problem">
                  <SelectValue placeholder="Select a problem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No problem selected</SelectItem>
                  {problems?.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.title} ({p.difficulty})
                    </SelectItem>
                  ))}
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
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Interview'
                )}
              </Button>
              <Button asChild variant="outline" disabled={mutation.isPending}>
                <Link href="/dashboard/interviews">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
