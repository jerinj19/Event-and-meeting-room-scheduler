import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import ConfirmActionModal from '../components/admin/ConfirmActionModal';

export default function AdminSettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'system'

  // Profile State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // System State
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setDepartment(user.department || '');
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'system' && user?.is_owner) {
      fetchAdmins();
    }
  }, [activeTab, user]);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/?role=admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : data.results || [];
        // Exclude current owner from the dropdown
        setAdmins(list.filter(a => a.id !== user.id));
      }
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const openProfileModal = (e) => {
    e.preventDefault();
    setIsProfileModalOpen(true);
  };

  const confirmProfileSubmit = async () => {
    setSavingProfile(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/me/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          department: department
        })
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const updatedUser = await response.json();
      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
      setIsProfileModalOpen(false);
    }
  };

  const openPasswordModal = (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setIsPasswordModalOpen(true);
  };

  const confirmPasswordSubmit = async () => {
    setSavingPassword(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/me/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
      setIsPasswordModalOpen(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (user?.is_owner) {
      toast.error("System owner cannot delete their account. Transfer ownership first.");
      setIsDeleteModalOpen(false);
      return;
    }
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/me/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Your account has been successfully deleted.');
      setIsDeleteModalOpen(false);
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedAdminId) return;
    setTransferring(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/users/transfer-ownership/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_owner_id: selectedAdminId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transfer ownership');
      }

      toast.success('Ownership transferred successfully. You are now a standard administrator.');
      setIsTransferModalOpen(false);
      
      // Update local user state
      const updatedUser = { ...user, is_owner: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // In a real app, you might want to reload or dispatch an auth update here
      window.location.reload(); 
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="min-h-full bg-surface text-on-surface p-4 md:p-8 font-body-md">
      <main className="max-w-4xl mx-auto space-y-6">
        <header className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-semibold text-on-surface tracking-tight">Settings</h1>
          <p className="text-sm text-secondary mt-1">Manage your personal profile, security, and global system configurations.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-outline-variant/30 px-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'profile' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-secondary hover:text-on-surface hover:border-outline-variant'
            }`}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'security' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-secondary hover:text-on-surface hover:border-outline-variant'
            }`}
          >
            Security & Password
          </button>
          {user?.is_owner && (
            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'system' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-secondary hover:text-on-surface hover:border-outline-variant'
              }`}
            >
              System Ownership
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm p-6 sm:p-8">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-6">Personal Details</h2>
              <form onSubmit={openProfileModal} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-label-sm font-semibold text-on-surface">First Name</label>
                    <input 
                      type="text" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-label-sm font-semibold text-on-surface">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">Department</label>
                  <select 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none appearance-none"
                  >
                    <option value="">Unassigned</option>
                    <option value="engineering">Engineering</option>
                    <option value="product">Product & Design</option>
                    <option value="sales">Sales & Marketing</option>
                    <option value="hr">Human Resources</option>
                    <option value="finance">Finance</option>
                    <option value="Facilities">Facilities & Operations</option>
                    <option value="IT">IT Infrastructure</option>
                    <option value="Executive">Executive Office</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-primary-container text-on-primary hover:bg-primary rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold mb-6">Change Password</h2>
              <form onSubmit={openPasswordModal} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">Current Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-label-sm font-semibold text-on-surface">Confirm New Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-on-surface focus:outline-none transition-colors"
                      tabIndex="-1"
                    >
                      <span className="material-symbols-outlined text-[18px]" data-icon={showPassword ? "visibility_off" : "visibility"}>
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={savingPassword}
                    className="px-6 py-2.5 bg-primary-container text-on-primary hover:bg-primary rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              <hr className="my-8 border-outline-variant/30" />

              <div className="flex items-start gap-4 p-4 bg-error-container/10 border border-error/20 rounded-xl">
                <span className="material-symbols-outlined text-error" data-icon="warning">warning</span>
                <div>
                  <h3 className="font-semibold text-error mb-1">Danger Zone: Delete Account</h3>
                  <p className="text-sm text-secondary leading-relaxed mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button 
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-6 py-2 bg-error text-white hover:bg-error/90 rounded-lg font-medium text-sm shadow-sm transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM TAB */}
          {activeTab === 'system' && user?.is_owner && (
            <div className="max-w-2xl">
              <div className="flex items-start gap-4 mb-8 p-4 bg-error-container/10 border border-error/20 rounded-xl">
                <span className="material-symbols-outlined text-error" data-icon="warning">warning</span>
                <div>
                  <h3 className="font-semibold text-error mb-1">Danger Zone: Transfer Ownership</h3>
                  <p className="text-sm text-secondary leading-relaxed">
                    Transferring system ownership is a permanent action. The new owner will gain exclusive abilities 
                    to manage other administrators, modify system settings, and delete users. 
                    You will be demoted to a standard Administrator.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-label-sm font-semibold text-on-surface">Select New System Owner</label>
                {loadingAdmins ? (
                  <div className="text-sm text-secondary flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[16px]" data-icon="progress_activity">progress_activity</span>
                    Loading administrators...
                  </div>
                ) : admins.length === 0 ? (
                  <p className="text-sm text-secondary italic">No other administrators are available in the system.</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      className="w-full max-w-sm px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none appearance-none"
                    >
                      <option value="">-- Choose an administrator --</option>
                      {admins.map(admin => (
                        <option key={admin.id} value={admin.id}>
                          {admin.first_name} {admin.last_name} ({admin.email})
                        </option>
                      ))}
                    </select>
                    
                    <button
                      type="button"
                      disabled={!selectedAdminId}
                      onClick={() => setIsTransferModalOpen(true)}
                      className="px-6 py-2.5 bg-error text-white hover:bg-error/90 rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                    >
                      Transfer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      <ConfirmActionModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setIsTransferModalOpen(false)} 
        onConfirm={handleTransferOwnership}
        title="Transfer System Ownership?"
        subtitle="Critical Action"
        icon="gavel"
        iconColor="text-error"
        iconBg="bg-error-container/20"
        confirmText={transferring ? "Transferring..." : "Yes, Transfer Ownership"}
        confirmColorClass="bg-error hover:bg-error/90 text-white"
        noticeText={`You are about to transfer complete control of the system. You will lose the ability to manage other administrators. This cannot be undone.`}
      />

      <ConfirmActionModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        onConfirm={confirmProfileSubmit}
        title="Update Profile?"
        subtitle="Account Settings"
        icon="person"
        iconColor="text-primary"
        iconBg="bg-primary-container/20"
        confirmText={savingProfile ? "Saving..." : "Yes, Update Profile"}
        confirmColorClass="bg-primary hover:bg-primary/90 text-white"
        noticeText={`Are you sure you want to save these changes to your personal details?`}
      />

      <ConfirmActionModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
        onConfirm={confirmPasswordSubmit}
        title="Change Password?"
        subtitle="Security Settings"
        icon="lock"
        iconColor="text-error"
        iconBg="bg-error-container/20"
        confirmText={savingPassword ? "Updating..." : "Yes, Change Password"}
        confirmColorClass="bg-error hover:bg-error/90 text-white"
        noticeText={`This will update your password and log you out of any other active sessions. Make sure you remember your new password.`}
      />

      <ConfirmActionModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteAccount}
        title="Delete Account?"
        subtitle="Irreversible Action"
        icon="delete_forever"
        iconColor="text-error"
        iconBg="bg-error-container/20"
        confirmText={deleting ? "Deleting..." : "Yes, Delete My Account"}
        confirmColorClass="bg-error hover:bg-error/90 text-white"
        noticeText={user?.is_owner ? "You are the system owner. You cannot delete your account without first transferring ownership." : "Are you absolutely sure you want to delete your account? This will immediately terminate your session and delete your data permanently."}
      />

    </div>
  );
}
