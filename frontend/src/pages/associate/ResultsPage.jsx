import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { assessmentsAPI } from '../../api/assessments';
import { toast } from 'react-hot-toast';
import { Trophy, AlertTriangle, ArrowLeft, RefreshCw, Download, CheckCircle, XCircle } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function ResultsPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  // Retrieve course info from state if available
  const courseName = location.state?.courseName || 'Course Assessment';
  const courseId = location.state?.courseId;

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await assessmentsAPI.getAttemptDetail(attemptId);
        setResult(res.data);
      } catch (err) {
        toast.error('Failed to load assessment results');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) return <Spinner />;
  if (!result) return null;

  const score = Math.round(result.score);
  const passed = result.is_passed;
  const mins = Math.floor((result.time_taken_seconds || 0) / 60);
  const secs = (result.time_taken_seconds || 0) % 60;

  // Endpoint to download certificate
  const handleDownloadCertificate = () => {
    if (result.certificate_url) {
      window.open(result.certificate_url, '_blank');
    } else {
      toast.error('Certificate not available');
    }
  };

  return (
    <div id="results-page-container" className="space-y-8 max-w-2xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <button
        id="results-back-btn"
        onClick={() => {
          if (courseId) {
            navigate(`/my/courses/${courseId}`);
          } else {
            navigate('/dashboard');
          }
        }}
        className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Course
      </button>

      {/* Main Results Card */}
      <div className={`glass-card p-8 border text-center space-y-6 relative overflow-hidden ${
        passed
          ? 'border-emerald-500/20 bg-gradient-to-b from-emerald-950/10 to-dark-900/30'
          : 'border-rose-500/20 bg-gradient-to-b from-rose-950/10 to-dark-900/30'
      }`}>
        {/* Confetti decoration */}
        {passed && (
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />
        )}

        <div className="space-y-2 relative z-10">
          <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest block">
            Assessment Complete
          </span>
          <h1 className="text-2xl font-extrabold text-white">{courseName}</h1>
          <p className="text-xs text-dark-400">Attempt #{result.attempt_number}</p>
        </div>

        {/* Circular Progress Score */}
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center relative z-10">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#1e293b"
              strokeWidth="8"
            />
            {/* Foreground Score Circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke={passed ? '#10b981' : '#f43f5e'}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - score / 100)}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-extrabold text-white">{score}%</span>
            <span className="text-[10px] font-bold text-dark-400 uppercase">Score</span>
          </div>
        </div>

        {/* Status Alerts */}
        <div className="max-w-md mx-auto relative z-10">
          {passed ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-center gap-3">
              <Trophy className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-bold text-emerald-400">Congratulations! You Passed</p>
                <p className="text-xs text-dark-300 mt-0.5">You have met the passing threshold for this training course.</p>
              </div>
            </div>
          ) : (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-bold text-rose-400">Assessment Failed</p>
                <p className="text-xs text-dark-300 mt-0.5">Your score is below the required passing percentage.</p>
              </div>
            </div>
          )}
        </div>

        {/* Specs Table */}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-4 border-t border-dark-800/60 relative z-10 text-xs">
          <div className="text-center p-3 bg-dark-900 border border-dark-850 rounded-xl">
            <span className="text-dark-500 font-medium block">Time Taken</span>
            <span className="text-sm font-bold text-white mt-1 block">
              {mins > 0 ? `${mins}m ` : ''}{secs}s
            </span>
          </div>
          <div className="text-center p-3 bg-dark-900 border border-dark-850 rounded-xl">
            <span className="text-dark-500 font-medium block">Result</span>
            <span className={`text-sm font-bold mt-1 block ${passed ? 'text-emerald-400' : 'text-rose-400'}`}>
              {passed ? 'Passed' : 'Failed'}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4 relative z-10">
          {passed ? (
            <button
              id="results-certificate-btn"
              onClick={handleDownloadCertificate}
              className="btn-primary flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-3 px-8 shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4.5 h-4.5" />
              Get Certificate
            </button>
          ) : (
            <button
              id="results-retry-btn"
              onClick={() => {
                if (courseId) {
                  navigate(`/my/courses/${courseId}`);
                } else {
                  navigate('/dashboard');
                }
              }}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-8"
            >
              <RefreshCw className="w-4.5 h-4.5" />
              Retry Assessment
            </button>
          )}
        </div>
      </div>

      {/* Question Review Section */}
      <div className="glass-card p-6 border border-dark-800 space-y-4">
        <h3 className="font-bold text-white text-base">Question Performance Review</h3>
        <div className="space-y-2">
          {result.user_answers.map((ans, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl bg-dark-900 border border-dark-800/40"
            >
              <div className="flex items-center gap-3">
                {ans.is_correct ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <span className="text-xs font-semibold text-white">Question {idx + 1}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                ans.is_correct ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {ans.is_correct ? 'Correct' : 'Incorrect'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
