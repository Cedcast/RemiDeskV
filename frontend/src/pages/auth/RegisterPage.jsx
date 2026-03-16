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
    role: 'customer',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
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
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
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
        role: formData.role,
      });
      
      toast.success('Account created successfully!');
      
      // Auto-login after registration
      const user = await login(formData.email, formData.password);
      
      if (user.role === 'business_owner') {
        navigate('/dashboard');
      } else {
        navigate('/businesses');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      toast.error(message);
      setErrors({ general: message });
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
          <h2 className="mt-4 text-3xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
        
        <Card>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {errors.general}
                </div>
              )}
              
              <Input
                label="Full name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                error={errors.full_name}
                placeholder="John Doe"
                autoComplete="name"
              />
              
              <Input
                label="Email address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="you@example.com"
                autoComplete="email"
              />
              
              <Input
                label="Phone number (optional)"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  I want to
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: 'customer' }))}
                    className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                      formData.role === 'customer'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Book appointments
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: 'business_owner' }))}
                    className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                      formData.role === 'business_owner'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Run a business
                  </button>
                </div>
              </div>
              
              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Create account
              </Button>
            </form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
