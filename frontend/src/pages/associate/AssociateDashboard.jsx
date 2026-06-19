import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { assignmentsAPI } from '../../api/assignments';
import { enrollmentsAPI } from '../../api/enrollments';
import { assessmentsAPI } from '../../api/assessments';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Compass,
  Trophy,
  Activity,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import CourseCard from '../../components/CourseCard';

export default function AssociateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [assignRes, enrollRes] = await Promise.all([
          assignmentsAPI.list(),
          enrollmentsAPI.list()
        ]);
        setAssignments(assignRes.data || []);
        setEnrollments(enrollRes.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleViewCertificate = async (courseId) => {
    try {
      const res = await assessmentsAPI.getPassedAttempt(courseId);
      if (res.data?.certificate_url) {
        window.open(res.data.certificate_url, '_blank');
      } else {
        toast.error('No certificate URL returned');
      }
    } catch (err) {
      toast.error('No certificate found. You must pass the course assessment first.');
    }
  };

  if (loading) return <Spinner />;

  // Filter lists
  const activeAssignments = assignments.filter((a) => a.status !== 'completed');
  const completedAssignments = assignments.filter((a) => a.status === 'completed');

  const activeEnrollments = enrollments.filter((e) => !e.completed_at);
  const completedEnrollments = enrollments.filter((e) => e.completed_at);

  return (
    <div id="associate-dashboard-container" className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-primary-900/40 via-indigo-900/30 to-dark-900 border border-primary-500/15 p-6 md:p-8 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-600/10 rounded-full blur-3xl"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary-400 font-semibold text-xs tracking-wider uppercase">
              <Sparkles className="w-4.5 h-4.5" />
              Welcome to your portal
            </div>
            <h1 className="text-3xl font-extrabold text-white">Hello, {user?.full_name}</h1>
            <p className="text-dark-400 text-sm max-w-xl">
              Track your assigned compliance training, take quizzes, and explore self-paced elective courses in our Catalog.
            </p>
          </div>
          <Link
            id="dashboard-explore-catalog-btn"
            to="/my/catalog"
            className="btn-primary flex items-center gap-2 self-start md:self-auto"
          >
            <Compass className="w-5 h-5" />
            Explore Catalog
          </Link>
        </div>
      </div>

      {/* Grid: Assignments & Electives */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Training Lists */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Assigned Training (Mandatory) */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-400" />
              Assigned Training (Mandatory)
              {activeAssignments.length > 0 && (
                <span className="badge bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                  {activeAssignments.length} Required
                </span>
              )}
            </h2>

            {activeAssignments.length === 0 ? (
              <div className="glass-card p-6 text-center border border-dark-800/60">
                <Trophy className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">All caught up!</p>
                <p className="text-xs text-dark-400 mt-1">You have no active mandatory course assignments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeAssignments.map((assign) => (
                  <CourseCard
                    key={assign.id}
                    course={assign.course}
                    assignment={{
                      ...assign,
                      progress: assign.status === 'in_progress' ? 50 : 0
                    }}
                    onClick={() => navigate(`/my/courses/${assign.course.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section: Self-Paced Training (Electives) */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              In Progress (Self-Enrolled)
            </h2>

            {activeEnrollments.length === 0 ? (
              <div className="glass-card p-6 text-center border border-dark-800/60">
                <Compass className="w-8 h-8 text-dark-500 mx-auto mb-2" />
                <p className="text-xs text-dark-400">No active self-enrolled courses. Visit the catalog to enroll.</p>
                <Link to="/my/catalog" className="text-xs text-primary-400 hover:text-primary-300 font-semibold mt-2 inline-block">
                  Go to Free Catalog &rarr;
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeEnrollments.map((enroll) => (
                  <CourseCard
                    key={enroll.id}
                    course={enroll.course}
                    enrollment={{
                      ...enroll,
                      progress: enroll.progress_percent
                    }}
                    onClick={() => navigate(`/my/courses/${enroll.course.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Sidebar Info / Completed Achievements */}
        <div className="space-y-6">
          <div className="glass-card p-6 border border-dark-800/60 space-y-5">
            <h3 className="font-bold text-white text-base flex items-center gap-2 pb-3 border-b border-dark-800">
              <Trophy className="w-5 h-5 text-emerald-400" />
              Your Achievements
            </h3>

            {/* Total Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 text-center">
                <span className="text-2xl font-bold text-white block">
                  {completedAssignments.length + completedEnrollments.length}
                </span>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wide">Courses Passed</span>
              </div>
              <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 text-center">
                <span className="text-2xl font-bold text-primary-400 block">
                  {activeAssignments.length + activeEnrollments.length}
                </span>
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wide">Active Studies</span>
              </div>
            </div>

            {/* Completed Course List */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider block">Completed History</span>
              {completedAssignments.length === 0 && completedEnrollments.length === 0 ? (
                <p className="text-xs text-dark-500 italic">No completed courses yet. Pass your assessments to earn certificates!</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...completedAssignments, ...completedEnrollments].map((item, idx) => {
                    const c = item.course;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-dark-900 border border-dark-800/40 hover:border-dark-750 transition-colors"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">{c.title}</span>
                          <span className="text-[10px] text-emerald-400 font-medium">Completed</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            id={`completed-cert-btn-${idx}`}
                            onClick={() => handleViewCertificate(c.id)}
                            className="p-1 rounded bg-dark-850 hover:bg-dark-800 text-primary-400 hover:text-primary-300 transition-colors"
                            title="View Certificate"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                          <button
                            id={`completed-view-btn-${idx}`}
                            onClick={() => navigate(`/my/courses/${c.id}`)}
                            className="p-1 rounded bg-dark-850 hover:bg-dark-800 text-dark-300 hover:text-white transition-colors"
                            title="View Course details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
