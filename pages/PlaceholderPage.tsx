
import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-white p-8 rounded-lg shadow-md">
      <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
      </div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
      <p className="text-text-secondary max-w-md">
        The content and functionality for the "{title}" page are currently under development. Please check back later for updates.
      </p>
    </div>
  );
};

export default PlaceholderPage;
