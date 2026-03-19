import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { Button, Input, Card } from '../../components/common';
import axios from 'axios';

const CheckEmailPage = () => {
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleResend = async (e) => {
    e.preventDefault();
    setResendLoading(true);
    try {
      await axios.post('/api/auth/resend-verification', { email: resendEmail });
    } catch {
      // Always show generic success (anti-enumeration)
    } finally {
      setResendLoading(false);
      setResendSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center">
            <CalendarIcon className="h-12 w-12 text-indigo-600" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Check your email</h2>
        </div>

        <Card>
          <Card.Body className="space-y-6">
            <div className="text-center">
              <EnvelopeIcon className="mx-auto h-16 w-16 text-indigo-500" />
              <p className="mt-4 text-sm text-gray-700">
                We've sent a verification link to your email address. Please check your inbox (and
                spam folder) and click the link to activate your account.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Didn't receive the email?</p>

              {!resendSent ? (
                <form onSubmit={handleResend} className="space-y-3">
                  <Input
                    label="Your email address"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@yourbusiness.com"
                    required
                  />
                  <Button type="submit" loading={resendLoading} variant="outline" className="w-full">
                    Resend verification email
                  </Button>
                </form>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  If that email is registered and unverified, a new verification link has been sent.
                </div>
              )}
            </div>

            <div className="text-center">
              <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Back to login
              </Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default CheckEmailPage;
