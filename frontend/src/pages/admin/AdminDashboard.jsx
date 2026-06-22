import { useState, useEffect } from 'react';
import { analyticsAPI as apiAnalytics } from '../../api/analytics';
import {
  Users,
  BookOpen,
  ClipboardList,
  AlertCircle,
  FileSpreadsheet,
  Download,
  TrendingUp,
  Award,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import Spinner from '../../components/Spinner';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState([]);
  const [exhaustedAttempts, setExhaustedAttempts] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [overviewRes, coursesRes, usersRes, exhaustedRes] = await Promise.all([
          apiAnalytics.overview(),
          apiAnalytics.courses(),
          apiAnalytics.users(),
          apiAnalytics.getExhaustedAttempts()
        ]);
        setOverview(overviewRes.data);
        setCourseAnalytics(coursesRes.data || []);
        setUserAnalytics(usersRes.data || []);
        setExhaustedAttempts(exhaustedRes.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleIncreaseAttempts = async (userId, assessmentId) => {
    try {
      toast.loading('Increasing attempts...', { id: 'attempts-increase' });
      await apiAnalytics.increaseAttempts({ user_id: userId, assessment_id: assessmentId });
      toast.success('Attempts limit increased successfully', { id: 'attempts-increase' });
      
      const [usersRes, exhaustedRes] = await Promise.all([
        apiAnalytics.users(),
        apiAnalytics.getExhaustedAttempts()
      ]);
      setUserAnalytics(usersRes.data || []);
      setExhaustedAttempts(exhaustedRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to increase attempts limit', { id: 'attempts-increase' });
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.loading('Exporting CSV results...', { id: 'csv-export' });
      const res = await apiAnalytics.exportResults();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `assessment_results_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV results exported successfully', { id: 'csv-export' });
    } catch (err) {
      toast.error('Failed to export results', { id: 'csv-export' });
    }
  };

  if (loading) return <Spinner />;

  // Prepare chart data
  const completionData = courseAnalytics.slice(0, 8).map((c) => ({
    name: c.course_title?.substring(0, 15) || `Course ${c.course_id}`,
    'Completion Rate (%)': Math.round(c.completion_rate || 0),
    'Pass Rate (%)': Math.round(c.pass_rate || 0)
  }));

  const scoreData = courseAnalytics.slice(0, 8).map((c) => ({
    name: c.course_title?.substring(0, 15) || `Course ${c.course_id}`,
    'Avg Score (%)': Math.round(c.avg_assessment_score || 0)
  }));

  const totalUsers = (overview?.total_users_admin || 0) + (overview?.total_users_associate || 0);

  return (
    <div id="admin-dashboard-container" className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Dashboard Overview</h1>
          <p className="text-dark-400 text-sm mt-1">Real-time learning analytics and administrative metrics</p>
        </div>
        <button
          id="export-results-btn"
          onClick={handleExportCSV}
          className="btn-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          Export Assessment CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400 border border-primary-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-white mt-1">{totalUsers}</h3>
              <p className="text-[10px] text-dark-500 mt-1">
                {overview?.total_users_admin || 0} Admins | {overview?.total_users_associate || 0} Associates
              </p>
            </div>
          </div>
        </div>

        {/* Courses */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Total Courses</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {(overview?.total_courses_assigned || 0) + (overview?.total_courses_free || 0)}
              </h3>
              <p className="text-[10px] text-dark-500 mt-1">
                {overview?.total_courses_assigned || 0} Assigned | {overview?.total_courses_free || 0} Free Catalog
              </p>
            </div>
          </div>
        </div>

        {/* Active Assignments */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Active Training</p>
              <h3 className="text-2xl font-bold text-white mt-1">{overview?.active_assignments || 0}</h3>
              <p className="text-[10px] text-dark-500 mt-1">Assignments in-progress or pending</p>
            </div>
          </div>
        </div>

        {/* Overdue Assignments */}
        <div className="glass-card p-6 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Overdue Tasks</p>
              <h3 className="text-2xl font-bold text-rose-500 mt-1">{overview?.overdue_assignments || 0}</h3>
              <p className="text-[10px] text-rose-400/80 mt-1">Requires follow-up attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Completion & Pass Rates */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              Completion & Pass Rates
            </h4>
          </div>
          <div className="h-80 w-full">
            {completionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Completion Rate (%)" fill="url(#colorCompletion)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pass Rate (%)" fill="url(#colorPass)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500 text-sm">
                No course data available yet
              </div>
            )}
          </div>
        </div>

        {/* Assessment Average Scores */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Average Assessment Scores
            </h4>
          </div>
          <div className="h-80 w-full">
            {scoreData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Avg Score (%)"
                    stroke="#818cf8"
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#6366f1', strokeWidth: 2, fill: '#0f172a' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-dark-500 text-sm">
                No score data available yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity / User Highlights */}
      <div className="glass-card p-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Associate Progress Highlights
        </h4>

        {/* Exhausted Attempts Alerts */}
        {exhaustedAttempts.length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mb-6 space-y-3">
            <h5 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Action Required: Assessment Attempts Exhausted
            </h5>
            <div className="divide-y divide-rose-500/10 text-xs">
              {exhaustedAttempts.map((item, idx) => (
                <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {item.user_name} ({item.user_email})
                    </p>
                    <p className="text-dark-400 mt-0.5">
                      Failed final assessment for <span className="text-primary-400 font-medium">{item.course_title}</span> ({item.attempts_count}/{item.max_attempts} attempts used)
                    </p>
                  </div>
                  <button
                    onClick={() => handleIncreaseAttempts(item.user_id, item.assessment_id)}
                    className="py-1.5 px-3.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors duration-200"
                  >
                    Increase Attempts
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {userAnalytics.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dark-700/50 text-dark-400">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Assigned Courses</th>
                  <th className="pb-3 font-semibold">Completed Courses</th>
                  <th className="pb-3 font-semibold">Overall Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800/30">
                {userAnalytics.slice(0, 5).map((user, idx) => (
                  <tr key={idx} className="text-dark-200">
                    <td className="py-3 font-medium text-white">{user.user_name || user.email}</td>
                    <td className="py-3">{user.assigned_courses_count}</td>
                    <td className="py-3">{user.completed_courses_count}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-dark-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-indigo-500 h-full rounded-full"
                            style={{ width: `${user.overall_progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{Math.round(user.overall_progress || 0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-6 text-center text-dark-500">No user progress recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
