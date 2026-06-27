import React from 'react';

const AppDashboardPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
            <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-primary">
                <h3 className="text-xl font-bold text-gray-800">Mobile App Development - V1.0</h3>
                <p className="text-gray-500 mt-2">Current Phase: <span className="font-semibold text-blue-600">API Integration</span></p>
                
                <div className="mt-6">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Overall Progress</span>
                        <span className="font-bold">65%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Milestones</h3>
                    <ul className="space-y-4">
                        <li className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex justify-center items-center text-xs mr-3">✓</span>
                            <span className="text-gray-700 line-through">UI/UX Design Approved</span>
                        </li>
                        <li className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex justify-center items-center text-xs mr-3">✓</span>
                            <span className="text-gray-700 line-through">Database Schema Creation</span>
                        </li>
                        <li className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex justify-center items-center text-xs mr-3">O</span>
                            <span className="text-gray-800 font-semibold">API Integration</span>
                        </li>
                        <li className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex justify-center items-center text-xs mr-3"></span>
                            <span className="text-gray-500">Quality Assurance (Testing)</span>
                        </li>
                        <li className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex justify-center items-center text-xs mr-3"></span>
                            <span className="text-gray-500">Play Store & App Store Deployment</span>
                        </li>
                    </ul>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Latest Builds</h3>
                    <div className="border border-gray-200 p-4 rounded mb-3 flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="font-bold text-gray-800">Android APK (v0.6.5-beta)</p>
                            <p className="text-xs text-gray-500">Uploaded 2 days ago</p>
                        </div>
                        <button className="bg-primary text-white px-3 py-1 text-sm rounded hover:bg-primary-dark">Download</button>
                    </div>
                    <div className="border border-gray-200 p-4 rounded flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="font-bold text-gray-800">iOS TestFlight (v0.6.5-beta)</p>
                            <p className="text-xs text-gray-500">Pending Apple Review</p>
                        </div>
                        <button className="bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded cursor-not-allowed" disabled>Waiting...</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppDashboardPage;
