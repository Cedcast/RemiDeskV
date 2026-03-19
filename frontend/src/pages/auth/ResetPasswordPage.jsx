import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, Input, Card } from '../../components/common';
import axios from 'axios';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!newPassword) newErrors.newPassword = 'Password is required';
    else if (newPassword.length < 8)
      newErrors.newPassword = 'Password must be at least 8 characters';
    if (newPassword !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const token = searchParams.get('token');
    if (!token) {
      setApiError('Missing reset token. Please use the link from your email.');
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (error) {
      setApiError(
        error.response?.data?.detail ||
          'This reset link is invalid or has expired. Please request a new one.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center">
            <CalendarIcon className="h-12 w-12 text-indigo-600" />
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Set new password</h2>
        </div>

        <Card>
          <Card.Body>
            {success ? (
              <div className="text-center space-y-4">
                <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Password reset!</h3>
                <p className="text-sm text-gray-600">
                  Your password has been reset successfully. You can now sign in with your new
                  password.
                </p>
                <Link to="/login">
                  <Button className="w-full mt-2" size="lg">
                    Go to login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {apiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {apiError}{' '}
                    <Link to="/forgot-password" className="font-medium underline">
                      Request a new link
                    </Link>
                  </div>
                )}

                <Input
                  label="New password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={errors.newPassword}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm new password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Reset password
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

export default ResetPasswordPage;
