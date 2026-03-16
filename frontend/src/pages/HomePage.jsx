import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Easy Booking',
    description:
      'Customers can easily find and book appointments with your business online, 24/7.',
    icon: CalendarIcon,
  },
  {
    name: 'Schedule Management',
    description:
      'Set your availability, manage services, and control your business hours effortlessly.',
    icon: ClockIcon,
  },
  {
    name: 'Customer Management',
    description:
      'Keep track of your customers, appointments, and build lasting relationships.',
    icon: UserGroupIcon,
  },
  {
    name: 'Business Analytics',
    description:
      'Track your performance with insights into bookings, revenue, and customer trends.',
    icon: ChartBarIcon,
  },
];

const HomePage = () => {
  const { isAuthenticated, isBusinessOwner } = useAuth();

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              Simplify Your
              <span className="text-indigo-600"> Appointment</span>
              <br />
              Scheduling with RemiDesk
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              The all-in-one appointment reminder platform for businesses across the UK, Canada,
              and Australia. Start your 7-day free trial — no credit card needed.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                isBusinessOwner() ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/businesses"
                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Find Services
                  </Link>
                )
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Start 7-Day Free Trial
                  </Link>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    View Pricing
                  </Link>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-gray-400">
              🎉 7-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything You Need to Manage Appointments
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features to streamline your business operations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="p-6 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Preview Section */}
      <div className="py-24 bg-gradient-to-br from-indigo-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free, upgrade when you're ready.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Premium Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-1">RemiDesk Premium</h3>
              <p className="text-gray-500 text-sm mb-4">Perfect for small businesses</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">$12</span>
                <span className="text-gray-500 ml-1">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {[
                  '50 appointments/month',
                  'Email & SMS notifications',
                  'Basic dashboard',
                  '180-day analytics view',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/pricing"
                className="block text-center py-2 rounded-xl font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                Learn More
              </Link>
            </div>

            {/* Pro Card */}
            <div className="bg-indigo-600 rounded-2xl shadow-xl p-8 text-white relative">
              <span className="absolute top-4 right-4 text-xs font-bold bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full">
                ⭐ Best Value
              </span>
              <h3 className="text-xl font-bold mb-1">RemiDesk Pro</h3>
              <p className="text-indigo-200 text-sm mb-4">For growing businesses</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">$39</span>
                <span className="text-indigo-200 ml-1">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {[
                  'Unlimited appointments',
                  'Email, SMS & WhatsApp',
                  'Advanced analytics',
                  '1-year data retention',
                  'API access & Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-indigo-100">
                    <CheckCircleIcon className="h-4 w-4 text-green-300 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={isAuthenticated ? '/dashboard/billing' : '/register'}
                className="block text-center py-2 rounded-xl font-semibold text-indigo-700 bg-white hover:bg-indigo-50 transition-colors"
              >
                {isAuthenticated ? 'Upgrade Now' : 'Start Free Trial'}
              </Link>
            </div>
          </div>
          <p className="text-center mt-8 text-gray-500">
            All plans include a{' '}
            <span className="font-semibold text-indigo-600">7-day free trial</span> with full Pro
            features.{' '}
            <Link to="/pricing" className="underline hover:text-indigo-600">
              See full comparison →
            </Link>
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                For Business Owners
              </h2>
              <ul className="space-y-4">
                {[
                  'Accept online bookings 24/7',
                  'Reduce no-shows with automated reminders',
                  'Manage multiple services and staff',
                  'Track revenue and customer insights',
                  'Customize your availability',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-12 lg:mt-0">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                For Customers
              </h2>
              <ul className="space-y-4">
                {[
                  'Book appointments anytime, anywhere',
                  'View real-time availability',
                  'Get confirmation and reminder notifications',
                  'Easy rescheduling and cancellation',
                  'No phone calls needed',
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Streamline Your Bookings?
          </h2>
          <p className="text-indigo-100 mb-2 text-lg">
            Join businesses across the UK, Canada, and Australia already using RemiDesk
          </p>
          <p className="text-indigo-200 mb-8 text-sm">
            7-day free trial · No credit card needed · Cancel anytime
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-indigo-600 bg-white rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Start Free Trial Today
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white border border-indigo-300 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center text-white mb-4 md:mb-0">
              <CalendarIcon className="h-8 w-8 text-indigo-400" />
              <span className="ml-2 text-xl font-bold">RemiDesk</span>
            </div>
            <div className="flex gap-6 text-gray-400 text-sm mb-4 md:mb-0">
              <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link to="/register" className="hover:text-white transition-colors">Free Trial</Link>
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>
            <p className="text-gray-400 text-sm">
              © 2024 RemiDesk. B2B Appointment SaaS for micro businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
