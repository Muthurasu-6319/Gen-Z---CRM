import React, { useState, useEffect } from 'react';
import { api, storeToken } from '../apiClient';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
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
    try {
      const data = await api.post<{ token: string; user: unknown }>('/api/auth/login', { email, password });
      storeToken(data.token);
      window.dispatchEvent(new Event('crm:login'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
            Welcome to <br className="hidden md:block" /> {companyName}
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed">
            {crmDetails}
          </p>
          
          <div className="mt-12 flex items-center justify-center md:justify-start space-x-4">
             <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-[#203a43] bg-gray-400"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#203a43] bg-gray-500"></div>
                <div className="w-10 h-10 rounded-full border-2 border-[#203a43] bg-gray-600"></div>
             </div>
             <p className="text-sm font-medium text-gray-400">Join our growing team</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl border border-gray-100 relative z-10">
          <div className="mb-10 text-center">
            <h3 className="text-2xl font-bold text-gray-800">Sign In</h3>
            <p className="text-gray-500 mt-2 text-sm">Enter your credentials to access the dashboard</p>
          </div>

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
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-sm leading-5 text-gray-400 hover:text-primary transition-colors focus:outline-none"
                >
                  {showPassword ? (
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

            <div className="pt-2">
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
