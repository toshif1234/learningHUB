import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function CountdownTimer({ deadline, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(deadline));

  function getTimeLeft(deadline) {
    const now = new Date().getTime();
    const target = new Date(deadline).getTime();
    const diff = target - now;

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true, totalHours: 0 };

    const totalHours = diff / (1000 * 60 * 60);
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      expired: false,
      totalHours,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const isUrgent = timeLeft.totalHours < 48 && !timeLeft.expired;
  const isExpired = timeLeft.expired;

  if (isExpired) {
    return (
      <div id="countdown-expired" className={`flex items-center gap-2 text-rose-400 ${className}`}>
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Overdue</span>
      </div>
    );
  }

  return (
    <div id="countdown-timer" className={`flex items-center gap-2 ${isUrgent ? 'text-rose-400' : 'text-dark-300'} ${className}`}>
      {isUrgent ? <AlertTriangle className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
      <div className="flex items-center gap-1 text-sm font-mono">
        {timeLeft.days > 0 && (
          <span className="font-semibold">{timeLeft.days}d</span>
        )}
        <span className="font-semibold">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span>:</span>
        <span className="font-semibold">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span>:</span>
        <span className="font-semibold">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
}
