import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleStartTrial = () => {
    navigate(isAuthenticated ? '/dashboard' : '/register');
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    navigate('/register');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/40">
              <span className="text-lg font-semibold text-indigo-400">R</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-semibold tracking-tight">RemiDesk</span>
              <span className="text-xs text-slate-400">AI appointment reminders</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#testimonials" className="hover:text-white">
              Results
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated && (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm text-slate-300 hover:text-white md:inline-flex"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="inline-flex items-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Start free trial
                </button>
              </>
            )}
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:border-indigo-500 hover:text-white"
              >
                Go to dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {/* Hero section */}
        <section className="border-b border-slate-800 bg-[radial-gradient(circle_at_top,_#1d2445,_#020617)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-16 pt-12 md:flex-row md:items-center md:pb-20 md:pt-16">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Reduce no‑shows with AI reminders</span>
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
                Stop losing money from
                <span className="block bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                  missed appointments.
                </span>
              </h1>

              <p className="max-w-xl text-base text-slate-300 sm:text-lg">
                RemiDesk automatically reminds your clients via SMS, WhatsApp and email so they
                actually show up — no manual chasing, no awkward messages, just full chairs and a
                calmer schedule.
              </p>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleStartTrial}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Start free 7‑day trial
                  </button>
                  <p className="small-text text-xs text-slate-300 sm:text-sm">
                    ✔ No card required &nbsp; • &nbsp; Cancel anytime
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  Built for barbers, salons and service businesses that book via phone or WhatsApp.
                </p>
              </div>
            </div>

            {/* Message preview card */}
            <div className="flex-1">
              <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/40">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-slate-400">
                  Example reminder
                </p>
                <div className="space-y-3 rounded-2xl bg-slate-950/60 p-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Sent automatically 24h before
                  </div>
                  <div className="rounded-2xl bg-slate-900 p-4 text-sm leading-relaxed text-slate-100">
                    “Hi James, just a reminder about your haircut tomorrow at 2:00 PM 💈 at
                    FadeHouse Barbers. Reply YES to confirm or text us to reschedule.”
                  </div>
                  <p className="text-xs text-slate-400">
                    Messages are fully customisable for your business and tone of voice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  How RemiDesk works
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">
                  Plug RemiDesk into the way you already book appointments. We handle the
                  follow‑up, confirmations and reminders for you.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 1
                </p>
                <h3 className="mb-2 text-lg font-semibold text-slate-50">Add the booking</h3>
                <p className="text-sm text-slate-300">
                  Type in your client’s name, time and contact details — or sync from your existing
                  system.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 2
                </p>
                <h3 className="mb-2 text-lg font-semibold text-slate-50">We send smart reminders</h3>
                <p className="text-sm text-slate-300">
                  Clients get professional reminders via SMS, WhatsApp or email at the right times
                  — without you lifting a finger.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Step 3
                </p>
                <h3 className="mb-2 text-lg font-semibold text-slate-50">They show up (or reschedule)</h3>
                <p className="text-sm text-slate-300">
                  Fewer no‑shows, more predictable days and a clear view of who’s confirmed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Simple pricing teaser */}
        <section id="pricing" className="border-b border-slate-800 bg-slate-950/90">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                Simple pricing for busy teams
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Start free, then pick a plan that grows with your bookings.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">Starter</h3>
                  <p className="mt-1 text-sm text-slate-300">For solo owners and small teams.</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-50">
                    $12
                    <span className="text-sm font-normal text-slate-400"> / month</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    <li>• Up to 100 reminders each month</li>
                    <li>• SMS, WhatsApp and email channels</li>
                    <li>• Email support</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:border-indigo-400 hover:text-white"
                >
                  Start with Starter
                </button>
              </div>

              <div className="flex flex-col justify-between rounded-2xl border border-indigo-500 bg-gradient-to-b from-indigo-600/20 via-slate-900/80 to-slate-950 p-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-300">
                    Most popular
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-50">Pro</h3>
                  <p className="mt-1 text-sm text-slate-200">For busy salons and multi‑chair shops.</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-50">
                    $39
                    <span className="text-sm font-normal text-slate-300"> / month</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-200">
                    <li>• Up to 1,000 reminders each month</li>
                    <li>• Advanced analytics &amp; reporting</li>
                    <li>• Priority support</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handleStartTrial}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-400"
                >
                  Try Pro free for 7 days
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="bg-slate-950">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                What owners are saying
              </h2>
              <p className="mt-2 text-sm text-slate-300 sm:text-base">
                Early users are already cutting no‑shows and smoothing out their days.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-sm leading-relaxed text-slate-100">
                  “RemiDesk basically paid for itself in the first week. My Friday afternoons used to
                  be full of gaps — now almost every slot is filled.”
                </p>
                <p className="mt-4 text-sm font-medium text-slate-200">Alex, barber in London</p>
              </div>

              <div className="h-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-sm leading-relaxed text-slate-100">
                  “The reminders feel human, not spammy. Clients reply to confirm, and my team spends
                  way less time on the phone.”
                </p>
                <p className="mt-4 text-sm font-medium text-slate-200">Sarah, salon owner in Manchester</p>
              </div>
            </div>
          </div>
        </section>

        {/* Signup CTA */}
        <section className="border-t border-slate-800 bg-slate-950/95">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
            <div className="grid gap-10 md:grid-cols-[minmax(0,_1.2fr)_minmax(0,_1fr)] md:items-center">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
                  Ready to see fewer empty chairs?
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
                  Start your free trial in under 2 minutes. No contracts, no setup fees — just a
                  calmer calendar and more predictable days.
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  You can upgrade, downgrade or cancel at any time.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <form className="space-y-3" onSubmit={handleSignupSubmit}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300" htmlFor="name">
                        Your name
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="Alex Fadehouse"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-300" htmlFor="email">
                        Business email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="you@yourshop.co.uk"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300" htmlFor="phone">
                      Phone / WhatsApp number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      placeholder="+44 7xxx xxxxxx"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-400"
                  >
                    Create my free account
                  </button>
                  <p className="small-text text-xs text-slate-400">
                    ✔ No charge today &nbsp; • &nbsp; 7‑day free trial &nbsp; • &nbsp; Cancel anytime
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
