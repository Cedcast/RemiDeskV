import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card } from '../../components/common';
import { CalendarIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || null,
        role: 'business_owner',
      });

      toast.success('Account created! Please check your email to verify your account.');
      navigate('/check-email');
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      setErrors({ general: message });
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
              to="/login"
              className="inline-flex px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            >
              Back to login
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
                Set up your business once and let RemiDesk handle reminders, reschedules, and
                follow-ups in the background.
              </p>
            </div>
          </div>

          {/* Auth form side */}
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-50">
                Create your RemiDesk account
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Start reducing no-shows with AI-powered reminders in just a few minutes.
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

                  <Input
                    label="Full name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    error={errors.full_name}
                    placeholder="Jane Smith"
                    autoComplete="name"
                  />

                  <Input
                    label="Email address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="you@yourbusiness.com"
                    autoComplete="email"
                  />

                  <Input
                    label="Phone number (optional)"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+44 7700 900000"
                    autoComplete="tel"
                  />

                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />

                  <Input
                    label="Confirm password"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />

                  <Button type="submit" loading={loading} className="w-full" size="lg">
                    Create account
                  </Button>
                </form>
              </Card.Body>
            </Card>

            <p className="mt-4 text-sm text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
