import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button, Input, Card } from '../../components/common';
import axios from 'axios';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    axios
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

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
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Email Verification</h2>
        </div>

        <Card>
          <Card.Body>
            {status === 'loading' && (
              <div className="text-center py-8">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
                <p className="mt-4 text-sm text-gray-600">Verifying your email address…</p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Email verified!</h3>
                <p className="text-sm text-gray-600">
                  Your email address has been verified successfully. You can now log in to your account.
                </p>
                <Link to="/login">
                  <Button className="w-full mt-2" size="lg">
                    Go to login
                  </Button>
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="text-center">
                  <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
                  <h3 className="mt-2 text-lg font-semibold text-gray-900">Verification failed</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    This verification link is invalid or has expired. Please request a new one.
                  </p>
                </div>

                {!showResend && !resendSent && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowResend(true)}
                  >
                    Resend verification email
                  </Button>
                )}

                {showResend && !resendSent && (
                  <form onSubmit={handleResend} className="space-y-3">
                    <Input
                      label="Your email address"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="you@yourbusiness.com"
                      required
                    />
                    <Button type="submit" loading={resendLoading} className="w-full">
                      Send new link
                    </Button>
                  </form>
                )}

                {resendSent && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    If that email is registered and unverified, a new verification link has been sent.
                  </div>
                )}

                <div className="text-center">
                  <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                    Back to login
                  </Link>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
