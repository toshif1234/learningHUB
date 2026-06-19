import { useState, useEffect } from 'react';
import { coursesAPI } from '../../api/courses';
import { usersAPI } from '../../api/users';
import { assignmentsAPI } from '../../api/assignments';
import { toast } from 'react-hot-toast';
import {
  User,
  BookOpen,
  Calendar,
  Upload,
  UserPlus,
  Search,
  CheckSquare,
  Square,
  HelpCircle
} from 'lucide-react';

export default function AssignCoursePage() {
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'bulk'

  // Data lists
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Single Assignment Form state
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk state
  const [csvFile, setCsvFile] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load published courses (only assigned-type)
        const coursesRes = await coursesAPI.list({ course_type: 'assigned', is_published: true });
        setCourses(coursesRes.data || []);

        // Load all associates
        const usersRes = await usersAPI.list({ role: 'associate' });
        setUsers(usersRes.data || []);
      } catch (err) {
        toast.error('Failed to load courses or users');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = (filteredUsers) => {
    const filteredIds = filteredUsers.map((u) => u.id);
    const allSelected = filteredIds.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      // Unselect all filtered users
      setSelectedUserIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered users
      setSelectedUserIds((prev) => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      toast.error('Please select a course');
      return;
    }
    if (selectedUserIds.length === 0) {
      toast.error('Please select at least one associate');
      return;
    }
    if (!deadline) {
      toast.error('Please select a deadline');
      return;
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      toast.error('Deadline must be in the future');
      return;
    }

    try {
      setSubmitting(true);
      await assignmentsAPI.create({
        course_id: parseInt(selectedCourseId),
        assigned_to: selectedUserIds,
        deadline: deadlineDate.toISOString()
      });
      toast.success('Course assigned successfully!');
      setSelectedUserIds([]);
      setDeadline('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setBulkSubmitting(true);
      toast.loading('Processing CSV upload...', { id: 'bulk-assign' });
      const formData = new FormData();
      formData.append('file', csvFile);

      await assignmentsAPI.bulkAssign(formData);
      toast.success('Bulk assignments completed successfully!', { id: 'bulk-assign' });
      setCsvFile(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to process bulk upload', { id: 'bulk-assign' });
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="assign-course-container" className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Assign Training</h1>
        <p className="text-dark-400 text-sm mt-1">Assign mandatory courses to associates and track deadlines</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-dark-900 border border-dark-800 rounded-xl p-1.5 w-fit">
        <button
          id="assign-single-tab"
          onClick={() => setActiveTab('single')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'single'
              ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Single Assignment
        </button>
        <button
          id="assign-bulk-tab"
          onClick={() => setActiveTab('bulk')}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'bulk'
              ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          Bulk CSV Assign
        </button>
      </div>

      {/* SINGLE ASSIGNMENT */}
      {activeTab === 'single' && (
        <form onSubmit={handleSingleSubmit} className="glass-card p-6 border border-dark-800 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Select Course & Deadline */}
            <div className="space-y-5">
              {/* Course Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary-400" />
                  Select Mandatory Course
                </label>
                <select
                  id="assign-course-select"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Completion Deadline
                </label>
                <input
                  id="assign-deadline-input"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Right Column: Searchable User Selection */}
            <div className="space-y-3 flex flex-col">
              <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" />
                Select Associates ({selectedUserIds.length} Selected)
              </label>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-dark-400" />
                <input
                  id="assign-user-search"
                  type="text"
                  placeholder="Filter by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10 py-2.5 text-xs"
                />
              </div>

              {/* User Selection List */}
              <div className="border border-dark-750/70 rounded-xl overflow-hidden bg-dark-900/35 flex-1 flex flex-col min-h-60 max-h-80">
                {/* Select All Toggle */}
                <div className="p-3 border-b border-dark-750 bg-dark-900 flex justify-between items-center text-xs font-semibold text-dark-300">
                  <span>List of Associates</span>
                  <button
                    id="assign-select-all-btn"
                    type="button"
                    onClick={() => handleSelectAll(filteredUsers)}
                    className="text-primary-400 hover:text-primary-300 font-bold"
                  >
                    {filteredUsers.every((u) => selectedUserIds.includes(u.id)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* User checklist */}
                <div className="overflow-y-auto divide-y divide-dark-800/40 p-1">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-dark-500">No associates match your search.</div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isChecked = selectedUserIds.includes(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => handleToggleUser(user.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isChecked ? 'bg-primary-500/5' : 'hover:bg-dark-850/30'
                          }`}
                        >
                          <button
                            id={`assign-user-checkbox-${user.id}`}
                            type="button"
                            className={`p-0.5 rounded text-primary-400 ${isChecked ? 'text-primary-400' : 'text-dark-500'}`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 text-primary-500" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                            <p className="text-xs text-dark-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4 border-t border-dark-800/60">
            <button
              id="assign-single-submit-btn"
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4.5 h-4.5" />
              {submitting ? 'Assigning...' : 'Assign Course'}
            </button>
          </div>
        </form>
      )}

      {/* BULK ASSIGNMENT */}
      {activeTab === 'bulk' && (
        <form onSubmit={handleBulkSubmit} className="glass-card p-6 border border-dark-800 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            Bulk CSV Upload
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guide */}
            <div className="md:col-span-1 bg-dark-900 border border-dark-750/70 p-4 rounded-2xl text-xs space-y-3 h-fit">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-primary-400" />
                CSV Format Instructions
              </h4>
              <p className="text-dark-400 leading-relaxed">
                Your CSV file must contain a header row, followed by rows with exactly 3 columns:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-dark-300">
                <li>
                  <span className="font-semibold text-white">Associate Email</span>
                </li>
                <li>
                  <span className="font-semibold text-white">Course ID</span> (numeric ID)
                </li>
                <li>
                  <span className="font-semibold text-white">Deadline</span> (Format: YYYY-MM-DD)
                </li>
              </ol>
              <div className="pt-2 border-t border-dark-750 text-dark-500 font-mono text-[10px]">
                <p className="font-bold text-dark-400">Example Row:</p>
                <p>john.doe@company.com, 5, 2026-06-30</p>
              </div>
            </div>

            {/* Upload Area */}
            <div className="md:col-span-2 space-y-4">
              <div className="border-2 border-dashed border-dark-750 rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-dark-900/20 hover:border-dark-600 transition-colors cursor-pointer relative">
                <input
                  id="assign-csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  required
                />
                <Upload className="w-10 h-10 text-dark-500 mb-3" />
                <p className="text-sm font-semibold text-white">
                  {csvFile ? csvFile.name : 'Choose CSV File or drag here'}
                </p>
                <p className="text-xs text-dark-400 mt-1">Accepts only standard .csv files</p>
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <button
                  id="assign-bulk-submit-btn"
                  type="submit"
                  disabled={bulkSubmitting}
                  className="btn-primary flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {bulkSubmitting ? 'Processing...' : 'Upload & Assign'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
