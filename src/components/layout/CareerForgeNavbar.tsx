import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Code,
  Video,
  FileText,
  BarChart3,
  LogOut,
  User,
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { cn } from '@/utils/cn';
import ThemeToggle from '../ui/ThemeToggle';

const CareerForgeNavbar = () => {
  const location = useLocation();
  const { user, logout } = useUser();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/study-materials', label: 'Study Materials', icon: BookOpen },
    { to: '/study-planner', label: 'Study Planner', icon: Calendar },
    { to: '/interviewhub', label: 'InterviewHub', icon: Video },
    { to: '/resume-analyzer', label: 'Resume Studio', icon: FileText },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-[var(--surface-glass)] backdrop-blur-md border-b border-[var(--border)] text-[var(--text-primary)] z-50 flex items-center justify-between px-6 sm:px-8">
      
      {/* Brand logo */}
      <Link to="/dashboard" className="flex items-center gap-2.5 group">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] flex items-center justify-center shadow-[0_0_15px_rgba(124,92,252,0.2)] group-hover:scale-[1.03] transition-all">
          <Code className="w-4 h-4 text-[var(--text-inverse)]" />
        </div>
        <span className="font-extrabold text-sm tracking-widest uppercase bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent" style={{ fontFamily: 'Sora, sans-serif' }}>
          CareerForge
        </span>
      </Link>

      {/* Nav items */}
      <div className="hidden lg:flex items-center gap-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'relative px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 hover:text-[var(--text-primary)]',
                isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavBg"
                  className="absolute inset-0 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] -z-10"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[var(--violet)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]')} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        {user ? (
          <div className="flex items-center gap-3">
            {/* User Profile display */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {user.full_name || user.email?.split('@')[0] || 'User'}
              </span>
              {user.xp !== undefined && (
                <span className="text-[10px] text-[var(--violet)] font-semibold uppercase tracking-wider">
                  {user.xp} XP
                </span>
              )}
            </div>
            
            {/* Avatar block */}
            <div className="h-8 w-8 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-[var(--violet)]" />
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={() => logout()}
              className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:bg-[var(--rose)]/10 hover:border-[var(--rose)]/30 hover:text-[var(--rose)] transition-all text-[var(--text-secondary)] active:scale-[0.98]"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] hover:opacity-95 text-[var(--text-inverse)] font-semibold text-xs transition-all shadow-md active:scale-[0.98]"
          >
            Get Started
          </Link>
        )}
      </div>

    </nav>
  );
};

export default CareerForgeNavbar;