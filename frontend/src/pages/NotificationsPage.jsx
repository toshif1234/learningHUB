import { useState, useEffect } from 'react';
import { notificationsAPI } from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Bell, Check, CheckCheck, Trash, AlertTriangle, ArrowLeft } from 'lucide-react';
import Spinner from '../components/Spinner';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 15;

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pageSize,
        skip: (page - 1) * pageSize
      };
      const res = await notificationsAPI.list(params);
      const items = res.data?.notifications || res.data || [];
      setNotifications(items);
      // Simple logic to check if there might be more
      setHasMore(items.length === pageSize);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, page]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      toast.success('Notification marked as read');
    } catch (err) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const getTimeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div id="notifications-page-container" className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Notifications</h1>
          <p className="text-dark-400 text-sm mt-1">Stay updated with course assignments, deadlines, and grades</p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            id="notif-page-mark-all-btn"
            onClick={handleMarkAllRead}
            className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 bg-gradient-to-r from-primary-600 to-indigo-500 self-start md:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-dark-900 border border-dark-800 rounded-xl p-1 w-fit">
        {['all', 'unread', 'read'].map((f) => (
          <button
            key={f}
            id={`notif-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              filter === f
                ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Spinner />
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-card p-12 text-center border border-dark-800/60">
          <Bell className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Clear inbox</h3>
          <p className="text-dark-400 text-xs">No notifications matching your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`glass-card p-4 border transition-all duration-200 flex items-start gap-4 ${
                !notif.read
                  ? 'border-primary-500/20 bg-gradient-to-r from-primary-950/5 via-dark-900/40 to-dark-900'
                  : 'border-dark-800/60 bg-dark-900/20'
              }`}
            >
              {/* Icon indicator */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                !notif.read ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' : 'bg-dark-900 text-dark-500'
              }`}>
                <Bell className="w-5 h-5" />
              </div>

              {/* Message */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className={`text-sm ${!notif.read ? 'text-white font-semibold' : 'text-dark-300'}`}>
                  {notif.message || notif.title}
                </p>
                <span className="text-[10px] text-dark-500 block">{getTimeAgo(notif.created_at)}</span>
              </div>

              {/* Mark read button */}
              {!notif.read && (
                <button
                  id={`notif-mark-read-btn-${notif.id}`}
                  onClick={() => handleMarkRead(notif.id)}
                  className="p-1.5 rounded-lg border border-dark-750 bg-dark-900 text-dark-400 hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-colors flex-shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            id="notif-page-prev"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn-secondary py-2 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Prev Page
          </button>
          <span className="text-xs text-dark-400 font-semibold">Page {page}</span>
          <button
            id="notif-page-next"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary py-2 px-4 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next Page
          </button>
        </div>
      )}
    </div>
  );
}
