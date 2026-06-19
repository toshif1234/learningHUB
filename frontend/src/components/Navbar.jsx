import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import { LogOut, User, GraduationCap, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav id="app-navbar" className="fixed top-0 left-0 right-0 h-16 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/60 flex items-center justify-between px-6 z-40 transition-all duration-300">
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <img style={{width: "10%"}} src="https://koerber-stellium.com/wp-content/uploads/2026/02/Korber_Stellium_Black-e1772874735722-1536x383.webp" alt="LearningHUB Logo" srcset="" />
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-600 bg-clip-text text-transparent">
            LearningHUB
          </span>
          <span className="text-[10px] text-primary-400 font-semibold uppercase tracking-wider -mt-0.5">
            LMS Platform
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="navbar-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-dark-800/50 border border-transparent hover:border-dark-700/30 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {user ? getInitials(user.full_name) : 'U'}
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-sm font-semibold text-dark-100 line-clamp-1">{user?.full_name}</span>
              <span className="text-[10px] text-dark-400 font-medium capitalize -mt-0.5">{user?.role}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-card shadow-2xl shadow-dark-950/50 animate-slide-down z-50 overflow-hidden">
              <div className="p-4 border-b border-dark-700/50">
                <p className="text-sm font-semibold text-dark-100">{user?.full_name}</p>
                <p className="text-xs text-dark-400 truncate mt-0.5">{user?.email}</p>
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                  user?.role === 'admin'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                }`}>
                  {user?.role}
                </span>
              </div>
              <div className="p-1.5">
                <button
                  id="navbar-logout-btn"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-150 text-left font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
