// src/pages/DashboardPage.tsx

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { api, getStoredToken, API_BASE } from '../apiClient';
import { io, Socket } from 'socket.io-client';
import { usePermissions } from '../components/auth/PermissionsContext';
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
  const { currentProfile } = usePermissions();
  const isAdmin = currentProfile?.role === 'Admin';
  const [stats, setStats] = useState(initialStats);
  const [activities, setActivities] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      const token = getStoredToken();
      const socket = io(API_BASE, { auth: { token } });
      
      socket.on('presence_update', (users: any[]) => {
        // Filter out unique users by ID in case of multiple tabs
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());
        setOnlineUsers(uniqueUsers);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isAdmin]);

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
        
        {isAdmin && (
          <div className="bg-card-bg p-6 rounded-lg shadow-md lg:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Online Users</h2>
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
                  <span className="text-sm font-bold text-green-600">{onlineUsers.length} Active</span>
                </div>
              </div>
              <ul className="space-y-4">
                  {onlineUsers.length === 0 ? <p className="text-sm text-gray-500">No users currently online.</p> :
                   onlineUsers.map((user, idx) => (
                      <li key={idx} className="flex items-center p-2 rounded hover:bg-gray-50 transition-colors">
                          <div className="bg-green-100 text-green-700 rounded-full h-8 w-8 flex items-center justify-center font-bold text-sm mr-3 uppercase">
                              {user.username.charAt(0)}
                          </div>
                          <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                              <p className="text-xs text-green-600">Online</p>
                          </div>
                      </li>
                   ))
                  }
              </ul>
          </div>
        )}
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