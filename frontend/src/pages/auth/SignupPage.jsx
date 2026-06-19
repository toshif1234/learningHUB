import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Check, X } from 'lucide-react';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password validation checks
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()\-=_+[\]{}|;:',.<>?/~`]/.test(password)
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    try {
      setLoading(true);
      await signup({
        email,
        full_name: fullName,
        password
      });
      toast.success('Account created! Please verify your email.');
      // Pass email to verify-otp page via state
      navigate('/verify-otp', { state: { email, purpose: 'signup' } });
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Registration failed. Try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="signup-page-container" className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
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

        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-dark-400 text-sm mt-2">Get started with LearningHUB LMS today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
              <input
                id="signup-name-input"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field pl-11"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
              <input
                id="signup-email-input"
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
            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
              <input
                id="signup-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-11 pr-11"
                required
              />
              <button
                id="signup-password-toggle-btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 p-0.5 rounded text-dark-400 hover:text-dark-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Strength Checklist */}
          {password && (
            <div className="bg-dark-900/60 rounded-xl p-3.5 border border-dark-800/40 text-xs space-y-2">
              <p className="font-semibold text-dark-300">Password Requirements:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  {checks.length ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-dark-500" />}
                  <span className={checks.length ? 'text-emerald-400' : 'text-dark-400'}>8+ Characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.uppercase ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-dark-500" />}
                  <span className={checks.uppercase ? 'text-emerald-400' : 'text-dark-400'}>1 uppercase letter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.number ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-dark-500" />}
                  <span className={checks.number ? 'text-emerald-400' : 'text-dark-400'}>1 number</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {checks.special ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-dark-500" />}
                  <span className={checks.special ? 'text-emerald-400' : 'text-dark-400'}>1 special char</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
              <input
                id="signup-confirm-password-input"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field pl-11"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            id="signup-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
            {!loading && <ArrowRight className="w-4.5 h-4.5" />}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-dark-400">
            Already have an account?{' '}
            <Link
              id="signup-login-link"
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
