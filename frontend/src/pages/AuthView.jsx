import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import './AuthView.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 0H0v10h10V0z" fill="#f35325"/>
    <path d="M21 0H11v10h10V0z" fill="#81bc06"/>
    <path d="M10 11H0v10h10V11z" fill="#05a6f0"/>
    <path d="M21 11H11v10h10V11z" fill="#ffba08"/>
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
);

const LockIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
);

const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#0051d5"/>
    <path d="M6 12L10 16L18 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRight = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
);

const TopRightArrow = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
);

const AuthView = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const { login, register, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.is_staff) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await login(email, password);
    } else {
      await register(email, password, firstName, lastName, department);
    }
  };

  return (
    <div className="auth-layout">
      {/* LEFT PANE - HERO */}
      <div className="auth-hero">
        <div className="hero-overlay">
          <div className="hero-top-logo">
            <div className="logo-box">
              <LogoIcon />
            </div>
            <div className="logo-text">
              <span className="logo-title">Event & Meeting Room Scheduler</span>
              <span className="logo-subtitle">ENTERPRISE WORKSPACE PLATFORM</span>
            </div>
          </div>

          <div className="hero-content">
            <div className="badge">
              <span className="dot"></span> Real-Time Space Intelligence v4.2
            </div>
            <h1>Intelligent Spaces.<br/>Seamless Meetings.</h1>
            <p>Effortlessly orchestrate executive boardrooms, hybrid collaboration hubs, and client presentation suites with real-time enterprise scheduling.</p>
            
            <div className="stats-card">
              <div className="stat-item">
                <div className="stat-icon">
                  <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><circle cx="18" cy="6" r="3"></circle><path d="M8.59 13.51l6.83 3.98"></path><path d="M15.41 6.51l-6.82 3.98"></path></svg>
                </div>
                <div className="stat-text">
                  <strong>3,400+ Enterprise Spaces</strong>
                  <span>Active corporate facilities globally</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <div className="stat-icon-green">
                  <svg width="20" height="20" fill="none" stroke="#10b981" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div className="stat-text">
                  <strong>99.98%</strong>
                  <span>Schedule Uptime SLA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* RIGHT PANE - FORM */}
      <div className="auth-form-container">
        <div className="support-link">
          Need enterprise assistance? <a href="#">Contact Support <TopRightArrow /></a>
        </div>

        <div className="auth-card-wrapper">
          <div className="auth-card">
            <div className="card-header">
              <h2>Sign in to your portal</h2>
              <p>Access your enterprise room reservations & schedules</p>
            </div>

            <div className="segmented-control">
              <button className={`segment ${isLogin ? 'active' : ''}`} onClick={() => setIsLogin(true)}>Log In</button>
              <button className={`segment ${!isLogin ? 'active' : ''}`} onClick={() => setIsLogin(false)}>Register</button>
            </div>

            <div className="social-logins">
              <button 
                type="button" 
                className="btn-social"
                onClick={() => toast.info('Google Workspace SSO is coming soon!')}
              >
                <GoogleIcon /> Google Workspace
              </button>
              <button 
                type="button" 
                className="btn-social"
                onClick={() => toast.info('Microsoft 365 SSO is coming soon!')}
              >
                <MicrosoftIcon /> Microsoft 365
              </button>
            </div>

            <div className="divider">
              <span>OR CONTINUE WITH SSO</span>
            </div>

            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <>
                  <div className="form-group-row">
                    <div className="form-group half">
                      <label>First Name</label>
                      <div className="input-wrapper">
                        <input 
                          type="text" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John" 
                          required={!isLogin} 
                        />
                      </div>
                    </div>
                    <div className="form-group half">
                      <label>Last Name</label>
                      <div className="input-wrapper">
                        <input 
                          type="text" 
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe" 
                          required={!isLogin} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Department</label>
                    <div className="input-wrapper">
                      <select 
                        value={department} 
                        onChange={(e) => setDepartment(e.target.value)}
                        required={!isLogin}
                      >
                        <option value="" disabled>Select department</option>
                        <option value="engineering">Engineering</option>
                        <option value="product">Product & Design</option>
                        <option value="sales">Sales & Marketing</option>
                        <option value="hr">Human Resources</option>
                        <option value="finance">Finance</option>
                      </select>
                      <span className="input-icon right">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Work Email</label>
                <div className="input-wrapper">
                  <span className="input-icon"><MailIcon /></span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com" 
                    required 
                  />
                </div>
              </div>
              
              <div className="form-group">
                <div className="label-row">
                  <label>Password</label>
                  {isLogin && <a href="#" className="forgot-password">Forgot password?</a>}
                </div>
                <div className="input-wrapper">
                  <span className="input-icon"><LockIcon /></span>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••" 
                    required 
                  />
                  <span 
                    className="input-icon right" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </span>
                </div>
              </div>

              {isLogin && (
                <div className="checkbox-group">
                  <input type="checkbox" id="remember" />
                  <label htmlFor="remember">Remember this device for 30 days</label>
                </div>
              )}

              <button type="submit" className="btn-primary">
                {isLogin ? 'Log In' : 'Register'} <ArrowRight />
              </button>
            </form>

            <div className="card-footer">
              <ShieldIcon /> Protected by SOC2 Type II compliance & enterprise SSO
            </div>
          </div>
        </div>

        <div className="page-footer">
          © 2025 Event & Meeting Room Scheduler Inc. All rights reserved. <span>·</span> <a href="#">Privacy Policy</a> <span>·</span> <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
