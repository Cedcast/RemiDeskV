import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card } from '../../components/common';
import { CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [unverified, setUnverified] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setUnverified(false);
    try {
      const userData = await login(email, password);
      toast.success('Welcome back!');
      if (userData?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.detail || 'Invalid email or password';

      if (status === 403 && message.toLowerCase().includes('verify your email')) {
        setUnverified(true);
      } else {
        toast.error(message);
        setErrors({ general: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top nav */}
      <header className="border-b border-slate-900/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/90">
              <CalendarIcon className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-50">
              RemiDesk
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              to="/pricing"
              className="hidden sm:inline-flex px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              to="/"
              className="inline-flex px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            >
              Back to homepage
            </Link>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 lg:gap-10 items-center">
          {/* Brand / story side */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-600 via-violet-600 to-slate-900 p-6 sm:p-8 text-slate-50 shadow-xl">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_#fff_0,_transparent_55%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/40 bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Fewer no-shows, fuller calendar
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
                  Automated reminders that clients don&rsquo;t ignore.
                </h1>
                <p className="mt-3 text-sm sm:text-base text-indigo-100/90 max-w-xl">
                  Smart, channel-aware nudges that adapt to each client and keep your calendar full.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm text-sm">
                <div className="rounded-xl bg-indigo-950/50 border border-indigo-400/30 p-3">
                  <p className="text-xs text-indigo-200">Average reduction in no-shows</p>
                  <p className="mt-1 text-lg font-semibold">-42%</p>
                </div>
                <div className="rounded-xl bg-indigo-950/40 border border-indigo-300/30 p-3">
                  <p className="text-xs text-indigo-200">Time saved on follow-ups</p>
                  <p className="mt-1 text-lg font-semibold">3 hrs / week</p>
                </div>
              </div>

              <p className="text-xs text-indigo-100/80 max-w-xs">
                RemiDesk uses AI to send reminders at the right moment, over the channels your
                clients actually respond to.
              </p>
            </div>
          </div>

          {/* Auth form side */}
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50">
                Sign in to your dashboard
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Manage your schedule, clients, and AI reminders in one place.
              </p>
            </div>

            <Card className="bg-slate-950/60 border-slate-800 shadow-xl shadow-slate-950/40">
              <Card.Body>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-sm text-red-100">
                      {errors.general}
                    </div>
                  )}

                  {unverified && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-sm text-amber-100">
                      Please verify your email before logging in.{' '}
                      <Link
                        to="/check-email"
                        className="font-medium underline underline-offset-2 hover:text-amber-50"
                      >
                        Resend verification email
                      </Link>
                    </div>
                  )}

                  <Input
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    placeholder="you@yourbusiness.com"
                    autoComplete="email"
                  />

                  <div>
                    <Input
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={errors.password}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <div className="mt-1 text-right">
                      <Link
                        to="/forgot-password"
                        className="text-xs sm:text-sm font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </div>

                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    Sign in
                  </Button>
                </form>
              </Card.Body>
            </Card>

            <p className="mt-4 text-sm text-slate-400">
              New to RemiDesk?{' '}
              <Link
                to="/register"
                className="font-medium text-indigo-400 hover:text-indigo-300"
              >
                Create a business account
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
