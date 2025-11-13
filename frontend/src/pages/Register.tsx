import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DataRegion, type RegisterData } from '../types/auth';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dataRegion: DataRegion.EU,
    gdprConsentGiven: false,
    marketingConsent: false,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.gdprConsentGiven) {
      newErrors.gdprConsent = 'You must accept the privacy policy to register';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register(formData);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-4xl font-bold text-primary-600 mb-2">
          Idea Communicator
        </h1>
        <h2 className="text-center text-2xl font-semibold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  First name
                </label>
                <div className="mt-1">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input"
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Min. 8 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: '' });
                    }
                  }}
                  className={`input ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="dataRegion"
                className="block text-sm font-medium text-gray-700"
              >
                Data storage region
              </label>
              <div className="mt-1">
                <select
                  id="dataRegion"
                  name="dataRegion"
                  value={formData.dataRegion}
                  onChange={handleChange}
                  className="input"
                >
                  <option value={DataRegion.SWEDEN}>Sweden</option>
                  <option value={DataRegion.EU}>EU</option>
                  <option value={DataRegion.USA}>USA</option>
                  <option value={DataRegion.CANADA}>Canada</option>
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Choose where your data will be stored (GDPR compliance)
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="gdprConsentGiven"
                    name="gdprConsentGiven"
                    type="checkbox"
                    checked={formData.gdprConsentGiven}
                    onChange={handleChange}
                    className={`h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded ${
                      errors.gdprConsent ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="gdprConsentGiven"
                    className="font-medium text-gray-700"
                  >
                    I accept the privacy policy *
                  </label>
                  <p className="text-gray-500">
                    Required to create an account. You can withdraw consent at any
                    time.
                  </p>
                  {errors.gdprConsent && (
                    <p className="mt-1 text-red-600">{errors.gdprConsent}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="marketingConsent"
                    name="marketingConsent"
                    type="checkbox"
                    checked={formData.marketingConsent}
                    onChange={handleChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="marketingConsent"
                    className="font-medium text-gray-700"
                  >
                    Send me product updates and tips
                  </label>
                  <p className="text-gray-500">Optional. You can unsubscribe anytime.</p>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
