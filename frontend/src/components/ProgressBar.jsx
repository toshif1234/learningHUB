export default function ProgressBar({ value = 0, max = 100, size = 'md', showLabel = true, className = '' }) {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const getColor = () => {
    if (percentage >= 100) return 'from-emerald-500 to-emerald-400';
    if (percentage >= 60) return 'from-primary-500 to-primary-400';
    if (percentage >= 30) return 'from-amber-500 to-amber-400';
    return 'from-rose-500 to-rose-400';
  };

  return (
    <div id="progress-bar-container" className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-dark-400">Progress</span>
          <span className="text-xs font-semibold text-dark-200">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-dark-700/50 rounded-full ${heights[size]} overflow-hidden`}>
        <div
          className={`${heights[size]} bg-gradient-to-r ${getColor()} rounded-full transition-all duration-700 ease-out relative`}
          style={{ width: `${percentage}%` }}
        >
          {size === 'lg' && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
