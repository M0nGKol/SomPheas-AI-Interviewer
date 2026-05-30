'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  LogOut,
  User,
  Github,
  Linkedin,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function getDashboardHome(role?: string) {
  if (role === 'INTERVIEWER' || role === 'ADMIN') return '/dashboard/interviewer';
  return '/dashboard/candidate';
}

function getNavLinks(role?: string) {
  const isInterviewer = role === 'INTERVIEWER' || role === 'ADMIN';
  return [
    { name: 'Dashboard', href: getDashboardHome(role), icon: LayoutDashboard },
    { name: 'Interviews', href: '/dashboard/interviews', icon: MessageSquare },
    // Problems library is interviewer-only — candidates see problems through their interview room
    ...(isInterviewer ? [{ name: 'Problems', href: '/dashboard/problems', icon: BookOpen }] : []),
    // System health page for admins only
    ...(role === 'ADMIN' ? [{ name: 'System', href: '/dashboard/system', icon: Server }] : []),
  ];
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();

  if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
    return null;
  }

  if (!isAuthenticated && pathname === '/') {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">SomPheas</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getUserInitials = () => {
    if (!user?.full_name) return 'U';
    return user.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = getNavLinks(user?.role);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href={getDashboardHome(user?.role)} className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">SomPheas</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium">{user?.full_name || 'User'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span>My Account</span>
                {user?.role && (
                  <Badge variant="secondary" className="w-fit text-xs">
                    {user.role}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
