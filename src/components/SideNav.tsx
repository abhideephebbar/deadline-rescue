import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

const navItems = [
  { id: 'section-triage', label: '01 / Triage' },
  { id: 'section-forecast', label: '02 / Forecast' },
  { id: 'section-telemetry', label: '03 / Load' },
  { id: 'section-stopwatch', label: '04 / Chrono' },
  { id: 'section-radar', label: '05 / Radar' },
];

export function SideNav() {
  const [activeSection, setActiveSection] = useState('section-triage');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.25 }
    );

    navItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed left-0 top-0 z-40 h-screen w-14 lg:w-16 hidden md:flex flex-col justify-center border-r border-white/5 bg-zinc-950/80 backdrop-blur-md">
      {/* Top index label */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-600 -rotate-90 block whitespace-nowrap">
          NAV // RAIL
        </span>
      </div>

      <div className="flex flex-col gap-6 px-4">
        {navItems.map(({ id, label }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className="group relative flex items-center gap-3 py-1 focus:outline-none"
              aria-label={label}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-none transition-all duration-300',
                  isActive
                    ? 'bg-orange-500 scale-150 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                    : 'bg-zinc-700 group-hover:bg-zinc-400'
                )}
              />
              <span
                className={cn(
                  'absolute left-5 font-mono text-[10px] uppercase tracking-widest opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:left-7 whitespace-nowrap pointer-events-none bg-zinc-900/90 border border-white/10 px-2 py-0.5 shadow-xl',
                  isActive ? 'text-orange-400 border-orange-500/30' : 'text-zinc-400'
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom status beacon */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-1.5 h-1.5 bg-emerald-500/80 rounded-none animate-pulse" title="System Online" />
      </div>
    </nav>
  );
}

