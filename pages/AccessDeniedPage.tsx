import React from 'react';

const AccessDeniedPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-white p-8 rounded-lg shadow-md">
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Access Denied</h1>
      <p className="text-text-secondary max-w-md">
        You do not have the necessary permissions to view this page. Please contact your administrator if you believe this is an error.
      </p>
    </div>
  );
};

export default AccessDeniedPage;
