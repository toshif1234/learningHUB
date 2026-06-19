import { useState, useEffect } from 'react';
import { usersAPI } from '../../api/users';
import { toast } from 'react-hot-toast';
import { Users, Shield, UserMinus, UserCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');

  // Modal actions
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const res = await usersAPI.list(params);
      setUsers(res.data || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleOpenRoleModal = (user) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleToggleRole = async () => {
    const targetRole = selectedUser.role === 'admin' ? 'associate' : 'admin';
    try {
      setActionLoading(true);
      await usersAPI.updateRole(selectedUser.id, { role: targetRole });
      toast.success(`User role updated to ${targetRole} successfully!`);
      setIsRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenStatusModal = (user) => {
    setSelectedUser(user);
    setIsStatusModalOpen(true);
  };

  const handleToggleStatus = async () => {
    const targetStatus = !selectedUser.is_active;
    try {
      setActionLoading(true);
      await usersAPI.updateStatus(selectedUser.id, { is_active: targetStatus });
      toast.success(targetStatus ? 'User account activated' : 'User account deactivated');
      setIsStatusModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      await usersAPI.deleteUser(selectedUser.id);
      toast.success('Associate account deleted successfully!');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete user';
      toast.error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Badging helpers
  const getRoleBadge = (role) => {
    return role === 'admin' ? (
      <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase text-[10px] font-bold py-1 px-3">
        Admin
      </span>
    ) : (
      <span className="badge bg-primary-500/10 text-primary-400 border border-primary-500/20 uppercase text-[10px] font-bold py-1 px-3">
        Associate
      </span>
    );
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="badge bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">Active</span>
    ) : (
      <span className="badge bg-rose-500/15 text-rose-400 font-semibold text-[11px]">Inactive</span>
    );
  };

  const columns = [
    {
      key: 'name',
      header: 'Full Name',
      sortable: true,
      accessor: 'full_name',
      render: (row) => <span className="font-semibold text-white">{row.full_name}</span>
    },
    {
      key: 'email',
      header: 'Email Address',
      sortable: true,
      accessor: 'email',
      render: (row) => <span className="font-mono text-xs">{row.email}</span>
    },
    {
      key: 'role',
      header: 'System Role',
      sortable: true,
      accessor: 'role',
      render: (row) => getRoleBadge(row.role)
    },
    {
      key: 'status',
      header: 'Verification / Account',
      sortable: true,
      accessor: 'is_active',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {getStatusBadge(row.is_active)}
            {row.is_verified ? (
              <span className="text-[10px] text-emerald-400/80 font-medium">Verified</span>
            ) : (
              <span className="text-[10px] text-dark-500 font-medium">Unverified</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Change Role */}
          <button
            id={`user-role-toggle-${row.id}`}
            onClick={() => handleOpenRoleModal(row)}
            className="p-2 bg-dark-800 hover:bg-dark-700 border border-dark-750 hover:border-dark-600 text-dark-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Modify Role"
          >
            <Shield className="w-4 h-4 text-primary-400" />
            {row.role === 'admin' ? 'Demote' : 'Promote'}
          </button>

          {/* Toggle status */}
          <button
            id={`user-status-toggle-${row.id}`}
            onClick={() => handleOpenStatusModal(row)}
            className={`p-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              row.is_active
                ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 hover:border-rose-500/40 text-rose-400'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400'
            }`}
            title={row.is_active ? 'Deactivate User' : 'Activate User'}
          >
            {row.is_active ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>

          {/* Delete User (Associates only) */}
          {row.role === 'associate' && (
            <button
              id={`user-delete-${row.id}`}
              onClick={() => handleOpenDeleteModal(row)}
              className="p-2 bg-dark-800 hover:bg-rose-500/10 border border-dark-750 hover:border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Delete Associate Account"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div id="user-management-container" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">User Management</h1>
        <p className="text-dark-400 text-sm mt-1">Administer user accounts, security roles, and platform permissions</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border border-dark-800/60 max-w-xs">
        <select
          id="user-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field py-2.5 text-sm"
        >
          <option value="">Filter by Role</option>
          <option value="admin">Administrators</option>
          <option value="associate">Associates</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchPlaceholder="Search by name or email..."
        emptyTitle="No users registered yet"
        emptyIcon={Users}
      />

      {/* Modal: Change Role */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={selectedUser?.role === 'admin' ? 'Demote Administrator?' : 'Promote to Administrator?'}
        actions={
          <div className="flex items-center gap-2">
            <button
              id="role-cancel-btn"
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="btn-secondary py-2 px-5 text-sm"
            >
              Cancel
            </button>
            <button
              id="role-confirm-btn"
              type="button"
              onClick={handleToggleRole}
              disabled={actionLoading}
              className="btn-primary py-2 px-5 text-sm bg-gradient-to-r from-primary-600 to-indigo-500"
            >
              {actionLoading ? 'Updating...' : 'Confirm Change'}
            </button>
          </div>
        }
      >
        <div className="flex gap-4 p-1">
          <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center text-primary-400 flex-shrink-0 animate-pulse-slow">
            {selectedUser?.role === 'admin' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Modify security clearance?</h3>
            <p className="text-sm text-dark-400 mt-1.5 leading-relaxed">
              {selectedUser?.role === 'admin' ? (
                <span>
                  You are about to demote <span className="font-semibold text-white">{selectedUser?.full_name}</span> from <span className="font-semibold text-white">Administrator</span> to <span className="font-semibold text-white">Associate</span>. This will revoke all their permissions to manage courses, assignments, analytics, and user lists.
                </span>
              ) : (
                <span>
                  You are about to promote <span className="font-semibold text-white">{selectedUser?.full_name}</span> to <span className="font-semibold text-white">Administrator</span>. This will grant them complete access to manage all aspects of the LearningHUB platform, including course content, user directories, and reports.
                </span>
              )}
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal: Toggle Status */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={selectedUser?.is_active ? 'Deactivate User Account?' : 'Activate User Account?'}
        actions={
          <div className="flex items-center gap-2">
            <button
              id="status-cancel-btn"
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="btn-secondary py-2 px-5 text-sm"
            >
              Cancel
            </button>
            <button
              id="status-confirm-btn"
              type="button"
              onClick={handleToggleStatus}
              disabled={actionLoading}
              className={selectedUser?.is_active ? 'btn-danger py-2 px-5 text-sm' : 'btn-primary py-2 px-5 text-sm'}
            >
              {actionLoading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        }
      >
        <div className="flex gap-4 p-1">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            selectedUser?.is_active ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">
              {selectedUser?.is_active ? 'Suspend account access?' : 'Restore account access?'}
            </h3>
            <p className="text-sm text-dark-400 mt-1.5 leading-relaxed">
              {selectedUser?.is_active ? (
                <span>
                  This will temporarily deactivate the account of <span className="font-semibold text-white">{selectedUser?.full_name}</span>. They will be immediately blocked from signing into the system, taking courses, or utilizing any resources until reactivated.
                </span>
              ) : (
                <span>
                  This will reactivate the account of <span className="font-semibold text-white">{selectedUser?.full_name}</span>, allowing them to sign back in and resume their training.
                </span>
              )}
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal: Delete User */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Associate Account?"
        actions={
          <div className="flex items-center gap-2">
            <button
              id="delete-cancel-btn"
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn-secondary py-2 px-5 text-sm"
            >
              Cancel
            </button>
            <button
              id="delete-confirm-btn"
              type="button"
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="btn-danger py-2 px-5 text-sm"
            >
              {actionLoading ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        }
      >
        <div className="flex gap-4 p-1">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Permanently delete account?</h3>
            <p className="text-sm text-dark-400 mt-1.5 leading-relaxed">
              Are you sure you want to permanently delete the associate account for <span className="font-semibold text-white">{selectedUser?.full_name}</span> ({selectedUser?.email})? This action cannot be undone and will delete all their training progress, assessment results, and course assignments.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
