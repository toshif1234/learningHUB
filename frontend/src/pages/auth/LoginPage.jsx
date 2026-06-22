import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid email or password';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-page-container" className="min-h-screen premium-mesh-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>

      <div className="w-full max-w-md glass-card p-8 shadow-2xl relative border border-dark-700/50">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="https://koerber-stellium.com/wp-content/uploads/2026/02/Korber_Stellium_Black-e1772874735722-1536x383.webp" 
            alt="Körber Stellium Logo" 
            className="h-9 object-contain"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="text-dark-400 text-sm mt-2">Sign in to access your LearningHUB dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
              <input
                id="login-email-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-11"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Password</label>
              <Link
                id="login-forgot-password-link"
                to="/forgot-password"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-11 pr-11"
                required
              />
              <button
                id="login-password-toggle-btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 p-0.5 rounded text-dark-400 hover:text-dark-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4.5 h-4.5" />}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-dark-400">
            Don't have an account?{' '}
            <Link
              id="login-signup-link"
              to="/signup"
              className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
