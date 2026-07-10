import React, { useState, useEffect } from 'react';
import { api, storeToken } from '../apiClient';

const LoginPage: React.FC = () => {
  const [view, setView] = useState<'login' | 'forgot-password' | 'reset-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);
  
  // Public settings
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('GEN Z CRM');
  const [crmDetails, setCrmDetails] = useState('Streamline your business operations, manage projects, and enhance client relationships with our advanced CRM platform.');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get<{ logo_url?: string, company_name?: string, crm_details?: string }>('/api/settings/public');
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.company_name) setCompanyName(data.company_name);
        if (data.crm_details) setCrmDetails(data.crm_details);
      } catch (err) {
        console.error('Failed to fetch public settings');
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await api.post<{ token: string; user: unknown }>('/api/auth/login', { email, password });
      storeToken(data.token, rememberMe);
      window.dispatchEvent(new Event('crm:login'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/api/auth/forgot-password', { email });
      setSuccessMsg('OTP sent to your email.');
      setView('reset-password');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.post('/api/auth/reset-password', { email, otp, newPassword });
      setSuccessMsg('Password reset successfully. You can now login.');
      setView('login');
      setPassword('');
      setNewPassword('');
      setOtp('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left side - Branding & Details */}
      <div className="md:w-1/2 bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] flex flex-col justify-center items-center p-12 text-white shadow-2xl relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-white blur-3xl"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-primary blur-3xl"></div>
        </div>
        
        <div className="max-w-lg relative z-10 text-center md:text-left">
          <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">{companyName}</h1>
          
          <h2 className="text-3xl font-bold mb-6 leading-tight">
            {greeting} to <br className="hidden md:block" /> {companyName}
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-8">
            {crmDetails}
          </p>

          <div className="space-y-4 mb-10">
            <div className="flex items-center space-x-3 text-gray-200">
               <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 bg-opacity-20 text-teal-400">✓</span>
               <span>Real-time Team & Client Chat</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-200">
               <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 bg-opacity-20 text-teal-400">✓</span>
               <span>Advanced Task & Project Management</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-200">
               <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-500 bg-opacity-20 text-teal-400">✓</span>
               <span>Integrated Accounting & Invoicing</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center md:justify-start space-x-4">
             <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                <span className="text-sm font-medium text-gray-300">All systems operational</span>
             </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-100 relative z-10">
          <div className="mb-10 text-center">
            <h3 className="text-2xl font-bold text-gray-800">
              {view === 'login' ? 'Sign In' : view === 'forgot-password' ? 'Forgot Password' : 'Reset Password'}
            </h3>
            <p className="text-gray-500 mt-2 text-sm">
              {view === 'login' ? 'Enter your credentials to access the dashboard' : view === 'forgot-password' ? 'Enter your email to receive an OTP' : 'Enter the OTP and your new password'}
            </p>
          </div>

          {view === 'login' && (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="mt-1 relative">
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                    placeholder="admin@crm.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">Password</label>
                  <button type="button" onClick={() => { setView('forgot-password'); setError(''); setSuccessMsg(''); }} className="text-sm font-semibold text-primary hover:text-primary-dark focus:outline-none transition-colors">
                    Forgot Password?
                  </button>
                </div>
                <div className="mt-1 relative">
                  <input
                    id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm pr-10"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none">
                    <svg className={`h-5 w-5 ${showPassword ? 'text-primary' : 'text-gray-400 hover:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me" name="remember-me" type="checkbox"
                  checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 font-medium">
                  Remember me
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                   <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
                   <p className="text-sm text-green-700">{successMsg}</p>
                </div>
              )}

              <div className="pt-2 flex flex-col space-y-4">
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                     <span className="flex items-center">
                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       Signing in...
                     </span>
                  ) : 'Sign In Securely'}
                </button>
                
                <div className="text-center text-xs text-gray-500">
                  Having trouble logging in? <a href="mailto:admin@genzneuralx.com" className="text-primary hover:underline font-semibold">Contact Support</a>
                </div>
              </div>
            </form>
          )}

          {view === 'forgot-password' && (
            <form className="space-y-6" onSubmit={handleForgotPassword}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="mt-1 relative">
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                    placeholder="Enter your registered email"
                    disabled={loading}
                  />
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                   <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="pt-2 flex flex-col space-y-3">
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
                <button
                  type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {view === 'reset-password' && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">OTP</label>
                <div className="mt-1 relative">
                  <input
                    id="otp" name="otp" type="text" required
                    value={otp} onChange={(e) => setOtp(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                    placeholder="Enter 6-digit OTP"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="newPassword" name="newPassword" type={showNewPassword ? "text" : "password"} required
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm pr-12"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm leading-5 text-gray-400 hover:text-primary transition-colors focus:outline-none"
                  >
                    {showNewPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                   <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
                   <p className="text-sm text-green-700">{successMsg}</p>
                </div>
              )}

              <div className="pt-2 flex flex-col space-y-3">
                <button
                  type="submit" disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
                <button
                  type="button" onClick={() => { setView('login'); setError(''); setSuccessMsg(''); }} disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
