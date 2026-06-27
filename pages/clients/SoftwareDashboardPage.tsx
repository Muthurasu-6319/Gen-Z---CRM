import React from 'react';

const SoftwareDashboardPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
            <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-indigo-600">
                <h3 className="text-xl font-bold text-gray-800">Custom CRM / ERP Portal</h3>
                <p className="text-gray-500 mt-2">Server Status: <span className="font-semibold text-green-600">Online</span> | Version: 1.2.4</p>
                <div className="mt-4">
                    <a href="#" className="text-indigo-600 hover:underline font-medium">Access Live Portal &rarr;</a>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Resource Usage</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Storage (Database)</span>
                                <span>450 MB / 10 GB</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '4.5%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>File Storage (Attachments)</span>
                                <span>12 GB / 50 GB</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Request Feature / Patch</h3>
                    <textarea className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" rows={3} placeholder="Describe the new feature or bug you noticed..."></textarea>
                    <button className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded font-medium hover:bg-indigo-700 w-full">Submit Request</button>
                </div>
            </div>
        </div>
    );
};

export default SoftwareDashboardPage;
