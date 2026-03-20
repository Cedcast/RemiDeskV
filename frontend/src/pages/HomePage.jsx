import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  BellAlertIcon,
  DevicePhoneMobileIcon,
  ArrowRightIcon,
  StarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Footer from '../components/Footer';

const features = [
  {
    name: 'Phone Appointment Entry',
    description: 'Take appointments by phone and log them in seconds. No friction, no training needed.',
    icon: DevicePhoneMobileIcon,
    gradient: 'from-violet-500 to-indigo-500',
  },
  {
    name: 'Automated Reminders',
    description: 'Clients get confirmations + 24h and 2h reminders via SMS, Email, or WhatsApp automatically.',
    icon: BellAlertIcon,
    gradient: 'from-indigo-500 to-cyan-500',
  },
  {
    name: 'Client Management',
    description: 'Full client records, appointment history, and communication logs in one clean view.',
    icon: UserGroupIcon,
    gradient: 'from-cyan-500 to-teal-500',
  },
  {
    name: 'Business Analytics',
    description: 'Revenue trends, no-show rates, and appointment volume at a glance.',
    icon: ChartBarIcon,
    gradient: 'from-teal-500 to-emerald-500',
  },
];

const testimonials = [
  {
    quote: "Cut our no-shows by over 60% in the first month. The WhatsApp reminders are a game-changer.",
    name: "Sarah M.",
    business: "Beauty Clinic · Manchester, UK",
    initials: "SM",
    color: "bg-violet-500",
  },
  {
    quote: "So simple to use. I take the call, enter it in 10 seconds, RemiDesk does the rest.",
    name: "James T.",
    business: "Physio Practice · Toronto, Canada",
    initials: "JT",
    color: "bg-indigo-500",
  },
  {
    quote: "Finally a system built for how we actually work — by phone. Not some online booking widget.",
    name: "Priya K.",
    business: "Dental Practice · Sydney, Australia",
    initials: "PK",
    color: "bg-cyan-600",
  },
];

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-slate-50 text-slate-900">
      {/* Header (match Pricing page style) */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200/80 py-4 px-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-slate-900">RemiDesk</span>
          </Link>
          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="text-sm text-slate-600 hover:text-indigo-700">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                >
                  Start Free Trial
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="text-sm text-indigo-700 hover:underline">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero (corporate, aligned with Pricing) */}
      <div className="px-4 pt-16 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block mb-4 px-4 py-1 rounded-full bg-indigo-50 text-sm font-medium text-indigo-700 border border-indigo-100">
              Phone-first scheduling for real-world teams
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900">
              Reduce no-shows across your whole business.
            </h1>
            <p className="text-slate-600 text-lg">
              Take bookings by phone, keep everything in one shared schedule, and let RemiDesk handle SMS, Email &amp; WhatsApp reminders automatically. AI-personalised copy on Pro keeps messages on-brand and human for vet clinics, therapists, gym owners, salons, barbers and many other small and growing businesses.
            </p>
          </div>

          <div className="mt-10 rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-2xl shadow-slate-900/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 via-violet-500/30 to-cyan-500/40 opacity-70 blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-indigo-100 mb-2 uppercase tracking-wide">
                  Built for service and clinic teams
                </p>
                <p className="text-2xl md:text-3xl font-semibold mb-3">
                  One shared calendar. Multi-channel reminders. Operator-only access.
                </p>
                <ul className="text-indigo-100/90 text-sm md:text-base space-y-1.5">
                  <li>• Log phone bookings in under 10 seconds.</li>
                  <li>• Automated confirmations and reminders over SMS, Email &amp; WhatsApp.</li>
                  <li>• AI-written reminder copy on Pro that feels natural, not robotic.</li>
                </ul>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-5 min-w-[230px]">
                <p className="text-xs uppercase tracking-wide text-indigo-100 mb-1">Designed for</p>
                <p className="text-sm font-medium text-white mb-2">
                  Built for vet clinics, therapists, gyms, salons, barbers and many other small and growing businesses.
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-extrabold">$15</span>
                  <span className="text-sm text-indigo-100">/month · Premium</span>
                </div>
                <p className="text-xs text-indigo-100 mb-3">7-day free trial · No credit card</p>
                {isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="mt-1 w-full inline-flex items-center justify-center py-2.5 rounded-xl font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-sm text-sm"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/register"
                    className="mt-1 w-full inline-flex items-center justify-center py-2.5 rounded-xl font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1 text-sm"
                  >
                    Start free with Pro
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SOCIAL PROOF BAR ───────────────────────────────────── */}
      <div className="border-y border-slate-200 bg-white py-5 mt-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center items-center gap-x-10 gap-y-3 text-sm text-slate-500">
          <span className="flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4 text-emerald-500" /> SOC 2 Ready</span>
          <span className="text-slate-300">|</span>
          <span>🇬🇧 UK &nbsp;·&nbsp; 🇨🇦 Canada &nbsp;·&nbsp; 🇦🇺 Australia</span>
          <span className="text-slate-300">|</span>
          <span>📲 SMS · Email · WhatsApp</span>
          <span className="text-slate-300">|</span>
          <span>⚡ AI-personalised reminders (Pro) · No client app required</span>
        </div>
      </div>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <div className="py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Everything in one place
          </h2>
          <p className="mt-4 text-slate-600 text-lg max-w-xl mx-auto">
            From booking to reminder to follow-up — RemiDesk handles it all.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="group relative rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-200 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}>
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">{feature.name}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <div className="py-24 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How it works</h2>
            <p className="mt-4 text-slate-600 text-lg">
              Three steps. Zero friction. Your clients never need an account.
            </p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'You take the call',
                desc: 'Client phones in. You enter the booking into RemiDesk in under 10 seconds — name, service, time, done.',
                color: 'from-violet-500 to-indigo-500',
              },
              {
                step: '02',
                title: 'We notify them',
                desc: 'Instant confirmation goes out. Then automatic 24h and 2h reminders via their preferred channel.',
                color: 'from-indigo-500 to-blue-500',
              },
              {
                step: '03',
                title: 'They reschedule if needed',
                desc: 'One-tap reschedule link included in every reminder. No login, no friction — just a smooth experience.',
                color: 'from-blue-500 to-cyan-500',
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <span className="text-white font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-center">
            <p className="text-indigo-800 text-sm">
              🔒 <strong className="text-indigo-900">RemiDesk is operator-only.</strong> Your clients receive notifications and can reschedule via a secure link — no account, no app, no hassle.
            </p>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ───────────────────────────────────────── */}
      <div className="py-24 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Loved by businesses</h2>
            <p className="mt-3 text-slate-600">Across the UK, Canada and Australia</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-slate-900 text-sm font-medium">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.business}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PRICING ────────────────────────────────────────────── */}
      <div className="py-24 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Simple pricing</h2>
            <p className="mt-3 text-slate-600 text-lg">Start free. No credit card. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Premium */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-1">Premium</h3>
              <p className="text-slate-600 text-sm mb-5">For growing small businesses</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-slate-900">$15</span>
                <span className="text-slate-500 ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['50 appointments/month', 'Email & SMS reminders', 'Client dashboard', '180-day analytics', 'Email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className="block text-center py-2.5 rounded-xl font-semibold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors">
                Learn More
              </Link>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-600 to-violet-600 p-8 shadow-xl shadow-indigo-500/20 text-white">
              <span className="absolute -top-3.5 right-6 text-xs font-bold bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-3 py-1 rounded-full">
                ⭐ Best Value
              </span>
              <h3 className="text-xl font-bold text-white mb-1">Pro</h3>
              <p className="text-indigo-100 text-sm mb-5">For established businesses</p>
              <div className="mb-6">
                <span className="text-5xl font-extrabold text-white">$38.99</span>
                <span className="text-indigo-100 ml-1">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited appointments', 'Email, SMS & WhatsApp', 'Advanced analytics', '1-year data retention', 'Priority support'].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-indigo-50">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={isAuthenticated ? '/dashboard/billing' : '/register'}
                className="block text-center py-2.5 rounded-xl font-semibold text-indigo-700 bg-white hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/20"
              >
                {isAuthenticated ? 'Upgrade Now' : 'Start Free Trial'}
              </Link>
            </div>
          </div>
          <p className="text-center mt-8 text-gray-500 text-sm">
            All plans include a <span className="text-indigo-400 font-semibold">7-day free trial</span> with full Pro features.{' '}
            <Link to="/pricing" className="text-gray-400 underline hover:text-indigo-400 transition-colors">See full comparison →</Link>
          </p>
        </div>
      </div>

      {/* ── FINAL CTA ──────────────────────────────────────────── */}
      <div className="py-24 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="relative rounded-3xl bg-slate-900 text-white px-8 py-12 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 via-violet-500/40 to-cyan-500/40 opacity-60 blur-3xl" />
            <div className="relative">
              <h2 className="text-4xl sm:text-5xl font-bold mb-5">
                Ready to eliminate<br />no-shows?
              </h2>
              <p className="text-indigo-100 text-lg mb-8">
                Join businesses across the UK, Canada &amp; Australia already running on RemiDesk.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-slate-900 bg-white rounded-xl hover:bg-slate-100 transition-all shadow-lg shadow-slate-900/30"
                >
                  Start Free Trial <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-transparent border border-indigo-200 rounded-xl hover:bg-indigo-500/20 transition-all"
                >
                  View Pricing
                </Link>
              </div>
              <p className="mt-5 text-sm text-indigo-100">7-day free trial &middot; No credit card &middot; Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;
