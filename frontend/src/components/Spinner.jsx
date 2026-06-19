export default function Spinner({ size = 'lg', className = '' }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div id="spinner-container" className={`flex items-center justify-center min-h-[200px] ${className}`}>
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-2 border-dark-700 border-t-primary-500 animate-spin`} />
        <div className={`absolute inset-0 ${sizes[size]} rounded-full border-2 border-transparent border-b-primary-400 animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div id="full-page-spinner" className="fixed inset-0 bg-dark-950 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="relative inline-block">
          <div className="w-16 h-16 rounded-full border-2 border-dark-700 border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-b-primary-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="mt-4 text-dark-400 text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
