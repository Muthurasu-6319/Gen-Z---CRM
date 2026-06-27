import React from 'react';

const MarketingDashboardPage: React.FC<{ title: string }> = ({ title }) => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow text-white">
                    <p className="text-sm uppercase tracking-wide opacity-80">Total Ad Spend</p>
                    <p className="text-3xl font-bold mt-2">₹12,450</p>
                    <p className="text-xs mt-2 opacity-90">This Month (June)</p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow text-white">
                    <p className="text-sm uppercase tracking-wide opacity-80">Total Leads Generated</p>
                    <p className="text-3xl font-bold mt-2">142</p>
                    <p className="text-xs mt-2 opacity-90">Cost Per Lead: ₹87.6</p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg shadow text-white">
                    <p className="text-sm uppercase tracking-wide opacity-80">Conversion Rate</p>
                    <p className="text-3xl font-bold mt-2">4.8%</p>
                    <p className="text-xs mt-2 opacity-90">Industry Avg: 2.5%</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Active Campaigns</h3>
                <div className="space-y-4">
                    <div className="border border-gray-200 rounded p-4 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-800">Summer Sale Offer (FB/Insta)</h4>
                            <p className="text-sm text-gray-500">Status: Running | Budget: ₹500/day</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-green-600">85 Leads</p>
                            <p className="text-xs text-gray-400">₹4,200 Spent</p>
                        </div>
                    </div>
                    <div className="border border-gray-200 rounded p-4 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-800">Search Ads - Local Area</h4>
                            <p className="text-sm text-gray-500">Status: Running | Budget: ₹300/day</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-green-600">57 Leads</p>
                            <p className="text-xs text-gray-400">₹8,250 Spent</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketingDashboardPage;
