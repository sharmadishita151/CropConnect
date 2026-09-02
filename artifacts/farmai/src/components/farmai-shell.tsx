import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Bell, ChevronDown, CircleHelp, LayoutDashboard, ListChecks, LogOut, Menu, Settings, ShoppingBag, Sprout, X } from 'lucide-react';
import type { AuthUser } from '@workspace/api-client-react';
import { getCopy, languageNames, type Language } from '@/lib/i18n';

type Props = {
  user: AuthUser;
  language: Language;
  setLanguage: (language: Language) => void;
  children: React.ReactNode;
};

export function FarmAIShell({ user, language, setLanguage, children }: Props) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = getCopy(language);
  const isBuyer = user.role === 'buyer';
  const navItems = useMemo(() => isBuyer
    ? [{ href: '/buyer', label: t.dashboard, icon: LayoutDashboard }, { href: '/buyer/orders', label: t.orders, icon: ShoppingBag }]
    : [{ href: '/farmer', label: t.dashboard, icon: LayoutDashboard }, { href: '/farmer/listings', label: t.listings, icon: ListChecks }], [isBuyer, t.dashboard, t.listings, t.orders]);

  useEffect(() => setMobileOpen(false), [location]);

  function signOut() {
    localStorage.removeItem('farmai-user');
    setLocation('/');
  }

  return (
    <div className="texture min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col bg-sidebar px-4 py-5 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-9 flex items-center justify-between px-3">
          <Link href={isBuyer ? '/buyer' : '/farmer'} className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"><Sprout size={21} strokeWidth={2.4} /></span>
            <span><strong className="font-display text-xl tracking-tight">CropConnect</strong><span className="block text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/55">{t.marketLabel}</span></span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/20 md:hidden" aria-label={t.closeMenu} data-testid="button-close-menu"><X size={18} /></button>
        </div>
        <div className="mb-5 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-sidebar-foreground/40">{isBuyer ? t.buyer : t.farmer} {t.workspace}</div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = location === item.href || (item.href === '/farmer' && location === '/farmer/') || (item.href === '/buyer' && location === '/buyer/');
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}><Icon size={18} /><span>{item.label}</span>{active && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary-foreground/70" />}</Link>;
          })}
        </nav>
        <div className="mt-auto space-y-1">
          <Link href="/settings" className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${location === '/settings' ? 'bg-sidebar-accent/35 text-sidebar-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground'}`} data-testid="link-nav-settings"><Settings size={18} /><span>{t.settings}</span></Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent/20 hover:text-sidebar-foreground" data-testid="button-sidebar-signout"><LogOut size={18} /><span>{t.signOut}</span></button>
          <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4">
            <div className="grid size-9 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground" data-testid="avatar-sidebar">{(user.name || user.phone).slice(0, 1).toUpperCase()}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold" data-testid="text-sidebar-user">{user.name || user.phone}</p><p className="truncate text-xs text-sidebar-foreground/45">{user.phone}</p></div>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-foreground/30 md:hidden" onClick={() => setMobileOpen(false)} aria-label={t.closeNavigation} data-testid="button-overlay-menu" />}
      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-border bg-card p-2.5 md:hidden" aria-label={t.openMenu} data-testid="button-open-menu"><Menu size={19} /></button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" /> {t.today}, {new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'mr-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="global-language">{t.language}</label>
            <select id="global-language" value={language} onChange={(e) => setLanguage(e.target.value as Language)} className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-ring/20" data-testid="select-global-language">
              {Object.entries(languageNames).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
            </select>
            <button className="relative rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30" aria-label={t.notifications} data-testid="button-notifications"><Bell size={17} /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /></button>
            <Link href="/settings" className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-muted sm:flex" data-testid="link-header-profile"><span className="grid size-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{(user.name || 'F').slice(0, 1).toUpperCase()}</span><ChevronDown size={14} className="text-muted-foreground" /></Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 pb-24 md:px-8 md:py-9 md:pb-10">{children}</main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-20 flex items-center justify-around rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur md:hidden">
        {navItems.map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={`grid min-w-[74px] place-items-center gap-1 rounded-xl py-2 text-[10px] font-semibold ${location === item.href ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s/g, '-')}`}><Icon size={18} /><span>{item.label}</span></Link>; })}
        <Link href="/settings" className={`grid min-w-[74px] place-items-center gap-1 rounded-xl py-2 text-[10px] font-semibold ${location === '/settings' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} data-testid="link-mobile-settings"><Settings size={18} /><span>{t.settings}</span></Link>
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="font-display text-3xl font-semibold tracking-[-.035em] text-foreground sm:text-[38px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

export function LoadingBlock({ label }: { label: string }) {
  return <div className="rounded-2xl border border-border bg-card p-8" data-testid="status-loading"><div className="flex items-center gap-3"><span className="size-2 animate-pulse rounded-full bg-primary" /><span className="text-sm text-muted-foreground">{label}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-20 animate-pulse rounded-xl bg-muted" /></div></div>;
}

export function ErrorBlock({ label, onRetry, language = 'en' }: { label: string; onRetry: () => void; language?: Language }) {
  return <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center" data-testid="status-error"><CircleHelp className="mx-auto mb-3 text-destructive" size={25} /><p className="text-sm text-foreground">{label}</p><button onClick={onRetry} className="mt-4 rounded-lg bg-destructive px-4 py-2 text-xs font-bold text-destructive-foreground transition-transform hover:-translate-y-0.5" data-testid="button-retry">{getCopy(language).retry}</button></div>;
}

export function EmptyBlock({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center" data-testid="status-empty"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent/30 text-primary"><Sprout size={23} /></div><h3 className="font-display text-lg font-semibold">{title}</h3>{detail && <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>}{action && <div className="mt-5">{action}</div>}</div>;
}