import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { toast } from 'react-hot-toast';
import { ShieldAlert, ArrowLeft, RotateCcw } from 'lucide-react';

export default function OTPVerifyPage() {
  const { verifyOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get email and purpose from navigation state
  const stateEmail = location.state?.email || '';
  const statePurpose = location.state?.purpose || 'signup';

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace to go back
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      inputRefs.current[5].focus();
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email first');
      return;
    }
    try {
      setResending(true);
      await authAPI.resendOTP({ email, purpose: statePurpose });
      toast.success('New OTP sent to your email!');
      setTimer(60);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to resend OTP';
      toast.error(errorMsg);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      await verifyOTP({
        email,
        otp_code: otpCode,
        purpose: statePurpose
      });
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid or expired OTP code';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="otp-page-container" className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-50/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>

      <div className="w-full max-w-md glass-card p-8 shadow-2xl relative border border-dark-700/50">
        <button
          id="otp-back-btn"
          onClick={() => navigate('/login')}
          className="absolute left-6 top-6 p-2 rounded-xl text-dark-400 hover:text-dark-100 hover:bg-dark-800/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6 mt-6">
          <img 
            src="https://koerber-stellium.com/wp-content/uploads/2026/02/Korber_Stellium_Black-e1772874735722-1536x383.webp" 
            alt="Körber Stellium Logo" 
            className="h-9 object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 bg-clip-text text-transparent">
            Verify OTP
          </h2>
          <p className="text-dark-400 text-sm mt-2">
            Enter the 6-digit code sent to <span className="text-dark-200 font-medium">{email || 'your email'}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email fallback if not passed in state */}
          {!stateEmail && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider">Verify Email</label>
              <input
                id="otp-email-input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex justify-between gap-2.5" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                id={`otp-digit-${idx}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-12 bg-dark-800/80 border border-dark-600 rounded-xl text-center text-lg font-bold text-dark-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-300"
              />
            ))}
          </div>

          {/* Action buttons */}
          <button
            id="otp-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        {/* Resend code */}
        <div className="text-center mt-6">
          {timer > 0 ? (
            <p className="text-xs text-dark-400">
              Resend code in <span className="text-primary-400 font-semibold">{timer}s</span>
            </p>
          ) : (
            <button
              id="otp-resend-btn"
              onClick={handleResend}
              disabled={resending}
              className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {resending ? 'Resending...' : 'Resend Verification Code'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
