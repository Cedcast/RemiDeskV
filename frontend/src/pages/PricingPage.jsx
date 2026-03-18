import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
];

const PRICES = {
  premium: { USD: '12.00', GBP: '9.99', CAD: '16.00', AUD: '18.00' },
  pro:     { USD: '39.00', GBP: '31.00', CAD: '52.00', AUD: '59.00' },
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
    { text: 'Custom appointment reminders', included: true },
  ],
};

const FAQ = [
  {
    q: 'Do I need a credit card to start the free trial?',
    a: 'No! Your 3-day free trial gives you full Pro features with no payment method required. You can upgrade at any time.',
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
    a: 'RemiDesk supports businesses in the UK, Canada, Australia, and the US. Payments are processed in your local currency.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept credit/debit cards (via Stripe), Apple Pay, Google Pay, and PayPal for international users.',
  },
  {
    q: 'Can I switch between plans?',
    a: 'Yes. You can upgrade from Premium to Pro at any time. When upgrading, the price difference is prorated.',
  },
];

const PricingPage = () => {
  const [currency, setCurrency] = useState('USD');
  const [openFaq, setOpenFaq] = useState(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency);

  const handleCTA = (tier) => {
    if (isAuthenticated) {
      navigate('/dashboard/billing', { state: { upgradeToTier: tier } });
    } else {
      navigate('/register', { state: { tier, currency } });
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-indigo-600">RemiDesk</span>
          </Link>
          <div className="flex items-center gap-4">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="text-sm text-gray-600 hover:text-indigo-600">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Start Free Trial
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block mb-4 px-4 py-1 rounded-full bg-indigo-500 text-sm font-medium">
            🎉 3-Day Free Trial — No Credit Card Required
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-indigo-100 text-lg">
            Choose the plan that grows with your business. Start free, upgrade anytime.
          </p>
          {/* Currency selector */}
          <div className="mt-8 inline-flex items-center gap-2 bg-indigo-700 rounded-xl p-1">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currency === c.code
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-indigo-100 hover:text-white'
                }`}
              >
                {c.flag} {c.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-5xl mx-auto px-4 -mt-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Premium */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-8 flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900">RemiDesk Premium</h2>
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  Popular
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-6">
                Perfect for small businesses just getting started.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">
                  {selectedCurrency?.symbol}{PRICES.premium[currency]}
                </span>
                <span className="text-gray-500 ml-1">/month</span>
              </div>
              <ul className="space-y-3">
                {FEATURES.premium.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-8 pb-8">
              <button
                onClick={() => handleCTA('premium')}
                className="w-full py-3 rounded-xl font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                Get Premium
              </button>
            </div>
          </div>

          {/* Pro */}
          <div className="bg-indigo-600 rounded-2xl shadow-xl overflow-hidden flex flex-col relative">
            <div className="absolute top-4 right-4">
              <span className="text-xs font-bold bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full">
                ⭐ Best Value
              </span>
            </div>
            <div className="p-8 text-white flex-1">
              <h2 className="text-xl font-bold mb-2">RemiDesk Pro</h2>
              <p className="text-indigo-200 text-sm mb-6">
                Unlimited power for growing businesses.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">
                  {selectedCurrency?.symbol}{PRICES.pro[currency]}
                </span>
                <span className="text-indigo-200 ml-1">/month</span>
              </div>
              <ul className="space-y-3">
                {FEATURES.pro.map((f) => (
                  <li key={f.text} className="flex items-start gap-2 text-sm">
                    <CheckCircleIcon className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <span className="text-indigo-100">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-8 pb-8">
              <button
                onClick={() => handleCTA('pro')}
                className="w-full py-3 rounded-xl font-semibold text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>

        {/* Trial Banner */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <p className="text-green-800 font-semibold text-lg">
            🚀 Start with a 3-day free trial — full Pro features, no credit card needed.
          </p>
          <p className="text-green-600 text-sm mt-1">
            Auto-downgrade after trial. Upgrade anytime before it ends.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="mt-4 inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Start Free Trial
            </Link>
          )}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Full Feature Comparison
          </h2>
          <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 text-gray-700 font-semibold">Feature</th>
                  <th className="text-center py-4 px-6 text-gray-700 font-semibold">Premium</th>
                  <th className="text-center py-4 px-6 text-indigo-600 font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Monthly appointments', '50', 'Unlimited'],
                  ['Email notifications', '✓', '✓'],
                  ['SMS notifications', '✓', '✓'],
                  ['WhatsApp notifications', '—', '✓'],
                  ['Basic dashboard', '✓', '✓'],
                  ['Advanced analytics', '—', '✓'],
                  ['Data retention (live)', '90 days', '1 year'],
                  ['Analytics view', '180 days', '1 year'],
                  ['API access', '—', '✓'],
                  ['Support', 'Email', 'Priority'],
                ].map(([feature, premium, pro]) => (
                  <tr key={feature} className="hover:bg-gray-50">
                    <td className="py-3 px-6 text-sm text-gray-700">{feature}</td>
                    <td className="py-3 px-6 text-sm text-center text-gray-600">{premium}</td>
                    <td className="py-3 px-6 text-sm text-center text-indigo-700 font-medium">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-4 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-900">{item.q}</span>
                  <span className="text-indigo-600 text-xl">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-gray-600 text-sm border-t border-gray-100 pt-3">
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
