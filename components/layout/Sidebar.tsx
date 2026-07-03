// src/components/layout/Sidebar.tsx

import React, { useState, useMemo } from 'react';
import * as Icons from '../icons/Icons';
import { usePermissions } from '../auth/PermissionsContext';

interface SidebarProps {
  isOpen: boolean;
  activePage: string;
  setActivePage: (page: string) => void;
}

// Items with optional submenu
export interface SidebarItem {
  id: string;
  label: string;
  icon: React.FC<{className: string}>;
  roles: string[];
  children?: { id: string; label: string; icon: React.FC<{className: string}>; }[];
}

export const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.DashboardIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'web-dashboard', label: 'Web Dev Portal', icon: Icons.GlobeAltIcon, roles: ['Client'] },
  { id: 'app-dashboard', label: 'App Dev Portal', icon: Icons.DeviceMobileIcon, roles: ['Client'] },
  { id: 'marketing-dashboard', label: 'Marketing Portal', icon: Icons.SpeakerphoneIcon, roles: ['Client'] },
  { id: 'seo-dashboard', label: 'SEO Portal', icon: Icons.SearchIcon, roles: ['Client'] },
  { id: 'software-dashboard', label: 'Software Portal', icon: Icons.CodeIcon, roles: ['Client'] },
  {
    id: 'mailbox',
    label: 'Mail Box',
    icon: Icons.MailIcon,
    roles: ['Admin', 'Staff', 'Client'],
    children: [
      { id: 'mailbox', label: 'Compose Mail', icon: Icons.PaperAirplaneIcon },
      { id: 'mailbox-inbox', label: 'Inbox', icon: Icons.MailIcon },
      { id: 'mail-templates', label: 'Mail Templates', icon: Icons.TemplateIcon },
    ],
  },
  { id: 'projects', label: 'Projects', icon: Icons.BriefcaseIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'tasks', label: 'Tasks', icon: Icons.ClipboardListIcon, roles: ['Admin', 'Staff'] },
  { id: 'file-manager', label: 'File Manager', icon: Icons.FolderIcon, roles: ['Admin', 'Staff'] },
  { id: 'calendar', label: 'Calendar', icon: Icons.CalendarIcon, roles: ['Admin', 'Staff'] },
  { id: 'meetings', label: 'Meetings', icon: Icons.UsersIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'accounting', label: 'Accounting', icon: Icons.CalculatorIcon, roles: ['Admin', 'Staff'] },
  { id: 'invoices', label: 'Invoices', icon: Icons.DocumentTextIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'quotes', label: 'Quotes', icon: Icons.DocumentDuplicateIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'leads', label: 'Leads', icon: Icons.UserGroupIcon, roles: ['Admin', 'Staff'] },
  { id: 'products', label: 'Products', icon: Icons.CubeIcon, roles: ['Admin', 'Staff'] },
  { id: 'attendance', label: 'Staff Attendance', icon: Icons.ClockIcon, roles: ['Admin'] },
  { id: 'my-attendance', label: 'My Attendance', icon: Icons.UserCircleIcon, roles: ['Staff'] },
  { id: 'user-notes', label: 'User Notes', icon: Icons.DocumentTextIcon, roles: ['Admin', 'Staff'] },
  { id: 'user-management', label: 'User Management', icon: Icons.UserGroupIcon, roles: ['Admin'] },
  { id: 'my-leave-requests', label: 'My Leave Requests', icon: Icons.CalendarDaysIcon, roles: ['Staff'] },
  { id: 'leave-management', label: 'Leave Management', icon: Icons.CalendarDaysIcon, roles: ['Admin'] },
  { id: 'reports', label: 'My Reports', icon: Icons.ChartBarIcon, roles: ['Staff'] },
  { id: 'staff-reports', label: 'Staff Reports', icon: Icons.ChartBarIcon, roles: ['Admin'] },
  { id: 'client-reports', label: 'Client Reports', icon: Icons.DocumentTextIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'team-chat', label: 'Team Chat', icon: Icons.ChatIcon, roles: ['Admin', 'Staff'] },
  { id: 'support-ticket', label: 'Support Ticket', icon: Icons.SupportIcon, roles: ['Admin', 'Staff', 'Client'] },
  { id: 'settings', label: 'Settings', icon: Icons.CogIcon, roles: ['Admin'] },
  { id: 'backup-database', label: 'Backup Database', icon: Icons.DatabaseIcon, roles: ['Admin'] },
];


const Sidebar: React.FC<SidebarProps> = ({ isOpen, activePage, setActivePage }) => {
  const { hasPermission, currentProfile } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  // Track which parent menus are expanded
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['mailbox']);

  const toggleExpand = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const visibleItems = useMemo(() => {
    if (!currentProfile) return [];
    return sidebarItems.filter(item => {
      const roleIsAllowed = item.roles.includes(currentProfile.role);
      if (!roleIsAllowed) return false;

      // Check if it's a client-specific service dashboard
      if (currentProfile.role === 'Client') {
         const services = currentProfile.services || [];
         if (item.id === 'web-dashboard' && !services.includes('Web Development')) return false;
         if (item.id === 'app-dashboard' && !services.includes('App Development')) return false;
         if (item.id === 'marketing-dashboard' && !services.includes('Digital Marketing')) return false;
         if (item.id === 'seo-dashboard' && !services.includes('SEO')) return false;
         if (item.id === 'software-dashboard' && !services.includes('Custom Software')) return false;
      }

      const hasViewPermission = hasPermission(item.id, 'view');
      if (!hasViewPermission && currentProfile.role !== 'Client') return false; 
      if (searchTerm.trim() !== '' && !item.label.toLowerCase().includes(searchTerm.toLowerCase())) {
        // Also check children
        const childMatch = item.children?.some(c => c.label.toLowerCase().includes(searchTerm.toLowerCase()));
        if (!childMatch) return false;
      }
      return true;
    });
  }, [currentProfile, hasPermission, searchTerm]);

  return (
    <aside
      className={`bg-sidebar-bg text-sidebar-text flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out h-full ${
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

      {/* Nav items */}
      <div className="flex-grow">
        <nav className="mt-2 px-2">
          {visibleItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.includes(item.id);
            const isParentActive = activePage === item.id || item.children?.some(c => c.id === activePage);

            return (
              <div key={item.id}>
                {/* Parent item */}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (hasChildren && isOpen) {
                      toggleExpand(item.id);
                    } else {
                      setActivePage(item.id);
                    }
                  }}
                  className={`flex items-center p-2 my-1 rounded-md transition-colors duration-200 group ${
                    isParentActive
                      ? 'bg-sidebar-active text-white'
                      : 'hover:bg-gray-700 hover:text-white'
                  } ${!isOpen ? 'justify-center' : ''}`}
                  title={isOpen ? '' : item.label}
                >
                  <item.icon className="h-6 w-6 flex-shrink-0" />
                  <span className={`ml-4 flex-1 transition-opacity duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
                    {item.label}
                  </span>
                  {/* Expand/collapse chevron */}
                  {hasChildren && isOpen && (
                    isExpanded
                      ? <Icons.ChevronDownIcon className="h-4 w-4 text-gray-400" />
                      : <Icons.ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </a>

                {/* Submenu children */}
                {hasChildren && isOpen && isExpanded && (
                  <div style={{ paddingLeft: 12, marginBottom: 4 }}>
                    {item.children!.map(child => (
                      <a
                        key={child.id}
                        href="#"
                        onClick={(e) => { e.preventDefault(); setActivePage(child.id); }}
                        className={`flex items-center p-2 my-1 rounded-md transition-colors duration-200 group text-sm ${
                          activePage === child.id
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-gray-700 hover:text-white text-gray-300'
                        }`}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="ml-3">{child.label}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;