import { useState } from 'react';
import { Radar, Menu, X, LayoutDashboard, History, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

interface HeaderProps {
  user?: { name: string; email: string } | null;
  onLogout?: () => void;
  currentPath?: string;
}

export default function Header({ user, onLogout, currentPath }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'History', href: '/history', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-3 text-white focus-visible:outline-offset-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
            <Radar className="h-4.5 w-4.5" style={{ color: 'var(--color-cpcb)' }} aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              GeoMine <span style={{ color: 'var(--color-cpcb)' }}>AI</span>
            </span>
            <span className="font-mono-tight text-[10px] text-[var(--color-muted)] mt-1">
              Environmental &amp; Mining Compliance Intelligence
            </span>
          </span>
        </Link>

        {user && (
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md ${
                    isActive 
                      ? 'text-white bg-[var(--color-surface)] border border-[var(--color-border)]' 
                      : 'text-[var(--color-muted-strong)] hover:text-white hover:bg-[var(--color-surface)]/50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {user && (
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-[var(--color-muted-strong)]">
              Hi, <span className="font-medium text-white">{user.name}</span>
            </span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-white hover:bg-[var(--color-surface)] rounded-md border border-transparent hover:border-[var(--color-border)] transition-all"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Log out</span>
              </button>
            )}
          </div>
        )}

        {user && (
          <button
            type="button"
            className="md:hidden p-2 text-[var(--color-muted-strong)] hover:text-white rounded-md border border-transparent hover:border-[var(--color-border)] transition-colors"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {menuOpen && user && (
          <motion.nav
            id="mobile-nav"
            aria-label="Mobile navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-background)]"
          >
            <div className="flex flex-col px-4 py-2">
              <div className="py-3 text-sm text-[var(--color-muted)] border-b border-[var(--color-border)] mb-2">
                Signed in as <span className="font-medium text-white">{user.email}</span>
              </div>
              
              {navItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'text-[var(--color-cpcb)]' : 'text-[var(--color-muted-strong)] hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              
              {onLogout && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-3 py-3 text-sm font-medium text-red-400 hover:text-red-300 transition-colors mt-2 border-t border-[var(--color-border)]"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
