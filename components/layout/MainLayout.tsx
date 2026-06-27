// src/components/layout/MainLayout.tsx

import React, { useState, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import DashboardPage from '../../pages/DashboardPage';
import PlaceholderPage from '../../pages/PlaceholderPage';
import TasksPage from '../../pages/TasksPage';
import LeadsPage from '../../pages/LeadsPage';
import CalendarPage from '../../pages/CalendarPage';
import FileManagerPage from '../../pages/FileManagerPage';
import ProductsPage from '../../pages/ProductsPage';
import UserManagementPage from '../../pages/UserManagementPage';
import ClientsPage from '../../pages/ClientsPage';
import TeamChatPage from '../../pages/TeamChatPage';
import AccessDeniedPage from '../../pages/AccessDeniedPage';
import { PermissionsProvider, usePermissions } from '../auth/PermissionsContext';
import { SettingsProvider } from '../auth/SettingsContext';
import MailboxPage from '../../pages/MailboxPage';
import MailTemplatePage from '../../pages/MailTemplatePage';
import AttendancePage from '../../pages/AttendancePage';
import MyAttendancePage from '../../pages/MyAttendancePage';
import ProjectsPage from '../../pages/ProjectsPage';
import StaffAttendanceDetailPage from '../../pages/StaffAttendanceDetailPage';
import ErrorBoundary from '../common/ErrorBoundary';
import AccountingPage from '../../pages/AccountingPage';
import InvoicesPage from '../../pages/InvoicesPage';
import SettingsPage from '../../pages/SettingsPage';
import QuotesPage from '../../pages/QuotesPage';
import LeaveManagementPage from '../../pages/LeaveManagementPage';
import MyLeaveRequestsPage from '../../pages/MyLeaveRequestsPage'; 
import ReportsPage from '../../pages/ReportsPage';
import StaffReportsAdminPage from '../../pages/StaffReportsAdminPage';
import MeetingsPage from '../../pages/MeetingsPage';
import ProjectDetailPage from '../../pages/ProjectDetailPage'; 
import WebDashboardPage from '../../pages/clients/WebDashboardPage';
import AppDashboardPage from '../../pages/clients/AppDashboardPage';
import MarketingDashboardPage from '../../pages/clients/MarketingDashboardPage';
import SEODashboardPage from '../../pages/clients/SEODashboardPage';
import SoftwareDashboardPage from '../../pages/clients/SoftwareDashboardPage';
import ClientReportsPage from '../../pages/ClientReportsPage';
import TicketsPage from '../../pages/TicketsPage';
const pages: { [key: string]: React.ComponentType<any> } = {
  dashboard: DashboardPage,
  mailbox: MailboxPage,
  'mailbox-inbox': (props: any) => <MailboxPage {...props} defaultTab="inbox" />,
  'mail-templates': MailTemplatePage,
  projects: ProjectsPage,
  tasks: TasksPage,
  'file-manager': FileManagerPage,
  calendar: CalendarPage,
  'meetings': MeetingsPage,
  accounting: AccountingPage,
  invoices: InvoicesPage,
   quotes: QuotesPage,
  leads: LeadsPage,
  products: ProductsPage,
  attendance: AttendancePage,
  'my-attendance': MyAttendancePage,
  'user-management': UserManagementPage,
  'clients': ClientsPage,
  'my-leave-requests': MyLeaveRequestsPage,
  'leave-management': LeaveManagementPage,
  'reports': ReportsPage,
  'staff-reports': StaffReportsAdminPage,
  'team-chat': TeamChatPage,
  'support-ticket': TicketsPage,
  settings: SettingsPage,
  'backup-database': PlaceholderPage,
  // v-- PUDHU CHANGE: Ippo ProjectDetailPage ah inga register panrom --v
  'project-detail': ProjectDetailPage,
  'web-dashboard': WebDashboardPage,
  'app-dashboard': AppDashboardPage,
  'marketing-dashboard': MarketingDashboardPage,
  'seo-dashboard': SEODashboardPage,
  'software-dashboard': SoftwareDashboardPage,
  'client-reports': ClientReportsPage,
};

const pageTitles: { [key: string]: string } = {
    dashboard: 'Dashboard',
    mailbox: 'Mail Box',
    'mailbox-inbox': 'Inbox',
    'mail-templates': 'Mail Templates',
    projects: 'Projects',
    'project-detail': 'Project Detail',
    tasks: 'Tasks',
    'file-manager': 'File Manager',
    calendar: 'Calendar',
     'meetings': 'Meetings',
    accounting: 'Accounting',
    invoices: 'Invoices',
    quotes: 'Quotes',
    leads: 'Leads',
    products: 'Products',
    attendance: 'Staff Attendance',
    'staff-attendance-detail': 'Staff Attendance Detail',
    'my-attendance': 'My Attendance',
    'user-management': 'User Management',
    'clients': 'Clients',
    'my-leave-requests': 'My Leave Requests',
    'leave-management': 'Leave Management (Admin)',
     'reports': 'My Daily Reports',
    'staff-reports': 'Staff Reports (Admin)',
    'team-chat': 'Team Chat',
    'support-ticket': 'Support Ticket',
    settings: 'Settings',
    'backup-database': 'Backup Database',
    'web-dashboard': 'Web Development Dashboard',
    'app-dashboard': 'App Development Dashboard',
    'marketing-dashboard': 'Digital Marketing Dashboard',
    'seo-dashboard': 'SEO Dashboard',
    'software-dashboard': 'Software Dashboard',
    'client-reports': 'Client Reports',
};

const ProtectedRoute: React.FC<{ pageId: string; element: React.ReactElement }> = ({ pageId, element }) => {
    const { hasPermission } = usePermissions();
    if (hasPermission(pageId, 'view')) return element;
    return <AccessDeniedPage />;
};

const LayoutContent: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [activePage, setActivePage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') || 'dashboard';
  });
  const { loading, hasPermission } = usePermissions();

  const handleSetActivePage = useCallback((page: string) => {
    setActivePage(page);
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    if (!page.startsWith('file-manager')) {
      url.searchParams.delete('folder');
    }
    window.history.pushState({}, '', url.toString());
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-background">Loading User Profile...</div>;
  }

  const renderCurrentPage = () => {
    let pageId = activePage;
    let pageProps: any = { title: pageTitles[activePage] || 'Dashboard' };

    if (activePage.startsWith('projects/')) {
        pageId = 'project-detail';
        pageProps.projectId = activePage.split('/')[1];
        pageProps.setActivePage = handleSetActivePage;
    } else if (activePage.startsWith('staff-attendance-detail/')) {
        pageId = 'staff-attendance-detail';
        pageProps.profileId = activePage.split('/')[1];
        pageProps.setActivePage = handleSetActivePage;
    }

    const canViewPage = hasPermission(pageId.split('/')[0], 'view'); // e.g., "projects" permission ah check pannu
    const CurrentPage = canViewPage ? (pages[pageId] || DashboardPage) : AccessDeniedPage;
    
    // Special props thevai padura pages
    if (pageId === 'attendance' || pageId === 'projects') {
        pageProps.setActivePage = handleSetActivePage;
    }

    return <CurrentPage {...pageProps} />;
  };

  return (
    <div className="flex h-screen bg-background text-text-primary relative overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0 flex ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <Sidebar isOpen={isSidebarOpen} activePage={activePage} setActivePage={(page) => {
          handleSetActivePage(page);
          if (window.innerWidth < 1024) setSidebarOpen(false); // Close sidebar on mobile after clicking
        }} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
            <ErrorBoundary fallback={
              <div className="flex flex-col items-center justify-center h-full text-center bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-red-600 mb-2">Oops! Something went wrong.</h1>
                <p className="text-text-secondary max-w-md" id="error-boundary-msg">This page encountered an error. Please try again later or contact support.</p>
              </div>
            }>
            {renderCurrentPage()}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  return (
    <PermissionsProvider>
      <SettingsProvider>
        <LayoutContent />
      </SettingsProvider>
    </PermissionsProvider>
  );
};

export default MainLayout;