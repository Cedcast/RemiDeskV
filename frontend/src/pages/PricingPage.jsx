import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const PRICES = {
  premium: '15.00',
  pro: '38.99',
};

const FEATURES = {
  premium: [
    { text: 'Up to 50 appointments/month', included: true },
    { text: 'Email & SMS notifications', included: true },
    { text: 'Basic dashboard', included: true },
    { text: '180-day analytics view (read-only after 90 days)', included: true },
    { text: 'Email support', included: true },
    { text: 'WhatsApp notifications', included: false },
    { text: 'Advanced analytics & reporting', included: false },
    { text: 'API access', included: false },
    { text: 'Priority support', included: false },
  ],
  pro: [
    { text: 'Unlimited appointments', included: true },
    { text: 'Email & SMS notifications', included: true },
    { text: 'WhatsApp notifications', included: true },
    { text: 'Advanced analytics & reporting', included: true },
    { text: '1-year data retention', included: true },
    { text: 'API access', included: true },
    { text: 'Priority support', included: true },
    { text: 'AI-personalised appointment reminders (Pro only)', included: true },
  ],
};

const FAQ = [
  {
    q: 'Do I need a credit card to start the free trial?',
    a: 'No! Your 7-day free trial gives you full Pro features with no payment method required. You can upgrade at any time.',
  },
  {
    q: 'What happens after the 3-day trial?',
    a: 'After your trial ends, your account will be paused. You can choose either Premium or Pro to continue using RemiDesk.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, you can cancel your subscription at any time. You will retain access until the end of your current billing period.',
  },
  {
    q: 'Which countries are supported?',
    a: 'RemiDesk supports businesses in the UK, Canada, Australia, and the US. All payments are processed in USD via Paystack.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept card payments via Paystack.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. You can upgrade from Premium to Pro at any time. When upgrading, the price difference is prorated.',
  },
];

const PricingPage = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCTA = (tier) => {
    if (isAuthenticated) {
      navigate('/dashboard/billing', { state: { upgradeToTier: tier } });
    } else {
      navigate('/register', { state: { tier } });
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
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

      {/* Hero */}
      <div className="px-4 pt-14 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block mb-4 px-4 py-1 rounded-full bg-indigo-50 text-sm font-medium text-indigo-700 border border-indigo-100">
            🎉 7-Day Free Trial — No Credit Card Required
          </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-slate-900">Simple, Transparent Pricing</h1>
            <p className="text-slate-600 text-lg">
              Choose the plan that grows with your business. Start free, upgrade anytime.
            </p>
          </div>

          {/* Hero card */}
          <div className="mt-10 rounded-3xl bg-slate-900 text-white p-8 md:p-10 shadow-2xl shadow-slate-900/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 via-violet-500/30 to-cyan-500/40 opacity-70 blur-3xl" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-xl">
                <p className="text-sm font-semibold text-indigo-100 mb-2 uppercase tracking-wide">Built for phone-first businesses</p>
                <p className="text-2xl md:text-3xl font-semibold mb-3">
                  Reduce no-shows with AI-personalised reminders.
                </p>
                <p className="text-indigo-100/90 text-sm md:text-base">
                  Start in minutes. Take bookings by phone, and let RemiDesk handle confirmations and follow-up via SMS, Email &amp; WhatsApp. AI-written reminder copy on Pro keeps things human, not robotic.
                </p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-5 min-w-[220px]">
                <p className="text-xs uppercase tracking-wide text-indigo-100 mb-1">From</p>
                <p className="text-3xl font-extrabold">$12<span className="text-base font-normal text-indigo-100">/mo</span></p>
                <p className="text-xs text-indigo-100 mt-1">7-day free trial · No card</p>
                <button
                  onClick={() => handleCTA('pro')}
                  className="mt-4 w-full py-2.5 rounded-xl font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-sm flex items-center justify-center gap-1 text-sm"
                >
                  Start free with Pro
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 pb-16 -mt-8 md:-mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Premium */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-slate-900">RemiDesk Premium</h2>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-6">
                Perfect for small businesses just getting started.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">
                  ${PRICES.premium}
                </span>
                <span className="text-slate-500 ml-1">/month</span>
              </div>
              <ul className="space-y-3">
                {FEATURES.premium.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-8 pb-8">
              <button
                onClick={() => handleCTA('premium')}
                className="w-full py-3 rounded-xl font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                Get Premium
              </button>
            </div>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-xl overflow-hidden flex flex-col relative text-white">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full">
                ⭐ Best Value
              </span>
            </div>
            <div className="p-8 text-white flex-1">
              <h2 className="text-xl font-bold mb-2">RemiDesk Pro</h2>
              <p className="text-indigo-100 text-sm mb-6">
                Unlimited power for growing businesses.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">
                  ${PRICES.pro}
                </span>
                <span className="text-indigo-100 ml-1">/month</span>
              </div>
              <ul className="space-y-3">
                {FEATURES.pro.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    <CheckCircleIcon className="h-5 w-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                    <span className="text-indigo-50">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-8 pb-8">
              <button
                onClick={() => handleCTA('pro')}
                className="w-full py-3 rounded-xl font-semibold text-indigo-700 bg-white hover:bg-indigo-50 transition-colors shadow-md shadow-indigo-900/20"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>

        {/* Trial Banner */}
        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <p className="text-emerald-900 font-semibold text-lg">
            🚀 Start with a 7-day free trial — full Pro features, no credit card needed.
          </p>
          <p className="text-emerald-700 text-sm mt-1">
            Auto-downgrade after trial. Upgrade anytime before it ends.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="mt-4 inline-flex items-center px-6 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Start Free Trial
            </Link>
          )}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Full Feature Comparison
          </h2>
          <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-4 px-6 text-slate-700 font-semibold">Feature</th>
                  <th className="text-center py-4 px-6 text-slate-700 font-semibold">Premium</th>
                  <th className="text-center py-4 px-6 text-indigo-700 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Monthly appointments', '50', 'Unlimited'],
                  ['Email notifications', '✓', '✓'],
                  ['SMS notifications', '✓', '✓'],
                  ['WhatsApp notifications', '—', '✓'],
                  ['AI-personalised reminders', '—', '✓'],
                  ['Basic dashboard', '✓', '✓'],
                  ['Advanced analytics', '—', '✓'],
                  ['Data retention (live)', '90 days', '1 year'],
                  ['Analytics view', '180 days', '1 year'],
                  ['API access', '—', '✓'],
                  ['Support', 'Email', 'Priority'],
                ].map(([feature, premium, pro]) => (
                  <tr key={feature} className="hover:bg-slate-50">
                    <td className="py-3 px-6 text-sm text-slate-700">{feature}</td>
                    <td className="py-3 px-6 text-sm text-center text-slate-600">{premium}</td>
                    <td className="py-3 px-6 text-sm text-center text-indigo-700 font-medium">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-900">{item.q}</span>
                  <span className="text-indigo-600 text-xl">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-slate-600 text-sm border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
