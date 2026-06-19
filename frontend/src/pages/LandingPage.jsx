import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Körber Stellium — Learning Portal Landing Page
 * Brand-aligned design: deep navy + signature cyan accent,
 * Space Grotesk display / Inter body / IBM Plex Mono data labels.
 */

const NAV_LINKS = [
  { label: 'Catalog', href: '#catalog' },
  { label: 'Learning paths', href: '#paths' },
  { label: 'For teams', href: '#teams' },
  { label: 'Support', href: '#support' },
];

const STATS = [
  { value: '120+', label: 'Live courses', mono: '/courses' },
  { value: '4,800', label: 'Associates trained', mono: '/learners' },
  { value: '36', label: 'Countries reached', mono: '/global' },
  { value: '98%', label: 'Completion rate', mono: '/outcomes' },
];

const TRACKS = [
  {
    code: 'SAP-DSC',
    title: 'Digital Supply Chain',
    desc: 'Transportation management, warehouse automation, and EWM fundamentals for frontline and consulting teams.',
    hours: '18h',
    level: 'Foundation → Advanced',
  },
  {
    code: 'SAP-MFG',
    title: 'Digital Manufacturing',
    desc: 'Shop-floor execution, MES integration, and worker-centric manufacturing on SAP Digital Manufacturing.',
    hours: '14h',
    level: 'Intermediate',
  },
  {
    code: 'AI-BIZ',
    title: 'Business AI & Analytics',
    desc: 'Applied SAP Business AI, agentic workflows, and data analytics patterns used across live client engagements.',
    hours: '10h',
    level: 'Foundation',
  },
  {
    code: 'CLD-ERP',
    title: 'Cloud ERP Essentials',
    desc: 'Core S/4HANA cloud concepts, implementation methodology, and assessment-readiness practice exams.',
    hours: '22h',
    level: 'Foundation → Advanced',
  },
];

const STEPS = [
  { n: '01', title: 'Get assigned', desc: 'Your manager or admin assigns a learning path tied to your role and project.' },
  { n: '02', title: 'Learn at your pace', desc: 'Work through modules, videos, and hands-on labs — pick up exactly where you left off.' },
  { n: '03', title: 'Prove it', desc: 'Pass role-based assessments and get a verified record added to your profile.' },
];

const KS_LOGO_URL = 'https://koerber-stellium.com/wp-content/uploads/2026/02/Untitled-design-74-e1772357803850.webp';

function KorberStelliumMark({ className = '' }) {
  return (
    <img
      src={KS_LOGO_URL}
      alt="Körber Stellium"
      className={className}
    />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="ks-root">
      <style>{CSS}</style>

      {/* ===== NAVBAR ===== */}
      <header className={`ks-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="ks-nav-inner">
          <a href="/" className="ks-brand" aria-label="Körber Stellium home">
            <KorberStelliumMark className="ks-brand-mark" />
          </a>

          <nav className="ks-nav-links" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href}>{l.label}</a>
            ))}
          </nav>

          <div className="ks-nav-actions">
            <button
              type="button"
              className="ks-btn ks-btn-login"
              onClick={() => navigate('/login')}
            >
              Log in
            </button>
            <button
              type="button"
              className="ks-burger"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="ks-mobile-menu">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
            ))}
            <button type="button" className="ks-btn ks-btn-login ks-btn-block" onClick={() => navigate('/login')}>
              Log in
            </button>
          </div>
        )}
      </header>

      <main>
        {/* ===== HERO ===== */}
        <section className="ks-hero">
          <div className="ks-hero-grid">
            <div className="ks-hero-copy">
              <span className="ks-eyebrow">Körber Stellium · Learning Portal</span>
              <h1>
                Build the skills behind every
                <span className="ks-accent-text"> supply chain transformation.</span>
              </h1>
              <p className="ks-hero-sub">
                The internal learning platform for Körber Stellium associates — structured
                paths across SAP Digital Supply Chain, Manufacturing, Business AI, and Cloud
                ERP, with assessments that count.
              </p>
              <div className="ks-hero-cta">
                <button type="button" className="ks-btn ks-btn-primary" onClick={() => navigate('/login')}>
                  Log in to continue
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <a href="#catalog" className="ks-btn ks-btn-ghost">Browse free catalog</a>
              </div>

              <dl className="ks-stats">
                {STATS.map((s) => (
                  <div key={s.label} className="ks-stat">
                    <dt>{s.value}</dt>
                    <dd>{s.label}<span className="ks-stat-mono">{s.mono}</span></dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Signature element: layered live "course progress" panel */}
            <div className="ks-hero-visual" aria-hidden="true">
              <div className="ks-panel-stack">
                <div className="ks-panel ks-panel-back">
                  <div className="ks-panel-row"><span>EWM Implementation Basics</span><span className="ks-pill ks-pill-done">Complete</span></div>
                  <div className="ks-panel-row"><span>SAP TM on S/4HANA</span><span className="ks-pill ks-pill-progress">62%</span></div>
                </div>
                <div className="ks-panel ks-panel-front">
                  <div className="ks-panel-header">
                    <span className="ks-panel-tag">/ assessment</span>
                    <span className="ks-live-dot" />
                  </div>
                  <h3>Digital Manufacturing — Module 4</h3>
                  <div className="ks-progress-track">
                    <div className="ks-progress-fill" style={{ width: '78%' }} />
                  </div>
                  <div className="ks-panel-footer">
                    <span>78% complete</span>
                    <span className="ks-mono-tag">12 / 14h</span>
                  </div>
                </div>
              </div>
              <div className="ks-glow" />
            </div>
          </div>
        </section>

        {/* ===== LEARNING TRACKS ===== */}
        <section className="ks-tracks" id="catalog">
          <div className="ks-section-head">
            <span className="ks-eyebrow">Learning paths</span>
            <h2>Role-based tracks, built from real engagements</h2>
            <p>Every path mirrors the services Körber Stellium delivers to clients — so what you learn here is what you'll apply on the floor.</p>
          </div>

          <div className="ks-track-grid">
            {TRACKS.map((t) => (
              <article key={t.code} className="ks-track-card">
                <div className="ks-track-top">
                  <span className="ks-track-code">{t.code}</span>
                  <span className="ks-track-hours">{t.hours}</span>
                </div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
                <div className="ks-track-foot">
                  <span>{t.level}</span>
                  <span className="ks-track-arrow">→</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="ks-steps" id="paths">
          <div className="ks-section-head ks-section-head-light">
            <span className="ks-eyebrow ks-eyebrow-light">How it works</span>
            <h2>From assignment to verified completion</h2>
          </div>
          <div className="ks-steps-grid">
            {STEPS.map((s, i) => (
              <div key={s.n} className="ks-step">
                <span className="ks-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < STEPS.length - 1 && <span className="ks-step-connector" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </section>

        {/* ===== CTA BAND ===== */}
        <section className="ks-cta-band" id="teams">
          <div className="ks-cta-inner">
            <div>
              <h2>Already have an account?</h2>
              <p>Pick up your assigned courses, retake an assessment, or check your team's progress.</p>
            </div>
            <button type="button" className="ks-btn ks-btn-primary ks-btn-lg" onClick={() => navigate('/login')}>
              Log in to the portal
            </button>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="ks-footer" id="support">
        <div className="ks-footer-inner">
          <KorberStelliumMark className="ks-footer-mark" />
          <p>© 2026 Körber Stellium. Internal learning platform for associates and partners.</p>
          <a href="https://koerber-stellium.com" target="_blank" rel="noreferrer">koerber-stellium.com</a>
        </div>
      </footer>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');

.ks-root {
  --navy-950: #0A1628;
  --navy-900: #0E2A47;
  --navy-800: #163657;
  --cyan: #00C2D1;
  --cyan-soft: #5FE3EC;
  --surface: #F6F8FA;
  --surface-card: #FFFFFF;
  --slate-600: #5B6B82;
  --slate-300: #C7D2DE;
  --line: rgba(255,255,255,0.10);
  --line-dark: rgba(10,22,40,0.08);
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--surface);
  color: var(--navy-950);
  -webkit-font-smoothing: antialiased;
}

.ks-root h1, .ks-root h2, .ks-root h3 {
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: -0.01em;
  margin: 0;
}

.ks-root a { color: inherit; text-decoration: none; }
.ks-root button { font-family: inherit; cursor: pointer; }
.ks-root *:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

/* ---------- NAV ---------- */
.ks-nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(10,22,40,0.0);
  backdrop-filter: blur(0px);
  transition: background 0.25s ease, backdrop-filter 0.25s ease, box-shadow 0.25s ease;
  background: var(--navy-950);
}
.ks-nav.is-scrolled {
  box-shadow: 0 4px 24px rgba(10,22,40,0.18);
}
.ks-nav-inner {
  max-width: 1280px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 32px;
}
.ks-brand-mark { height: 34px; width: auto; display: block; }
.ks-nav-links { display: flex; gap: 32px; }
.ks-nav-links a {
  color: var(--slate-300); font-size: 14.5px; font-weight: 500;
  transition: color 0.15s ease;
}
.ks-nav-links a:hover { color: #FFFFFF; }
.ks-nav-actions { display: flex; align-items: center; gap: 14px; }

.ks-burger { display: none; flex-direction: column; gap: 4px; background: none; border: none; padding: 6px; }
.ks-burger span { width: 20px; height: 1.5px; background: #fff; border-radius: 2px; }

.ks-mobile-menu {
  display: none;
}

/* ---------- BUTTONS ---------- */
.ks-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 8px; font-weight: 600; font-size: 14.5px;
  border: 1px solid transparent; transition: all 0.15s ease; white-space: nowrap;
}
.ks-btn-login {
  background: transparent; color: #FFFFFF;
  border: 1px solid rgba(255,255,255,0.22);
  padding: 9px 20px;
}
.ks-btn-login:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.4); }

.ks-btn-primary {
  background: var(--cyan); color: var(--navy-950);
  padding: 13px 24px;
  box-shadow: 0 8px 20px rgba(0,194,209,0.25);
}
.ks-btn-primary:hover { background: var(--cyan-soft); transform: translateY(-1px); box-shadow: 0 10px 24px rgba(0,194,209,0.35); }
.ks-btn-primary svg { transition: transform 0.15s ease; }
.ks-btn-primary:hover svg { transform: translateX(2px); }

.ks-btn-ghost {
  color: var(--navy-950); padding: 13px 22px; font-weight: 600;
  border: 1px solid var(--line-dark);
}
.ks-btn-ghost:hover { background: rgba(10,22,40,0.04); }

.ks-btn-lg { padding: 16px 32px; font-size: 16px; }
.ks-btn-block { width: 100%; }

/* ---------- HERO ---------- */
.ks-hero {
  background: var(--navy-950);
  padding: 88px 32px 110px;
  position: relative;
  overflow: hidden;
}
.ks-hero::before {
  content: '';
  position: absolute; inset: 0;
  background:
    radial-gradient(700px 420px at 78% 12%, rgba(0,194,209,0.16), transparent 60%),
    radial-gradient(500px 500px at 0% 100%, rgba(0,194,209,0.06), transparent 60%);
  pointer-events: none;
}
.ks-hero-grid {
  max-width: 1280px; margin: 0 auto;
  display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 64px; align-items: center;
  position: relative; z-index: 1;
}

.ks-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: 0.04em;
  color: var(--cyan-soft); margin-bottom: 22px; text-transform: uppercase;
}
.ks-eyebrow::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); }
.ks-eyebrow-light { color: #0E7C86; }
.ks-eyebrow-light::before { background: #0E7C86; }

.ks-hero h1 {
  color: #FFFFFF; font-size: clamp(34px, 4.2vw, 54px); line-height: 1.08; font-weight: 700;
  max-width: 620px;
}
.ks-accent-text { color: var(--cyan-soft); }

.ks-hero-sub {
  color: var(--slate-300); font-size: 17px; line-height: 1.65;
  max-width: 520px; margin: 22px 0 36px;
}

.ks-hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
.ks-hero .ks-btn-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,0.22); }
.ks-hero .ks-btn-ghost:hover { background: rgba(255,255,255,0.08); }

.ks-stats {
  display: grid; grid-template-columns: repeat(4, max-content); gap: 36px;
  margin: 56px 0 0; padding-top: 32px; border-top: 1px solid var(--line);
}
.ks-stat dt {
  font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; color: #fff;
}
.ks-stat dd {
  margin: 4px 0 0; font-size: 12.5px; color: var(--slate-300); display: flex; flex-direction: column;
}
.ks-stat-mono { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: #3D5470; margin-top: 2px; }

/* ---------- HERO VISUAL ---------- */
.ks-hero-visual { position: relative; height: 420px; }
.ks-panel-stack { position: relative; width: 100%; height: 100%; }
.ks-panel {
  position: absolute; border-radius: 16px;
  background: var(--surface-card);
  box-shadow: 0 30px 60px -20px rgba(0,0,0,0.45);
}
.ks-panel-back {
  width: 92%; top: 14px; right: 0; padding: 22px 24px;
  background: var(--navy-900); border: 1px solid var(--line);
  transform: rotate(-2deg);
}
.ks-panel-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 0; font-size: 13.5px; color: var(--slate-300);
  border-bottom: 1px solid var(--line);
}
.ks-panel-row:last-child { border-bottom: none; }
.ks-pill { font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 4px 9px; border-radius: 999px; }
.ks-pill-done { background: rgba(0,194,209,0.15); color: var(--cyan-soft); }
.ks-pill-progress { background: rgba(255,255,255,0.08); color: var(--slate-300); }

.ks-panel-front {
  width: 88%; bottom: 8px; left: 0; padding: 26px 28px;
  transform: rotate(1.5deg);
}
.ks-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.ks-panel-tag { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--slate-600); }
.ks-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #16C784; box-shadow: 0 0 0 4px rgba(22,199,132,0.18); }
.ks-panel-front h3 { font-size: 19px; font-weight: 600; color: var(--navy-950); margin-bottom: 22px; }
.ks-progress-track { height: 8px; border-radius: 999px; background: #EDF1F5; overflow: hidden; }
.ks-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--cyan), var(--cyan-soft)); }
.ks-panel-footer {
  display: flex; justify-content: space-between; margin-top: 14px;
  font-size: 13px; color: var(--slate-600);
}
.ks-mono-tag { font-family: 'IBM Plex Mono', monospace; font-size: 12px; }

.ks-glow {
  position: absolute; width: 360px; height: 360px; border-radius: 50%;
  background: radial-gradient(circle, rgba(0,194,209,0.22), transparent 70%);
  top: 10%; right: -10%; filter: blur(10px); z-index: 0;
}

/* ---------- SECTION HEAD ---------- */
.ks-section-head { max-width: 640px; margin: 0 auto 52px; text-align: center; }
.ks-section-head h2 { font-size: clamp(26px, 3vw, 36px); font-weight: 700; margin-bottom: 14px; }
.ks-section-head p { color: var(--slate-600); font-size: 16px; line-height: 1.6; }
.ks-section-head-light h2 { color: #FFFFFF; }
.ks-section-head-light p { color: var(--slate-300); }

/* ---------- TRACKS ---------- */
.ks-tracks { max-width: 1280px; margin: 0 auto; padding: 110px 32px; }
.ks-track-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px;
}
.ks-track-card {
  background: var(--surface-card); border-radius: 16px; padding: 28px 24px;
  border: 1px solid var(--line-dark);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.ks-track-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -16px rgba(10,22,40,0.16);
  border-color: rgba(0,194,209,0.4);
}
.ks-track-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.ks-track-code {
  font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: #0E7C86;
  background: rgba(0,194,209,0.10); padding: 4px 9px; border-radius: 6px;
}
.ks-track-hours { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--slate-600); }
.ks-track-card h3 { font-size: 18.5px; font-weight: 600; margin-bottom: 10px; }
.ks-track-card p { font-size: 14px; line-height: 1.55; color: var(--slate-600); margin: 0 0 22px; }
.ks-track-foot {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12.5px; color: var(--slate-600); padding-top: 16px; border-top: 1px solid var(--line-dark);
}
.ks-track-arrow { color: var(--cyan); font-weight: 700; transition: transform 0.15s ease; }
.ks-track-card:hover .ks-track-arrow { transform: translateX(4px); }

/* ---------- STEPS ---------- */
.ks-steps { background: var(--navy-950); padding: 100px 32px; }
.ks-steps-grid {
  max-width: 1100px; margin: 0 auto;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
  position: relative;
}
.ks-step { position: relative; padding: 0 28px; }
.ks-step-n {
  font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--cyan-soft);
  display: block; margin-bottom: 18px;
}
.ks-step h3 { color: #fff; font-size: 19px; margin-bottom: 10px; }
.ks-step p { color: var(--slate-300); font-size: 14.5px; line-height: 1.6; }
.ks-step-connector {
  position: absolute; top: 7px; left: 100%; width: 56px; height: 1px;
  background: linear-gradient(90deg, rgba(0,194,209,0.5), transparent);
  display: none;
}

/* ---------- CTA BAND ---------- */
.ks-cta-band { padding: 90px 32px; background: var(--surface); }
.ks-cta-inner {
  max-width: 1000px; margin: 0 auto; background: var(--navy-900);
  border-radius: 24px; padding: 52px 56px;
  display: flex; align-items: center; justify-content: space-between; gap: 32px;
  position: relative; overflow: hidden;
}
.ks-cta-inner::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(420px 260px at 90% 0%, rgba(0,194,209,0.18), transparent 70%);
}
.ks-cta-inner h2 { color: #fff; font-size: 27px; margin-bottom: 8px; position: relative; z-index: 1; }
.ks-cta-inner p { color: var(--slate-300); font-size: 15px; max-width: 420px; position: relative; z-index: 1; }
.ks-cta-inner .ks-btn { position: relative; z-index: 1; flex-shrink: 0; }

/* ---------- FOOTER ---------- */
.ks-footer { background: var(--navy-950); border-top: 1px solid var(--line); padding: 36px 32px; }
.ks-footer-inner {
  max-width: 1280px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
}
.ks-footer-mark { height: 24px; width: auto; opacity: 0.9; display: block; }
.ks-footer-inner p { color: var(--slate-300); font-size: 13px; }
.ks-footer-inner a { color: var(--cyan-soft); font-size: 13px; font-weight: 500; }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 920px) {
  .ks-nav-links { display: none; }
  .ks-burger { display: flex; }
  .ks-mobile-menu {
    display: flex; flex-direction: column; gap: 4px;
    background: var(--navy-950); padding: 8px 32px 24px;
    border-top: 1px solid var(--line);
  }
  .ks-mobile-menu a { color: var(--slate-300); padding: 12px 0; font-size: 15px; }
  .ks-mobile-menu .ks-btn { margin-top: 12px; }

  .ks-hero-grid { grid-template-columns: 1fr; }
  .ks-hero-visual { height: 320px; margin-top: 20px; }
  .ks-stats { grid-template-columns: repeat(2, max-content); row-gap: 28px; }

  .ks-track-grid { grid-template-columns: repeat(2, 1fr); }
  .ks-steps-grid { grid-template-columns: 1fr; gap: 40px; }

  .ks-cta-inner { flex-direction: column; text-align: center; padding: 40px 28px; }
}

@media (max-width: 540px) {
  .ks-nav-inner { padding: 14px 20px; }
  .ks-hero { padding: 56px 20px 70px; }
  .ks-tracks, .ks-steps, .ks-cta-band { padding: 64px 20px; }
  .ks-track-grid { grid-template-columns: 1fr; }
  .ks-hero-cta { flex-direction: column; align-items: stretch; }
  .ks-hero-cta .ks-btn { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .ks-root * { transition: none !important; animation: none !important; }
}
`;