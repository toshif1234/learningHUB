import { useState, useEffect } from 'react';
import { coursesAPI } from '../../api/courses';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Plus,
  BookOpen,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Copy,
  Clock,
  BookMarked
} from 'lucide-react';
import Spinner from '../../components/Spinner';

export default function CourseListPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [courseType, setCourseType] = useState('');
  const [isPublished, setIsPublished] = useState('');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (courseType) params.course_type = courseType;
      if (isPublished !== '') params.is_published = isPublished === 'true';

      const res = await coursesAPI.list(params);
      setCourses(res.data || []);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [category, courseType, isPublished]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleTogglePublish = async (course) => {
    try {
      const updatedData = {
        title: course.title,
        description: course.description,
        category: course.category,
        course_type: course.course_type,
        content_type: course.content_type,
        duration_minutes: course.duration_minutes,
        is_published: !course.is_published
      };
      await coursesAPI.update(course.id, updatedData);
      toast.success(
        course.is_published ? 'Course unpublished successfully' : 'Course published successfully!'
      );
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_published: !c.is_published } : c))
      );
    } catch (err) {
      toast.error('Failed to update course status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }
    try {
      await coursesAPI.delete(id);
      toast.success('Course deleted successfully');
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete course');
    }
  };

  const handleDuplicate = async (course) => {
    try {
      toast.loading('Duplicating course...', { id: 'dup-course' });
      // Create new course with duplicate metadata
      const res = await coursesAPI.create({
        title: `Copy of ${course.title}`,
        description: course.description,
        category: course.category,
        course_type: course.course_type,
        content_type: course.content_type,
        duration_minutes: course.duration_minutes,
        is_published: false
      });
      toast.success('Course duplicated! Redirecting to builder...', { id: 'dup-course' });
      navigate(`/admin/courses/${res.data.id}/edit`);
    } catch (err) {
      toast.error('Failed to duplicate course', { id: 'dup-course' });
    }
  };

  const categories = ['Engineering', 'Product', 'Compliance', 'Sales', 'Marketing', 'Design', 'Other'];

  return (
    <div id="course-list-page-container" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Manage Courses</h1>
          <p className="text-dark-400 text-sm mt-1">Create, update, and coordinate learning programs</p>
        </div>
        <Link
          id="create-new-course-btn"
          to="/admin/courses/new"
          className="btn-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-5 h-5" />
          Create Course
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-dark-800/60">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-dark-400" />
          <input
            id="course-search-input"
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5 text-sm"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category */}
          <select
            id="course-category-filter"
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

          {/* Course Type */}
          <select
            id="course-type-filter"
            value={courseType}
            onChange={(e) => setCourseType(e.target.value)}
            className="bg-dark-800/80 border border-dark-600 rounded-xl px-3 py-2 text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="">All Types</option>
            <option value="assigned">Assigned</option>
            <option value="free">Free Catalog</option>
          </select>

          {/* Status */}
          <select
            id="course-status-filter"
            value={isPublished}
            onChange={(e) => setIsPublished(e.target.value)}
            className="bg-dark-800/80 border border-dark-600 rounded-xl px-3 py-2 text-sm text-dark-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          >
            <option value="">All Statuses</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-dark-900 border border-dark-700/60 rounded-xl p-1 ml-auto md:ml-0">
            <button
              id="view-grid-btn"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              id="view-list-btn"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-dark-200'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Courses Display */}
      {loading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <div className="glass-card p-12 text-center border border-dark-800/60">
          <BookOpen className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No courses found</h3>
          <p className="text-dark-400 text-sm max-w-md mx-auto mb-6">
            Get started by creating your first course. You can add training materials, files, and custom assessments.
          </p>
          <Link to="/admin/courses/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Course
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="glass-card hover:bg-dark-800/30 border border-dark-800 hover:border-dark-700/60 rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-primary-500/5"
            >
              {/* Thumbnail Area */}
              <div className="h-44 bg-gradient-to-tr from-primary-900/60 to-dark-900 relative flex items-center justify-center border-b border-dark-800/60">
                {course.thumbnail_url ? (
                  <img
                    src={`http://localhost:8000${course.thumbnail_url}`}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-dark-500 group-hover:text-primary-400/80 transition-colors">
                    <BookMarked className="w-12 h-12 stroke-[1.2]" />
                    <span className="text-[10px] uppercase font-bold tracking-widest mt-2">{course.category}</span>
                  </div>
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className={`badge ${course.course_type === 'assigned' ? 'badge-primary' : 'badge-success'} border border-dark-700/50 backdrop-blur-md`}>
                    {course.course_type === 'assigned' ? 'Assigned' : 'Free'}
                  </span>
                  <span className={`badge ${course.is_published ? 'badge-success' : 'badge-warning'} border border-dark-700/50 backdrop-blur-md`}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-white group-hover:text-primary-400 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-dark-400 text-xs line-clamp-2 leading-relaxed">{course.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-dark-500 border-t border-dark-800/60 pt-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{course.duration_minutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Toggle publish button */}
                    <button
                      id={`course-toggle-publish-grid-${course.id}`}
                      onClick={() => handleTogglePublish(course)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        course.is_published
                          ? 'border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10'
                          : 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={course.is_published ? 'Unpublish course' : 'Publish course'}
                    >
                      {course.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {/* Copy button */}
                    <button
                      id={`course-duplicate-grid-${course.id}`}
                      onClick={() => handleDuplicate(course)}
                      className="p-1.5 rounded-lg border border-dark-700 bg-dark-800 text-dark-300 hover:bg-dark-750 transition-all"
                      title="Duplicate course"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {/* Edit button */}
                    <button
                      id={`course-edit-grid-${course.id}`}
                      onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                      className="p-1.5 rounded-lg border border-primary-500/25 bg-primary-500/5 text-primary-400 hover:bg-primary-500/10 transition-all"
                      title="Edit course"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Delete button */}
                    <button
                      id={`course-delete-grid-${course.id}`}
                      onClick={() => handleDelete(course.id)}
                      className="p-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete course"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden border border-dark-800/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dark-850 bg-dark-900/50 text-dark-400">
                <th className="p-4 font-semibold">Course Title</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Duration</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-900">
              {courses.map((course) => (
                <tr key={course.id} className="text-dark-200 hover:bg-dark-850/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center text-dark-500 flex-shrink-0">
                        <BookMarked className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">{course.title}</span>
                        <span className="text-xs text-dark-400 line-clamp-1">{course.description}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-dark-800 text-dark-300">
                      {course.category}
                    </span>
                  </td>
                  <td className="p-4 capitalize">{course.course_type}</td>
                  <td className="p-4">{course.duration_minutes} mins</td>
                  <td className="p-4">
                    <span className={`badge ${course.is_published ? 'badge-success' : 'badge-warning'}`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        id={`course-toggle-publish-list-${course.id}`}
                        onClick={() => handleTogglePublish(course)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          course.is_published
                            ? 'border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10'
                            : 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={course.is_published ? 'Unpublish' : 'Publish'}
                      >
                        {course.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        id={`course-duplicate-list-${course.id}`}
                        onClick={() => handleDuplicate(course)}
                        className="p-1.5 rounded-lg border border-dark-700 bg-dark-850 text-dark-300 hover:bg-dark-800"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`course-edit-list-${course.id}`}
                        onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                        className="p-1.5 rounded-lg border border-primary-500/25 bg-primary-500/5 text-primary-400 hover:bg-primary-500/10"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`course-delete-list-${course.id}`}
                        onClick={() => handleDelete(course.id)}
                        className="p-1.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
