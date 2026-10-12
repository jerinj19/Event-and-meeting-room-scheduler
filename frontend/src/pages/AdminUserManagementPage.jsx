import React, { useState, useEffect } from 'react';
import CreateUserModal from '../components/admin/CreateUserModal';
import ConfirmActionModal from '../components/admin/ConfirmActionModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function AdminUserManagementPage() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'user', 'admin'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    actionType: null, // 'delete', 'block', 'promote', 'demote'
    user: null,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch('http://localhost:8000/api/users/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        throw new Error('Session expired. Please log out and log back in.');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to view this directory.');
      }
      if (!response.ok) {
        const text = await response.text();
        console.error("Fetch users failed:", response.status, text);
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setAllUsers(list);
    } catch (err) {
      console.error("fetchUsers error:", err);
      toast.error(err.message || 'Could not load directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const ownerId = React.useMemo(() => {
    if (!allUsers.length) return null;
    const admins = allUsers.filter(u => u.is_staff);
    if (!admins.length) return null;
    return admins.reduce((oldest, current) => {
      if (!oldest.date_joined) return oldest;
      if (!current.date_joined) return oldest;
      return (new Date(oldest.date_joined) < new Date(current.date_joined)) ? oldest : current;
    }).id;
  }, [allUsers]);

  const handleAction = (type, u) => {
    if (type === 'demote' && u.id === currentUser.id) {
      toast.error("You cannot demote yourself.");
      return;
    }
    if (type === 'delete' && u.id === currentUser.id) {
      toast.error("You cannot delete yourself.");
      return;
    }
    setModalConfig({ isOpen: true, actionType: type, user: u });
  };

  const executeAction = async () => {
    const { user: u, actionType } = modalConfig;
    const userId = u.id;
    setModalConfig({ isOpen: false, actionType: null, user: null });
    
    try {
      const token = localStorage.getItem('access_token');
      let method = 'PATCH';
      let body = {};

      if (actionType === 'delete') {
        method = 'DELETE';
      } else if (actionType === 'block') {
        body = { is_active: !u.is_active };
      } else if (actionType === 'promote') {
        body = { is_staff: true };
      } else if (actionType === 'demote') {
        body = { is_staff: false };
      }

      const response = await fetch(`http://localhost:8000/api/users/${userId}/`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {})
        },
        body: method === 'PATCH' ? JSON.stringify(body) : undefined
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${actionType} user`);
      }
      
      const roleName = u.is_staff ? 'Admin' : 'User';
      if (actionType === 'delete') toast.success(`${roleName} deleted successfully.`);
      else if (actionType === 'block') toast.success(u.is_active ? `${roleName} blocked successfully.` : `${roleName} unblocked successfully.`);
      else if (actionType === 'promote') toast.success('User promoted to Admin.');
      else if (actionType === 'demote') toast.success('Admin demoted to Standard User.');
      
      fetchUsers();
    } catch (err) {
      toast.error(err.message || `Could not ${actionType} user.`);
    }
  };

  const filteredUsers = React.useMemo(() => {
    let result = allUsers;
    
    // Filter by role
    if (roleFilter === 'admin') {
      result = result.filter(u => u.is_staff);
    } else if (roleFilter === 'user') {
      result = result.filter(u => !u.is_staff);
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.email && u.email.toLowerCase().includes(q)) || 
        (u.first_name && u.first_name.toLowerCase().includes(q)) || 
        (u.last_name && u.last_name.toLowerCase().includes(q))
      );
    }
    
    return result;
  }, [allUsers, roleFilter, searchQuery]);

  return (
    <div className="min-h-full bg-surface text-on-surface p-4 md:p-8 font-body-md">
      <main className="max-w-[1200px] mx-auto space-y-6">
        
        <header className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight">Directory Management</h1>
            <p className="text-sm text-secondary mt-1">Manage system users, administrators, and permissions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary-container focus:ring-1 transition-all appearance-none pr-8 cursor-pointer relative"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1em 1em',
              }}
            >
              <option value="all">All Roles</option>
              <option value="user">Standard Users</option>
              <option value="admin">Administrators</option>
            </select>
            
            <div className="relative flex-grow">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-sm" data-icon="search">search</span>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 lg:w-64 pl-9 pr-3 py-2 text-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-1 transition-all" 
                placeholder="Search..." 
                type="text"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              disabled={!currentUser?.is_owner}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 whitespace-nowrap ${
                !currentUser?.is_owner 
                  ? 'bg-surface-container text-secondary cursor-not-allowed' 
                  : 'bg-primary-container text-on-primary hover:bg-primary shadow-sm hover:shadow'
              }`}
              title={!currentUser?.is_owner ? "Only the system owner can create users" : "Create New User"}
              type="button"
            >
              <span className="material-symbols-outlined" data-icon="person_add">person_add</span>
              <span>Create User</span>
            </button>
          </div>
        </header>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-low/60 border-b border-outline-variant/40 text-xs font-semibold text-secondary uppercase tracking-wider">
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-6">Department</th>
                  <th className="py-3 px-6">Role Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-sm text-on-surface">
                {loading ? (
                  <tr><td colSpan="4" className="py-8 text-center text-secondary">Loading...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-secondary">No users found.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center border ${
                            u.is_staff 
                              ? 'bg-primary-container/20 text-primary border-primary/10'
                              : 'bg-primary/10 text-primary border-transparent'
                          }`}>
                            {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-1.5">
                              {u.first_name} {u.last_name} 
                              {currentUser?.id === u.id && <span className="text-[10px] text-secondary font-normal">(You)</span>}
                              {ownerId === u.id && <span className="material-symbols-outlined text-[14px] text-amber-500" title="System Owner">shield_person</span>}
                            </div>
                            <div className="text-secondary text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium text-secondary">
                        {u.department || 'Unassigned'}
                      </td>
                      <td className="py-4 px-6">
                        {!u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Blocked {u.is_staff ? 'Admin' : 'User'}
                          </span>
                        ) : u.is_staff ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Super Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Standard User
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Block/Unblock Action */}
                          <button 
                            onClick={() => handleAction('block', u)}
                            disabled={currentUser?.id === u.id || ownerId === u.id || !currentUser?.is_owner}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                              (currentUser?.id === u.id || ownerId === u.id || !currentUser?.is_owner)
                                ? 'bg-surface-container-low text-secondary cursor-not-allowed border border-outline-variant/30'
                                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/50'
                            }`}
                            title={
                              !currentUser?.is_owner ? "Only system owner can block" : 
                              currentUser?.id === u.id ? "You cannot block yourself" :
                              ownerId === u.id ? "System owner cannot be blocked" :
                              u.is_active ? `Block ${u.is_staff ? 'Admin' : 'User'}` : `Unblock ${u.is_staff ? 'Admin' : 'User'}`
                            }
                          >
                            {u.is_active ? "Block" : "Unblock"}
                          </button>

                          {/* Promote/Demote Action */}
                          {u.is_staff ? (
                            <button 
                              onClick={() => handleAction('demote', u)}
                              disabled={currentUser?.id === u.id || ownerId === u.id || !currentUser?.is_owner}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                                (currentUser?.id === u.id || ownerId === u.id || !currentUser?.is_owner)
                                  ? 'bg-surface-container-low text-secondary cursor-not-allowed border border-outline-variant/30' 
                                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              }`}
                              title={
                                !currentUser?.is_owner
                                  ? "Only the system owner can demote admins"
                                  : currentUser?.id === u.id 
                                    ? "You cannot demote yourself" 
                                    : ownerId === u.id
                                      ? "System owner cannot be demoted"
                                      : "Demote to standard user"
                              }
                            >
                              Demote
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleAction('promote', u)}
                              disabled={!currentUser?.is_owner}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                                !currentUser?.is_owner
                                  ? 'bg-surface-container-low text-secondary cursor-not-allowed border border-outline-variant/30'
                                  : 'bg-primary-container text-on-primary hover:bg-primary shadow-sm hover:shadow border border-primary/20'
                              }`}
                              title={!currentUser?.is_owner ? "Only the system owner can promote users" : "Promote to Admin"}
                            >
                              Promote
                            </button>
                          )}
                          
                          {/* Delete Action */}
                          <button 
                            onClick={() => handleAction('delete', u)}
                            disabled={currentUser?.id === u.id || ownerId === u.id || !currentUser?.is_owner}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                              (currentUser?.id === u.id || ownerId === u.id || !currentUser?.is_owner)
                                ? 'bg-surface-container-low text-secondary cursor-not-allowed border border-outline-variant/30'
                                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            }`}
                            title={
                              !currentUser?.is_owner ? "Only system owner can delete" :
                              currentUser?.id === u.id ? "You cannot delete yourself" :
                              ownerId === u.id ? "System owner cannot be deleted" :
                              `Delete ${u.is_staff ? 'Admin' : 'User'}`
                            }
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <CreateUserModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          fetchUsers();
        }} 
      />

      <ConfirmActionModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, actionType: null, user: null })}
        onConfirm={executeAction}
        title={
          modalConfig.actionType === 'delete' ? `Delete ${modalConfig.user?.is_staff ? 'Admin' : 'User'}?` : 
          modalConfig.actionType === 'promote' ? 'Promote to Admin?' : 
          modalConfig.actionType === 'demote' ? 'Demote to User?' : 
          (modalConfig.user?.is_active ? `Block ${modalConfig.user?.is_staff ? 'Admin' : 'User'}?` : `Unblock ${modalConfig.user?.is_staff ? 'Admin' : 'User'}?`)
        }
        subtitle="Directory Management"
        icon={
          modalConfig.actionType === 'delete' ? 'delete_forever' : 
          modalConfig.actionType === 'promote' ? 'admin_panel_settings' : 
          modalConfig.actionType === 'demote' ? 'person_remove' : 
          (modalConfig.user?.is_active ? 'block' : 'check_circle')
        }
        iconColor={
          modalConfig.actionType === 'delete' ? 'text-red-600' : 
          modalConfig.actionType === 'promote' ? 'text-primary' : 
          modalConfig.actionType === 'demote' ? 'text-amber-600' : 
          (modalConfig.user?.is_active ? 'text-amber-600' : 'text-emerald-600')
        }
        iconBg={
          modalConfig.actionType === 'delete' ? 'bg-red-50' : 
          modalConfig.actionType === 'promote' ? 'bg-primary/10' : 
          modalConfig.actionType === 'demote' ? 'bg-amber-50' : 
          (modalConfig.user?.is_active ? 'bg-amber-50' : 'bg-emerald-50')
        }
        confirmText={
          modalConfig.actionType === 'delete' ? 'Confirm Delete' : 
          modalConfig.actionType === 'promote' ? 'Confirm Promote' : 
          modalConfig.actionType === 'demote' ? 'Confirm Demote' : 
          (modalConfig.user?.is_active ? 'Confirm Block' : 'Confirm Unblock')
        }
        confirmColorClass={
          modalConfig.actionType === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' : 
          modalConfig.actionType === 'promote' ? 'bg-primary hover:bg-primary/90 text-white' : 
          modalConfig.actionType === 'demote' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 
          (modalConfig.user?.is_active ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white')
        }
        noticeText={
          modalConfig.actionType === 'delete' ? `This action is permanent and will completely remove the ${modalConfig.user?.is_staff ? 'admin' : 'user'} and their associated data from the system.` : 
          modalConfig.actionType === 'promote' ? "Promoting this user will grant them administrative privileges over the entire system." : 
          modalConfig.actionType === 'demote' ? "Demoting this admin will revoke their access to the Admin Dashboard and convert them to a standard user." : 
          (modalConfig.user?.is_active ? `Blocking this ${modalConfig.user?.is_staff ? 'admin' : 'user'} will immediately revoke their access to the system. Existing bookings will be preserved.` : `Unblocking this ${modalConfig.user?.is_staff ? 'admin' : 'user'} will restore their access to the system.`)
        }
        targetUser={modalConfig.user}
        isBlock={modalConfig.actionType === 'block' && modalConfig.user?.is_active}
        isDemote={modalConfig.actionType === 'demote'}
      />
    </div>
  );
}
