import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  if (!uid || !token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-[48px] text-error mb-4">error</span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Invalid Reset Link</h1>
          <p className="text-secondary mb-6">The password reset link is missing or invalid. Please request a new one.</p>
          <Link to="/forgot-password" className="text-primary hover:underline font-medium">Request new link</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, password, confirm_password: confirmPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      setSuccess(true);
      toast.success('Password successfully reset!');
      
      // Navigate to login after short delay
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
            <span className="material-symbols-outlined text-[24px]">key</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Create New Password</h1>
          <p className="text-secondary mt-2 text-sm">
            Please enter your new password below.
          </p>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">New Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary-container text-on-primary hover:bg-primary rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50 mt-6"
            >
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
              <span className="material-symbols-outlined text-[32px]">check_circle</span>
            </div>
            <h3 className="text-lg font-medium text-on-surface">Success!</h3>
            <p className="text-secondary text-sm mt-2">Your password has been reset. Redirecting to login...</p>
          </div>
        )}
      </div>
    </div>
  );
}
