import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { Button, Input, Card } from '../../components/common';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
    } catch {
      // Always show generic success (anti-enumeration)
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center">
            <CalendarIcon className="h-12 w-12 text-indigo-600" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Reset your password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <Card>
          <Card.Body>
            {submitted ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  If that email is registered, a password reset link has been sent. Please check
                  your inbox (and spam folder).
                </div>
                <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  autoComplete="email"
                  required
                />
                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Send reset link
                </Button>
                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
