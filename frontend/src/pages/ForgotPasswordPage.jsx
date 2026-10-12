import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link');
      }
      
      setSent(true);
      toast.success('Reset link sent to your email');
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
            <span className="material-symbols-outlined text-[24px]">lock_reset</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Reset Password</h1>
          <p className="text-secondary mt-2 text-sm">
            {sent 
              ? "Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder." 
              : "Enter your email address and we'll send you a link to reset your password."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-label-sm font-semibold text-on-surface">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all"
                required
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-primary-container text-on-primary hover:bg-primary rounded-lg font-medium text-sm shadow-sm transition-colors disabled:opacity-50 mt-6"
            >
              {loading ? 'Sending Link...' : 'Send Reset Link'}
            </button>
            
            <div className="text-center pt-4">
              <Link to="/login" className="text-primary hover:text-primary-container text-sm font-medium transition-colors">
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <button 
              onClick={() => { setSent(false); setEmail(''); }}
              className="w-full py-3 bg-surface border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-lg font-medium text-sm transition-colors"
            >
              Try another email
            </button>
            <div className="mt-4">
              <Link to="/login" className="text-primary hover:text-primary-container text-sm font-medium transition-colors">
                Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
