// src/components/layout/Sidebar.tsx

import React, { useState, useMemo } from 'react';
import * as Icons from '../icons/Icons';
import { usePermissions } from '../auth/PermissionsContext';

interface SidebarProps {
  isOpen: boolean;
  activePage: string;
  setActivePage: (page: string) => void;
}

export const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.DashboardIcon, roles: ['Admin', 'Staff'] },
  { id: 'mailbox', label: 'Mail Box', icon: Icons.MailIcon, roles: ['Admin', 'Staff'] },
  { id: 'projects', label: 'Projects', icon: Icons.BriefcaseIcon, roles: ['Admin', 'Staff'] },
  { id: 'tasks', label: 'Tasks', icon: Icons.ClipboardListIcon, roles: ['Admin', 'Staff'] },
  { id: 'file-manager', label: 'File Manager', icon: Icons.FolderIcon, roles: ['Admin', 'Staff'] },
  { id: 'calendar', label: 'Calendar', icon: Icons.CalendarIcon, roles: ['Admin', 'Staff'] },
  { id: 'meetings', label: 'Meetings', icon: Icons.UsersIcon, roles: ['Admin', 'Staff'] }, 
  { id: 'accounting', label: 'Accounting', icon: Icons.CalculatorIcon, roles: ['Admin', 'Staff'] }, 
  { id: 'invoices', label: 'Invoices', icon: Icons.DocumentTextIcon, roles: ['Admin', 'Staff'] },
  { id: 'quotes', label: 'Quotes', icon: Icons.DocumentDuplicateIcon, roles: ['Admin', 'Staff'] },
  { id: 'leads', label: 'Leads', icon: Icons.UserGroupIcon, roles: ['Admin', 'Staff'] }, 
  { id: 'products', label: 'Products', icon: Icons.CubeIcon, roles: ['Admin', 'Staff'] },
  { id: 'attendance', label: 'Staff Attendance', icon: Icons.ClockIcon, roles: ['Admin'] },
  { id: 'my-attendance', label: 'My Attendance', icon: Icons.UserCircleIcon, roles: ['Staff'] },
  { id: 'user-management', label: 'User Management', icon: Icons.UserGroupIcon, roles: ['Admin'] },
  { id: 'my-leave-requests', label: 'My Leave Requests', icon: Icons.CalendarDaysIcon, roles: ['Staff'] },
  { id: 'leave-management', label: 'Leave Management', icon: Icons.CalendarDaysIcon, roles: ['Admin'] },
  { id: 'reports', label: 'My Reports', icon: Icons.ChartBarIcon, roles: ['Staff'] },
  { id: 'staff-reports', label: 'Staff Reports', icon: Icons.ChartBarIcon, roles: ['Admin'] }, 
  { id: 'team-chat', label: 'Team Chat', icon: Icons.ChatIcon, roles: ['Admin', 'Staff'] }, 
  { id: 'support-ticket', label: 'Support Ticket', icon: Icons.SupportIcon, roles: ['Admin', 'Staff'] },
  { id: 'settings', label: 'Settings', icon: Icons.CogIcon, roles: ['Admin'] },
  { id: 'backup-database', label: 'Backup Database', icon: Icons.DatabaseIcon, roles: ['Admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, activePage, setActivePage }) => {
  const { hasPermission, currentProfile } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');

  const visibleItems = useMemo(() => {
    if (!currentProfile) return [];

    return sidebarItems.filter(item => {
      // 1. Role check
      const roleIsAllowed = item.roles.includes(currentProfile.role);
      if (!roleIsAllowed) return false;

      // 2. Permission check
      const hasViewPermission = hasPermission(item.id, 'view');
      if (!hasViewPermission) return false;
      
      // 3. Search check
      if (searchTerm.trim() !== '' && !item.label.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
      }
      
      return true;
    });
  }, [currentProfile, hasPermission, searchTerm]);

  return (
    <aside
      // Main aside-la `overflow-y-auto` irukku.
      className={`bg-sidebar-bg text-sidebar-text flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-64' : 'w-20'
      } overflow-y-auto`}
    >
      <div className="flex items-center justify-center h-16 shadow-md bg-gray-900 flex-shrink-0">
        <Icons.LogoIcon className={`h-8 w-auto text-white transition-all duration-300 ${isOpen ? '' : 'h-10'}`} />
        <h1 className={`text-white text-2xl font-bold ml-2 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
          GENZ_TEAM
        </h1>
      </div>
      
      {/* Profile Section */}
      <div className={`p-4 text-center border-b border-gray-700 flex-shrink-0 ${!isOpen ? 'hidden' : ''}`}>
          <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto">
                  <Icons.UserCircleIcon className="w-16 h-16 text-gray-500"/>
              </div>
              <span className="absolute bottom-1 right-1 block h-4 w-4 rounded-full bg-green-500 border-2 border-sidebar-bg"></span>
          </div>
          <h2 className="mt-2 font-semibold text-white">{currentProfile?.username || 'User'}</h2>
          <p className="text-sm text-gray-400">{currentProfile?.designation || currentProfile?.role || 'Member'}</p>
      </div>

      {/* Search Box */}
      <div className={`p-4 flex-shrink-0 ${!isOpen ? 'hidden' : ''}`}>
          <input 
            type="text"
            placeholder="Search in menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-white placeholder-gray-400 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
      </div>

      {/* Nav items. Inga irundha `overflow-y-auto` remove pannitta single scroll mattum irukkum. */}
      <div className="flex-grow">
        <nav className="mt-2 px-2">
          {visibleItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={activePage.startsWith(item.id)}
              onClick={() => setActivePage(item.id)}
              isSidebarOpen={isOpen}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
};

// SidebarItem component la entha maathuramum illa
interface SidebarItemProps {
  item: { id: string; label: string; icon: React.FC<{className: string}> };
  isActive: boolean;
  onClick: () => void;
  isSidebarOpen: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, onClick, isSidebarOpen }) => {
  const Icon = item.icon;
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`flex items-center p-2 my-1 rounded-md transition-colors duration-200 group ${
        isActive
          ? 'bg-sidebar-active text-white'
          : 'hover:bg-gray-700 hover:text-white'
      } ${!isSidebarOpen ? 'justify-center' : ''}`}
      title={isSidebarOpen ? '' : item.label}
    >
      <Icon className="h-6 w-6 flex-shrink-0" />
      <span
        className={`ml-4 transition-opacity duration-200 ease-in-out ${
          isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
        }`}
      >
        {item.label}
      </span>
    </a>
  );
};

export default Sidebar;