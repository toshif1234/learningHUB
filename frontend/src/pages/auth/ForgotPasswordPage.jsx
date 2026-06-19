import { useState } from 'react';
import { authAPI } from '../../api/auth';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft, Check, X, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP & Reset, 3: Success
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password validation checks
  const checks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()\-=_+[\]{}|;:',.<>?/~`]/.test(newPassword)
  };

  const isPasswordValid = Object.values(checks).every(Boolean);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPassword({ email });
      toast.success('Password reset OTP sent to your email!');
      setStep(2);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to send OTP. Verify your email.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword({
        email,
        otp_code: otpCode,
        new_password: newPassword
      });
      toast.success('Password reset successfully!');
      setStep(3);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Reset failed. Invalid OTP or request.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="forgot-password-page-container" className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-50/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>

      <div className="w-full max-w-md glass-card p-8 shadow-2xl relative border border-dark-700/50">
        {/* Logo */}
        <div className="flex justify-center mb-6 mt-4">
          <img 
            src="https://koerber-stellium.com/wp-content/uploads/2026/02/Korber_Stellium_Black-e1772874735722-1536x383.webp" 
            alt="Körber Stellium Logo" 
            className="h-9 object-contain"
          />
        </div>

        {step === 1 && (
          <div className="animate-fade-in">
            <button
              id="forgot-back-btn"
              onClick={() => navigate('/login')}
              className="absolute left-6 top-6 p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 bg-clip-text text-transparent">
                Reset Password
              </h2>
              <p className="text-dark-400 text-sm mt-2">
                Enter your registered email to receive verification code
              </p>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <button
                id="forgot-send-otp-btn"
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {loading ? 'Sending code...' : 'Send Reset Link'}
                {!loading && <ArrowRight className="w-4.5 h-4.5" />}
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <button
              id="forgot-step2-back-btn"
              onClick={() => setStep(1)}
              className="absolute left-6 top-6 p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 bg-clip-text text-transparent">
                Choose New Password
              </h2>
              <p className="text-dark-400 text-sm mt-2">
                Enter code and choose a secure new password
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* OTP Code */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Verification Code</label>
                <input
                  id="forgot-otp-input"
                  type="text"
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="input-field text-center font-bold tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
                  <input
                    id="forgot-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field pl-11 pr-11"
                    required
                  />
                  <button
                    id="forgot-password-toggle-btn"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 p-0.5 rounded text-dark-400 hover:text-dark-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password strength */}
              {newPassword && (
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
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-dark-400" />
                  <input
                    id="forgot-confirm-password-input"
                    type="password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-11"
                    required
                  />
                </div>
              </div>

              <button
                id="forgot-reset-password-btn"
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-4"
              >
                {loading ? 'Resetting password...' : 'Save New Password'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center p-4 animate-fade-in">
            <div className="w-14 h-14 bg-primary-500/10 border border-primary-500/20 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-5">
              <Check className="w-7 h-7 animate-scale-in" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Password Updated</h2>
            <p className="text-dark-400 text-sm mt-3">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <Link
              id="forgot-success-login-btn"
              to="/login"
              className="w-full btn-primary block text-center mt-8"
            >
              Go to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
