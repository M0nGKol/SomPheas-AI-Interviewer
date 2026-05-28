'use client';

import { useAuthStore } from '@/lib/store/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  BookOpen,
  Users,
  BarChart3,
  ArrowRight,
  ClipboardList,
  Brain,
} from 'lucide-react';
import Link from 'next/link';

export default function InterviewerDashboard() {
  const { user } = useAuthStore();

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {user?.full_name?.split(' ')[0] || 'Interviewer'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage problems, review candidates, and track session analytics.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/problems/new">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Create Problem</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add a new coding problem with starter code and test cases.
              </p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/dashboard/problems">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">Problem Library</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse, edit, or delete existing problems in the library.
              </p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-blue-600">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 dark:bg-purple-950 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-base">Analytics</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View candidate performance and session analytics.
            </p>
            <div className="flex items-center gap-1 mt-3 text-sm font-medium text-muted-foreground">
              Coming soon
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Candidate Sessions Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidate Sessions
          </CardTitle>
          <CardDescription>Recent interview sessions from candidates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No sessions yet</p>
            <p className="text-sm mt-1">
              Candidate sessions will appear here once interviews are conducted.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Interviews Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Evaluations
          </CardTitle>
          <CardDescription>AI-generated feedback on recent sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No evaluations yet</p>
            <p className="text-sm mt-1">
              AI evaluation summaries will appear here after candidates complete sessions.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/dashboard/problems/new">Create your first problem</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
