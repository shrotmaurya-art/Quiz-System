import { NavLink, Outlet } from 'react-router-dom';
import { useBranding } from '../shared/BrandingContext';

const NAV_ITEMS = [
  { to: '/admin/live',      label: 'Live Control',      icon: 'sensors' },
  { to: '/admin/matches',   label: 'Matches',           icon: 'emoji_events' },
  { to: '/admin/rounds',    label: 'Rounds & Questions', icon: 'quiz' },
  { to: '/admin/candidates', label: 'Candidates',        icon: 'groups' },
  { to: '/admin/settings',  label: 'Settings / Backup',  icon: 'settings' },
];

function SidebarLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        isActive
          ? 'flex items-center gap-4 bg-secondary/10 text-secondary border-l-4 border-secondary px-6 py-4 shadow-[0_0_15px_rgba(240,192,62,0.2)] font-label-caps text-label-caps'
          :           'flex items-center gap-4 text-on-surface-variant px-6 py-4 hover:bg-surface-container-highest hover:text-on-surface hover:translate-x-1 transition-all group font-label-caps text-label-caps'
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`material-symbols-outlined ${isActive ? '' : 'group-hover:translate-x-1 transition-transform duration-200'}`}
            style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {icon}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { schoolName, brandLogoUrl } = useBranding();
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 h-full bg-surface-container-low/95 backdrop-blur-2xl border-r border-secondary/20 shadow-[inset_0_0_20px_rgba(196,192,255,0.05)] fixed left-0 top-0 z-40 pt-24 flex flex-col justify-between">
        {/* Header */}
        <div className="px-6 py-8 border-b border-outline/10">
          {brandLogoUrl && (
            <img
              src={brandLogoUrl}
              alt={`${schoolName} logo`}
              className="w-10 h-10 mb-3 rounded-lg object-contain"
            />
          )}
          <h1 className="text-secondary font-display-lg text-headline-md leading-tight drop-shadow-[0_0_10px_rgba(240,192,62,0.3)]">
            {schoolName || 'CONTROL ROOM'}
          </h1>
          <p className="font-label-caps text-[11px] text-on-surface-variant mt-2 tracking-widest uppercase">
            Live Broadcast Mode
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 flex flex-col gap-2 font-label-caps text-label-caps">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <SidebarLink key={to} to={to} label={label} icon={icon} />
          ))}
        </nav>

        {/* GO LIVE CTA */}
        <div className="px-6 py-4 border-t border-outline/10">
          <button className="w-full bg-error text-on-error font-label-caps text-label-caps py-3 rounded hover:bg-error/90 transition-colors shadow-[0_0_15px_rgba(147,0,10,0.5)] animate-pulse font-bold tracking-widest uppercase">
            GO LIVE
          </button>
        </div>

        {/* Bottom */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <a className="flex items-center gap-3 text-on-surface-variant px-2 py-2 hover:text-on-surface transition-colors text-sm" href="#">
            <span className="material-symbols-outlined text-[18px]">help</span>
            <span className="font-label-caps text-label-caps text-xs">Help Center</span>
          </a>
          <a className="flex items-center gap-3 text-on-surface-variant px-2 py-2 hover:text-on-surface transition-colors text-sm" href="#">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            <span className="font-label-caps text-label-caps text-xs">System Logs</span>
          </a>
        </div>
      </aside>

      {/* ── Top bar ── */}
      <header className="fixed top-0 left-64 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-secondary/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-between items-center px-margin-desktop py-4 h-20">
          <div className="font-display-lg text-headline-md font-black tracking-tighter text-secondary drop-shadow-[0_0_10px_rgba(240,192,62,0.5)]">
            THE HOT SEAT
          </div>
          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant hover:text-secondary transition-all duration-300 active:scale-95">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-secondary transition-all duration-300 active:scale-95">
              <span className="material-symbols-outlined">settings_suggest</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="ml-64 pt-24 flex-1 h-full overflow-y-auto relative z-10 px-margin-desktop py-12">
        <div className="max-w-container-max mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
