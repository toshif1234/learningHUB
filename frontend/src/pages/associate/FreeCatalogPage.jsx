import { useState, useEffect } from 'react';
import { coursesAPI } from '../../api/courses';
import { enrollmentsAPI } from '../../api/enrollments';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Compass, Search, Filter, BookOpen, GraduationCap, ChevronRight } from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function FreeCatalogPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [enrollingId, setEnrollingId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { course_type: 'free', is_published: true };
      if (category) params.category = category;
      if (search) params.search = search;

      const [coursesRes, enrollmentsRes] = await Promise.all([
        coursesAPI.list(params),
        enrollmentsAPI.list()
      ]);

      setCourses(coursesRes.data || []);
      setEnrollments(enrollmentsRes.data || []);
    } catch (err) {
      toast.error('Failed to load catalog catalog items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleEnroll = async (courseId) => {
    try {
      setEnrollingId(courseId);
      await enrollmentsAPI.enroll({ course_id: courseId });
      toast.success('Successfully enrolled in course!');
      navigate(`/my/courses/${courseId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to enroll in course');
    } finally {
      setEnrollingId(null);
    }
  };

  const isEnrolled = (courseId) => {
    return enrollments.some((e) => e.course_id === courseId);
  };

  const categories = ['Engineering', 'Product', 'Compliance', 'Sales', 'Marketing', 'Design', 'Other'];

  return (
    <div id="free-catalog-container" className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Free Catalog</h1>
        <p className="text-dark-400 text-sm mt-1">Enroll in self-paced, elective courses to expand your skill set</p>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-dark-800/60">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-dark-400" />
          <input
            id="catalog-search-input"
            type="text"
            placeholder="Search catalog courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5 text-sm"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Category */}
          <select
            id="catalog-category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-dark-800/80 border border-dark-600 rounded-xl px-3 py-2 text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Course List Grid */}
      {loading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <div className="glass-card p-12 text-center border border-dark-800/60">
          <Compass className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No courses found</h3>
          <p className="text-dark-400 text-xs max-w-sm mx-auto">
            Try adjusting your category filters or search query to locate other training programs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const enrolled = isEnrolled(course.id);
            return (
              <div
                key={course.id}
                className="glass-card hover:bg-dark-800/30 border border-dark-850 hover:border-dark-700/60 rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/5"
              >
                {/* Thumbnail */}
                <div className="h-44 bg-gradient-to-tr from-primary-900/60 to-dark-900 relative flex items-center justify-center border-b border-dark-800/60">
                  {course.thumbnail_url ? (
                    <img
                      src={`http://localhost:8000${course.thumbnail_url}`}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-dark-500 group-hover:text-primary-400/80 transition-colors">
                      <GraduationCap className="w-12 h-12 stroke-[1.2]" />
                      <span className="text-[10px] uppercase font-bold tracking-widest mt-2">{course.category}</span>
                    </div>
                  )}
                  <span className="absolute top-4 left-4 badge badge-success border border-dark-700/50 backdrop-blur-md">
                    Self-Paced
                  </span>
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-white group-hover:text-primary-400 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-dark-400 text-xs line-clamp-2 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="border-t border-dark-800 pt-4 flex items-center justify-between">
                    <span className="text-xs text-dark-500">{course.duration_minutes} mins</span>

                    {enrolled ? (
                      <button
                        id={`catalog-continue-btn-${course.id}`}
                        onClick={() => navigate(`/my/courses/${course.id}`)}
                        className="py-1.5 px-4 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/25 hover:border-primary-500/40 text-primary-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        Continue
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        id={`catalog-enroll-btn-${course.id}`}
                        onClick={() => handleEnroll(course.id)}
                        disabled={enrollingId === course.id}
                        className="py-1.5 px-4 bg-gradient-to-r from-primary-600 to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md shadow-primary-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {enrollingId === course.id ? 'Enrolling...' : 'Enroll Now'}
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
