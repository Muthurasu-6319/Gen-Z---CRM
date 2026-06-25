// src/pages/DashboardPage.tsx

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { api } from '../apiClient';
import { UsersIcon, BriefcaseIcon, ClipboardListIcon, CubeIcon, ArrowUpIcon, ArrowDownIcon } from '../components/icons/Icons';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Notification } from '../types'; // Assuming you have this type

const SalesChart = lazy(() => import('../components/dashboard/SalesChart'));

interface DashboardPageProps {
  title: string;
}

// Stats oda initial structure
const initialStats = {
  leads_count: 0,
  projects_count: 0,
  tasks_count: 0,
  products_count: 0,
};

const DashboardPage: React.FC<DashboardPageProps> = ({ title }) => {
  const [stats, setStats] = useState(initialStats);
  const [activities, setActivities] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // v-- ITHU THAAN PUDHU DATA FETCHING LOGIC --v
  useEffect(() => {
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [leads, projects, tasks, products, notifications] = await Promise.all([
                api.get('/api/leads').catch(() => []),
                api.get('/api/projects').catch(() => []),
                api.get('/api/tasks').catch(() => []),
                api.get('/api/products').catch(() => []),
                api.get('/api/notifications').catch(() => [])
            ]);

            setStats({
                leads_count: leads.length,
                projects_count: projects.length,
                tasks_count: tasks.length,
                products_count: products.length
            });

            setActivities(notifications.slice(0, 5));
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchDashboardData();
  }, []);
  // ^-- LOGIC MUDINJATHU --^

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-6">{title}</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard name="New Leads" value={loading ? '...' : stats.leads_count.toString()} icon={UsersIcon} />
        <StatCard name="Active Projects" value={loading ? '...' : stats.projects_count.toString()} icon={BriefcaseIcon} />
        <StatCard name="Tasks Due" value={loading ? '...' : stats.tasks_count.toString()} icon={ClipboardListIcon} />
        <StatCard name="Total Products" value={loading ? '...' : stats.products_count.toString()} icon={CubeIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card-bg p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Sales & Leads Overview</h2>
          <ErrorBoundary fallback={<div className="h-[300px] w-full flex items-center justify-center text-red-500 font-semibold">Chart failed to load.</div>}>
            <Suspense fallback={<div className="h-[300px] w-full flex items-center justify-center text-text-secondary">Loading Chart...</div>}>
              <SalesChart />
            </Suspense>
          </ErrorBoundary>
        </div>

        <div className="bg-card-bg p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <ul className="space-y-4">
                {loading ? <p>Loading activities...</p> : 
                 activities.length === 0 ? <p>No recent activity.</p> :
                 activities.map(activity => (
                    <ActivityItem key={activity.id} message={activity.message} time={new Date(activity.created_at).toLocaleTimeString()} />
                 ))
                }
            </ul>
        </div>
      </div>
    </div>
  );
};

// StatCard component ah konjam maathrom (change illama)
const StatCard: React.FC<{ name: string; value: string; icon: React.FC<{className: string}> }> = ({ name, value, icon: Icon }) => {
    return (
        <div className="bg-card-bg p-6 rounded-lg shadow-md flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-text-secondary">{name}</p>
                <p className="text-3xl font-bold text-text-primary">{value}</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
                <Icon className="h-6 w-6 text-primary" />
            </div>
        </div>
    );
};

// ActivityItem component ah yum maathrom (dynamic message kku)
const ActivityItem: React.FC<{ message: string, time: string }> = ({ message, time }) => (
    <li className="flex items-start">
        <div className="bg-gray-200 rounded-full h-8 w-8 flex-shrink-0"></div>
        <div className="ml-3">
            <p className="text-sm text-gray-800">{message}</p>
            <p className="text-xs text-gray-500">{time}</p>
        </div>
    </li>
);

export default DashboardPage;