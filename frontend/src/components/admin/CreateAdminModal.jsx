import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

const CreateAdminModal = ({ isOpen, onClose }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Facilities');
  const [loading, setLoading] = useState(false);
  
  const toast = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8000/api/auth/create-admin/', {
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
          department
        })
      });

      if (response.ok) {
        toast.success('Admin created successfully!');
        onClose();
        // Reset form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Failed to create admin.');
      }
    } catch (err) {
      toast.error('Network error creating admin.');
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
              <span className="material-symbols-outlined text-[20px]" data-icon="admin_panel_settings">admin_panel_settings</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-on-surface">Create Admin</h2>
              <p className="text-body-sm text-secondary">Grant administrative access to a new user.</p>
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
            <label className="text-label-sm font-semibold text-on-surface">Temporary Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none"
              required
            />
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
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAdminModal;
