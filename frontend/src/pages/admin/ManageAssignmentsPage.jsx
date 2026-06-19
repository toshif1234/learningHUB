import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentsAPI } from '../../api/assignments';
import { coursesAPI } from '../../api/courses';
import { toast } from 'react-hot-toast';
import { ClipboardList, Calendar, Trash2, ShieldAlert, UserPlus } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';

export default function ManageAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [newDeadline, setNewDeadline] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (courseFilter) params.course_id = parseInt(courseFilter);
      if (statusFilter) params.status_filter = statusFilter;

      const res = await assignmentsAPI.list(params);
      setAssignments(res.data || []);
    } catch (err) {
      toast.error('Failed to load assignments list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [courseFilter, statusFilter]);

  useEffect(() => {
    // Load courses for filter dropdown
    const loadCourses = async () => {
      try {
        const res = await coursesAPI.list({ course_type: 'assigned' });
        setCourses(res.data || []);
      } catch (err) {
        // silent
      }
    };
    loadCourses();
  }, []);

  const handleOpenExtend = (assignment) => {
    setSelectedAssignment(assignment);
    const existingDate = new Date(assignment.deadline);
    // Convert to local ISO format for input value
    const formatted = new Date(existingDate.getTime() - existingDate.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNewDeadline(formatted);
    setIsExtendOpen(true);
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!newDeadline) {
      toast.error('Please specify the new deadline');
      return;
    }

    const newDate = new Date(newDeadline);
    if (newDate <= new Date()) {
      toast.error('Deadline must be in the future');
      return;
    }

    try {
      setActionLoading(true);
      await assignmentsAPI.extendDeadline(selectedAssignment.id, {
        deadline: newDate.toISOString()
      });
      toast.success('Deadline extended successfully!');
      setIsExtendOpen(false);
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to extend deadline');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRevoke = (assignment) => {
    setSelectedAssignment(assignment);
    setIsRevokeOpen(true);
  };

  const handleRevokeConfirm = async () => {
    try {
      setActionLoading(true);
      await assignmentsAPI.revoke(selectedAssignment.id);
      toast.success('Assignment revoked successfully');
      setIsRevokeOpen(false);
      fetchAssignments();
    } catch (err) {
      toast.error('Failed to revoke assignment');
    } finally {
      setActionLoading(false);
    }
  };

  // Status badging helper
  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      in_progress: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
      completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      overdue: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
    };

    return (
      <span className={`badge uppercase text-[10px] font-bold py-1 px-3 ${badges[status] || badges.pending}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const columns = [
    {
      key: 'course',
      header: 'Assigned Course',
      sortable: true,
      accessor: (row) => row.course?.title || '',
      render: (row) => <span className="font-semibold text-white">{row.course?.title}</span>
    },
    {
      key: 'user',
      header: 'Associate',
      sortable: true,
      accessor: (row) => row.assigned_user?.full_name || '',
      render: (row) => (
        <div>
          <span className="font-medium text-dark-100 block">{row.assigned_user?.full_name}</span>
          <span className="text-xs text-dark-400">{row.assigned_user?.email}</span>
        </div>
      )
    },
    {
      key: 'deadline',
      header: 'Deadline',
      sortable: true,
      accessor: (row) => row.deadline,
      render: (row) => {
        const d = new Date(row.deadline);
        return <span className="font-mono text-xs">{d.toLocaleString()}</span>;
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: 'status',
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.status !== 'completed' && (
            <button
              id={`assignment-extend-btn-${row.id}`}
              onClick={() => handleOpenExtend(row)}
              className="p-2 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/25 hover:border-primary-500/40 text-primary-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Extend Deadline"
            >
              <Calendar className="w-4.5 h-4.5" />
              Extend
            </button>
          )}
          <button
            id={`assignment-revoke-btn-${row.id}`}
            onClick={() => handleOpenRevoke(row)}
            className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 hover:border-rose-500/40 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Revoke Assignment"
          >
            <Trash2 className="w-4.5 h-4.5" />
            Revoke
          </button>
        </div>
      )
    }
  ];

  return (
    <div id="manage-assignments-container" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Manage Training Assignments</h1>
          <p className="text-dark-400 text-sm mt-1">Supervise and schedule employee training obligations</p>
        </div>
        <Link
          id="assignments-create-btn"
          to="/admin/assign"
          className="btn-primary flex items-center justify-center gap-2 self-start md:self-auto"
        >
          <UserPlus className="w-4.5 h-4.5" />
          Assign Course
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-wrap gap-4 border border-dark-800/60">
        {/* Course Filter */}
        <div className="flex-1 min-w-[200px]">
          <select
            id="assignment-course-filter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="input-field py-2.5 text-sm"
          >
            <option value="">Filter by Course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-56">
          <select
            id="assignment-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-2.5 text-sm"
          >
            <option value="">Filter by Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={assignments}
        loading={loading}
        searchPlaceholder="Search associate name or course..."
        emptyTitle="No assignments found"
        emptyDescription="Assign a course to associate users using the Assign Training page."
        emptyIcon={ClipboardList}
      />

      {/* Modal: Extend Deadline */}
      <Modal
        isOpen={isExtendOpen}
        onClose={() => setIsExtendOpen(false)}
        title="Extend Course Deadline"
        actions={
          <div className="flex items-center gap-2">
            <button
              id="extend-cancel-btn"
              type="button"
              onClick={() => setIsExtendOpen(false)}
              className="btn-secondary py-2 px-5 text-sm"
            >
              Cancel
            </button>
            <button
              id="extend-confirm-btn"
              type="button"
              onClick={handleExtendSubmit}
              disabled={actionLoading}
              className="btn-primary py-2 px-5 text-sm"
            >
              {actionLoading ? 'Saving...' : 'Apply Extension'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-dark-300">
            Select the new completion deadline for <span className="font-semibold text-white">{selectedAssignment?.assigned_user?.full_name}</span> in course <span className="font-semibold text-white">{selectedAssignment?.course?.title}</span>.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-4 h-4 text-primary-400" />
              New Deadline Date
            </label>
            <input
              id="extend-deadline-input"
              type="datetime-local"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Revoke Assignment */}
      <Modal
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        title="Revoke Assignment?"
        actions={
          <div className="flex items-center gap-2">
            <button
              id="revoke-cancel-btn"
              type="button"
              onClick={() => setIsRevokeOpen(false)}
              className="btn-secondary py-2 px-5 text-sm"
            >
              Cancel
            </button>
            <button
              id="revoke-confirm-btn"
              type="button"
              onClick={handleRevokeConfirm}
              disabled={actionLoading}
              className="btn-danger py-2 px-5 text-sm"
            >
              {actionLoading ? 'Revoking...' : 'Revoke'}
            </button>
          </div>
        }
      >
        <div className="flex gap-4 p-1">
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Are you absolutely sure?</h3>
            <p className="text-sm text-dark-400 mt-1.5 leading-relaxed">
              This will revoke the assignment for <span className="font-semibold text-white">{selectedAssignment?.assigned_user?.full_name}</span> in the course <span className="font-semibold text-white">{selectedAssignment?.course?.title}</span>.
              All current course progress records of the user for this course will be preserved, but the assignment entry will be deleted.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
