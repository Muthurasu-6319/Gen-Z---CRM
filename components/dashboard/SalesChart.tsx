
import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

const salesData = [
  { name: 'Jan', sales: 4000, leads: 2400 },
  { name: 'Feb', sales: 3000, leads: 1398 },
  { name: 'Mar', sales: 5000, leads: 9800 },
  { name: 'Apr', sales: 4780, leads: 3908 },
  { name: 'May', sales: 5890, leads: 4800 },
  { name: 'Jun', sales: 4390, leads: 3800 },
];

const SalesChart: React.FC = () => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#4f46e5" />
                <Bar dataKey="leads" fill="#10b981" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default SalesChart;
