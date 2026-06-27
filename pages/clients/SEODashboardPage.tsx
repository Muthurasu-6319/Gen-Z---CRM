import React from 'react';

const SEODashboardPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Domain Authority</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">24</p>
                    <p className="text-xs text-green-500 mt-1">↑ +2 this month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Organic Traffic</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">1,250</p>
                    <p className="text-xs text-green-500 mt-1">↑ 15% vs last month</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Total Backlinks</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">342</p>
                    <p className="text-xs text-green-500 mt-1">↑ +12 new links</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500 uppercase tracking-wide">Ranked Keywords</p>
                    <p className="text-2xl font-bold text-gray-800 mt-2">45</p>
                    <p className="text-xs text-gray-400 mt-1">Top 10: 8 keywords</p>
                </div>
            </div>
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Top Performing Keywords</h3>
                    <button className="text-sm text-blue-600 hover:underline">View Full Report</button>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keyword</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">buy smart watches online</td>
                            <td className="px-6 py-4 text-sm text-green-600 font-bold">#3 (↑ 2)</td>
                            <td className="px-6 py-4 text-sm text-gray-500">2,400/mo</td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">best budget fitness tracker</td>
                            <td className="px-6 py-4 text-sm text-gray-800 font-bold">#8 ( - )</td>
                            <td className="px-6 py-4 text-sm text-gray-500">1,200/mo</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SEODashboardPage;
