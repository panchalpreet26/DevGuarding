import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  FolderGit2,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/repository', label: 'Repository', icon: FolderGit2 },
  { to: '/chat', label: 'AI Chat', icon: MessageSquare },
  { to: '/guardian', label: 'API Guardian', icon: Shield },
  { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
  { to: '/settings', label: 'Repos', icon: Settings },
] as const;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          'fixed h-screen left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:sticky lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold tracking-tight">DevGuardian</p>
              <p className="text-[11px] text-muted-foreground">AI Engineering Brain</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <Separator />

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-accent hover:text-foreground',
                  isActive && 'bg-accent text-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg border border-border bg-card/60 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">Context engine</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              Answers grounded in your selected repository — not generic model knowledge.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

interface MobileMenuButtonProps {
  onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClick} aria-label="Open menu">
      <Menu className="size-4" />
    </Button>
  );
}
