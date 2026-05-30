'use client';

import { use, useState, useEffect } from 'react';
import { Loader2, Video, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { interviewsApi, type JoinInfo, type LiveKitTokenResponse } from '@/lib/api/interviews';
import { VoiceVideoRoom } from '@/components/interview/voice-video-simple';

type Step = 'loading' | 'lobby' | 'joined' | 'error';

export default function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);

  const [step, setStep] = useState<Step>('loading');
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<LiveKitTokenResponse | null>(null);

  // Fetch interview info from invite token
  useEffect(() => {
    interviewsApi.getJoinInfo(inviteCode)
      .then((data) => {
        setInfo(data);
        setStep('lobby');
      })
      .catch(() => {
        setError('This invite link is invalid or has expired.');
        setStep('error');
      });
  }, [inviteCode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const tokenData = await interviewsApi.getGuestLiveKitToken(inviteCode, name.trim());
      setSession(tokenData);
      setStep('joined');
    } catch {
      setError('Failed to join the session. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  // ── Loading ──
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error ──
  if (step === 'error' || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-medium">{error ?? 'Something went wrong'}</p>
            <p className="text-sm text-muted-foreground">Ask the interviewer to send you a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Joined: show video room ──
  if (step === 'joined' && session) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">{info.title}</p>
            <p className="text-xs text-muted-foreground">Connected as {name}</p>
          </div>
        </div>

        {/* Video room */}
        <div className="flex-1">
          <VoiceVideoRoom
            token={session.livekit_token}
            serverUrl={session.livekit_url}
            roomName={session.room_name}
            userName={name}
            onDisconnect={() => setStep('lobby')}
            onError={(err) => {
              setError(err.message);
              setStep('error');
            }}
          />
        </div>
      </div>
    );
  }

  // ── Lobby: name input ──
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary mx-auto">
            <Video className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle>You've been invited</CardTitle>
          <CardDescription>
            <span className="font-medium text-foreground">{info.title}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                disabled={joining}
              />
            </div>
            <Button type="submit" className="w-full" disabled={joining || !name.trim()}>
              {joining ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Joining...</>
              ) : (
                <><Video className="mr-2 h-4 w-4" />Join Interview</>
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            No account needed — just enter your name to join.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
