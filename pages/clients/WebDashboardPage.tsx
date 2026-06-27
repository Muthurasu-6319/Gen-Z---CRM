import React from 'react';

const WebDashboardPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-500">
                    <h3 className="text-lg font-semibold text-gray-700">Domain Status</h3>
                    <p className="text-sm text-gray-500 mt-2">genzcrm.com</p>
                    <p className="text-xl font-bold text-green-600 mt-1">Active</p>
                    <p className="text-xs text-gray-400 mt-2">Expires in: 312 Days</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-t-4 border-purple-500">
                    <h3 className="text-lg font-semibold text-gray-700">Hosting Server</h3>
                    <p className="text-sm text-gray-500 mt-2">AWS EC2 Instance (t3.micro)</p>
                    <p className="text-xl font-bold text-green-600 mt-1">99.9% Uptime</p>
                    <p className="text-xs text-gray-400 mt-2">Next Billing: Aug 15, 2026</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-t-4 border-orange-500">
                    <h3 className="text-lg font-semibold text-gray-700">Support Tickets</h3>
                    <p className="text-sm text-gray-500 mt-2">Open Issues</p>
                    <p className="text-xl font-bold text-orange-600 mt-1">0</p>
                    <button className="mt-3 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200">Raise Ticket</button>
                </div>
            </div>
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Maintenance Logs</h3>
                <ul className="space-y-3">
                    <li className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Updated SSL Certificate</span>
                        <span className="text-gray-400">June 20, 2026</span>
                    </li>
                    <li className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Weekly Database Backup</span>
                        <span className="text-gray-400">June 25, 2026</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default WebDashboardPage;
