import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

const CreateUserModal = ({ isOpen, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('Facilities');
  const [role, setRole] = useState('user'); // 'user' or 'admin'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = role === 'admin' ? 'http://localhost:8000/api/auth/create-admin/' : 'http://localhost:8000/api/auth/register/';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          confirm_password: confirmPassword,
          department
        })
      });

      if (response.ok) {
        toast.success(role === 'admin' ? 'Admin created successfully!' : 'User created successfully!');
        onClose();
        // Reset form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setRole('user');
      } else {
        const data = await response.json();
        const errorMessage = typeof data === 'object' && Object.values(data).length > 0 
          ? Object.values(data)[0] 
          : 'Failed to create user.';
        toast.error(errorMessage || 'Failed to create user.');
      }
    } catch (err) {
      toast.error('Network error creating user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08)] max-w-md w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]" data-icon="person_add">person_add</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-on-surface">Create User</h2>
              <p className="text-body-sm text-secondary">Add a new user or administrator to the system.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-secondary hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined" data-icon="close">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-label-sm font-semibold text-on-surface">Work Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">Department</label>
              <select 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none appearance-none"
              >
                <option value="Facilities">Facilities & Operations</option>
                <option value="IT">IT Infrastructure</option>
                <option value="Executive">Executive Office</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none appearance-none"
              >
                <option value="user">Standard User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-label-sm font-semibold text-on-surface">Temporary Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
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

          <div className="space-y-1">
            <label className="text-label-sm font-semibold text-on-surface">Confirm Temporary Password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
                required
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-on-surface focus:outline-none transition-colors"
                tabIndex="-1"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon={showConfirmPassword ? "visibility_off" : "visibility"}>
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-low rounded-lg font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-primary-container text-on-primary hover:bg-primary rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
