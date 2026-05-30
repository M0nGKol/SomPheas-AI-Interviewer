'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageSquare,
  FileText,
  Code,
  TrendingUp,
  Mic,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  BarChart3,
  Zap,
  Video,
  Bug,
  Monitor,
  Brain,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  useEffect(() => {
    setMounted(true);
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !mounted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </motion.div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  const features = [
    {
      icon: Code,
      title: 'Real-Time Collaborative Editor',
      description: 'Both interviewer and candidate code together in a shared Monaco editor — live cursors, instant sync, and breakpoint collaboration powered by Yjs.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      icon: Brain,
      title: 'AI Interview Assistant',
      description: 'Gemini-powered AI streams answers and hints during the session, then auto-generates a full scored evaluation after the interview ends.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      icon: Video,
      title: 'Voice & Video + Screen Share',
      description: 'LiveKit WebRTC brings real voice and video into every session. Interviewers and candidates can share their screen with one click.',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Skill Tracking',
      description: 'Every session produces skill scores across technical ability, code quality, communication, and problem-solving — with progression charts over time.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      icon: Bug,
      title: 'Collaborative Debugging',
      description: 'Set shared breakpoints on any line in the editor. Breakpoints sync instantly between participants, with per-author color coding and inline comments.',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      icon: FileText,
      title: 'Problem Library & AI Generation',
      description: 'Interviewers maintain a library of coding problems or generate new ones instantly with AI — tailored to language, difficulty, and role.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    },
    {
      icon: Mic,
      title: 'Invite by Link or Room Code',
      description: 'Share a one-click invite link or a 6-character room code. Candidates join instantly — no setup required.',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-950',
    },
    {
      icon: Zap,
      title: 'Background AI Evaluation',
      description: 'Evaluation runs as a background Celery task so the interview ends instantly. Results appear automatically when the AI is done.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Create an Interview',
      description: 'Interviewer sets up a session, picks a coding problem, and assigns a candidate.',
    },
    {
      number: '02',
      title: 'Invite the Candidate',
      description: 'Send an invite link or share the room code. Candidate joins in one click.',
    },
    {
      number: '03',
      title: 'Code Together Live',
      description: 'Both parties collaborate in the shared editor with voice, video, AI chat, and screen sharing.',
    },
    {
      number: '04',
      title: 'Get AI Evaluation',
      description: 'After the session ends, AI automatically scores the candidate across 5 skill dimensions.',
    },
  ];

  const benefits = [
    'Live collaborative code editor with real-time sync',
    'AI-powered evaluation with skill scores after every session',
    'Voice & video powered by LiveKit WebRTC',
    'Screen sharing and collaborative debugging',
    'Background task queue — no waiting for AI results',
    'Resume-aware AI that tailors questions to the candidate',
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/40 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-200/30 dark:bg-violet-900/15 rounded-full mix-blend-multiply filter blur-3xl opacity-40"
            animate={{
              x: [0, 50, 0],
              y: [0, 50, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 4,
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative container mx-auto px-4 py-20 md:py-32"
        >
          <div className="max-w-4xl mx-auto text-center">
            {/* Feature Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 mb-8"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="h-4 w-4 text-indigo-600" />
              </motion.div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI-Powered Technical Interview Platform
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-gray-900 via-indigo-700 to-gray-900 dark:from-white dark:via-indigo-300 dark:to-white bg-clip-text text-transparent"
            >
              Run Better Technical Interviews
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto"
            >
              A real-time platform where interviewers and candidates collaborate live — shared code editor, voice & video, AI evaluation, and screen sharing. All in one room.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 h-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link href="/register">
                    Get Started Free
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="ml-2 h-5 w-5 inline" />
                    </motion.span>
                  </Link>
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 h-auto border-2"
                  asChild
                >
                  <Link href="/login">Sign In</Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { value: 'Live', label: 'Collaborative Editor' },
                { value: 'AI', label: 'Auto Evaluation' },
                { value: 'WebRTC', label: 'Voice & Video' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <motion.div
                    className="text-3xl font-bold text-gray-900 dark:text-white mb-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every tool interviewers and candidates need — in a single live session
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:grid-cols-4 xl:grid-cols-4"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                >
                  <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group h-full">
                    <CardContent className="p-6">
                      <motion.div
                        className={`${feature.bgColor} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </motion.div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From scheduling to AI-scored results in four simple steps
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto"
          >
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="relative"
                whileHover={{ scale: 1.05 }}
              >
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary to-transparent -z-10" />
                )}
                
                  <div className="text-center">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-2xl font-bold mb-4 shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {step.number}
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-2 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/30">
                <CardContent className="p-12">
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                    >
                      <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Why InterviewLab?
                      </h2>
                      <p className="text-xl text-muted-foreground mb-8">
                        Built for real technical hiring — not just practice. Every session is a full collaborative experience with AI-generated results.
                      </p>
                      <motion.ul
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="space-y-4"
                      >
                        {benefits.map((benefit, index) => (
                          <motion.li
                            key={index}
                            variants={itemVariants}
                            className="flex items-center gap-3"
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              whileInView={{ scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: index * 0.1, type: 'spring' }}
                            >
                              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                            </motion.div>
                            <span className="text-lg">{benefit}</span>
                          </motion.li>
                        ))}
                      </motion.ul>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6 }}
                      className="relative"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-blue-500/30 rounded-2xl blur-2xl opacity-15"
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.15, 0.2, 0.15],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <div className="space-y-4">
                          {[
                            { icon: Users, color: 'text-indigo-600', label: 'Roles Supported', value: '3 Roles' },
                            { icon: BarChart3, color: 'text-blue-600', label: 'Skill Dimensions', value: '5 Scores' },
                            { icon: Zap, color: 'text-orange-600', label: 'AI Evaluation', value: 'Async' },
                          ].map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="flex items-center gap-3"
                              >
                                <Icon className={`h-8 w-8 ${stat.color}`} />
                                <div>
                                  <div className="font-semibold">{stat.label}</div>
                                  <div className="text-2xl font-bold">{stat.value}</div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-indigo-600 to-blue-600">
        <motion.div
          style={{ y }}
          className="container mx-auto px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-white mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Ready to Run Your First Interview?
            </motion.h2>
            <motion.p
              className="text-xl text-indigo-100 mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Set up a session, invite your candidate, and get an AI evaluation — in minutes
            </motion.p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="lg"
                className="text-lg px-8 py-6 h-auto bg-white text-indigo-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all"
                asChild
              >
                <Link href="/register">
                  Get Started Free
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="ml-2 h-5 w-5 inline" />
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-background border-t py-12"
      >
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <MessageSquare className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold">InterviewLab</span>
            </motion.div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <motion.div whileHover={{ scale: 1.1 }}>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Sign In
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }}>
                <Link href="/register" className="hover:text-foreground transition-colors">
                  Sign Up
                </Link>
              </motion.div>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} InterviewLab. All rights reserved.
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
