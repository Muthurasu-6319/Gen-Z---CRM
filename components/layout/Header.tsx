// src/components/layout/Header.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, clearToken } from '../../apiClient';
import { 
    MenuIcon, ClockIcon, UserCircleIcon, BellIcon, 
    CalculatorIcon, LogoutIcon, PlayIcon, PauseIcon
} from '../icons/Icons';
import { usePermissions } from '../auth/PermissionsContext';
import { Notification } from '../../types';
import CalculatorModal from '../common/CalculatorModal';

interface HeaderProps { onToggleSidebar: () => void; }

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentProfile } = usePermissions();
  const [status, setStatus] = useState<'Checked Out' | 'Checked In' | 'On Break'>('Checked Out');
  const [entryId, setEntryId] = useState<number | null>(null);
  const [breakId, setBreakId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const checkInitialStatus = useCallback(async () => {
    if (!currentProfile) return;
    try {
      const records = await api.get<any[]>('/api/attendance');
      const today = new Date().toISOString().slice(0, 10);
      const todayEntry = records.find((r: any) => r.profile_id === currentProfile.id && r.date === today);
      if (todayEntry) {
        setStatus(todayEntry.status);
        setEntryId(todayEntry.id);
        const ongoingBreak = (todayEntry.attendance_breaks || []).find((b: any) => !b.break_end_time);
        if (ongoingBreak) setBreakId(ongoingBreak.id);
      } else {
        setStatus('Checked Out'); setEntryId(null); setBreakId(null);
      }
    } catch {}
  }, [currentProfile]);

  useEffect(() => { checkInitialStatus(); }, [checkInitialStatus]);

  const handleClockAction = async () => {
    if (!currentProfile) return;
    try {
      if (status === 'Checked Out') {
        const data = await api.post<any>('/api/attendance/checkin', {});
        setStatus('Checked In'); setEntryId(data.id);
      } else if (status === 'Checked In') {
        const reason = window.prompt("Please provide a reason for pausing your shift:");
        if (!reason) return; // Cancel if no reason provided
        const data = await api.post<any>(`/api/attendance/break/start/${entryId}`, { reason });
        setStatus('On Break'); setBreakId(data.id);
      } else if (status === 'On Break') {
        await api.post(`/api/attendance/break/end/${breakId}`, {});
        setStatus('Checked In'); setBreakId(null);
      }
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleFinalCheckOut = async () => {
    if (status === 'On Break') return alert('Please resume before checking out.');
    if (!entryId) return;
    try {
      await api.post(`/api/attendance/checkout/${entryId}`, {});
      setStatus('Checked Out'); setEntryId(null);
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const fetchNotifications = useCallback(async () => {
    if (!currentProfile) return;
    try {
      const data = await api.get<Notification[]>('/api/notifications');
      setNotifications(data);
    } catch {}
  }, [currentProfile]);

  useEffect(() => {
    if (currentProfile) fetchNotifications();
  }, [currentProfile, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) setNotificationOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async () => {
    setProfileOpen(false);
    setNotificationOpen(prev => !prev);
    if (!isNotificationOpen && notifications.some(n => !n.is_read)) {
      try {
        await api.put('/api/notifications/read-all', {});
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch {}
    }
  };

  const handleLogout = () => {
    clearToken();
    window.dispatchEvent(new Event('crm:logout'));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderClockButton = () => {
    switch (status) {
      case 'Checked In': return (
        <button onClick={handleClockAction} className="hidden sm:inline-flex items-center bg-yellow-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-600 transition-colors">
          <PauseIcon className="h-5 w-5 mr-2"/> Pause
        </button>);
      case 'On Break': return (
        <button onClick={handleClockAction} className="hidden sm:inline-flex items-center bg-blue-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors">
          <PlayIcon className="h-5 w-5 mr-2"/> Resume
        </button>);
      default: return (
        <button onClick={handleClockAction} className="hidden sm:inline-flex items-center bg-secondary text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 transition-colors">
          <ClockIcon className="h-5 w-5 mr-2"/> Check In
        </button>);
    }
  };

  return (
    <>
      <header className="bg-header-bg shadow-sm z-20 relative">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={onToggleSidebar} className="p-2 text-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"><MenuIcon className="h-6 w-6" /></button>
              <h1 className="ml-4 text-xl font-semibold text-text-primary hidden sm:block">CRM Pro</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {status !== 'Checked Out' && (
                <button onClick={handleFinalCheckOut} className="hidden sm:inline-flex items-center bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600">
                  <LogoutIcon className="h-5 w-5 mr-2"/> Check Out
                </button>
              )}
              {renderClockButton()}
              <HeaderIconButton aria-label="Calculator" onClick={() => setCalculatorOpen(true)}><CalculatorIcon className="h-6 w-6" /></HeaderIconButton>
              <div className="relative" ref={notificationRef}>
                <HeaderIconButton aria-label="Notifications" onClick={handleNotificationClick}>
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">{unreadCount}</span>}
                </HeaderIconButton>
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-30">
                    <div className="py-2 px-4 font-bold border-b text-text-primary">Notifications</div>
                    <ul className="divide-y max-h-96 overflow-y-auto">
                      {notifications.length === 0
                        ? <li className="p-4 text-center text-sm text-gray-500">No notifications yet.</li>
                        : notifications.map(n => (
                          <li key={n.id} className={`p-4 hover:bg-gray-50 ${!n.is_read ? 'bg-indigo-50' : ''}`}>
                            <p className="text-sm text-gray-700">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="relative" ref={profileRef}>
                <HeaderIconButton aria-label="User Profile" onClick={() => { setNotificationOpen(false); setProfileOpen(prev => !prev); }}><UserCircleIcon className="h-6 w-6" /></HeaderIconButton>
                {isProfileOpen && currentProfile && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg overflow-hidden z-30">
                    <div className="p-4 border-b">
                      <p className="font-bold text-text-primary">{currentProfile.username}</p>
                      <p className="text-sm text-text-secondary">{currentProfile.email}</p>
                    </div>
                    <div className="p-4 text-sm text-text-secondary">Role: <span className="font-semibold text-text-primary">{currentProfile.role}</span></div>
                  </div>
                )}
              </div>
              <HeaderIconButton aria-label="Logout" onClick={handleLogout}><LogoutIcon className="h-6 w-6" /></HeaderIconButton>
            </div>
          </div>
        </div>
      </header>
      <CalculatorModal isOpen={isCalculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </>
  );
};

const HeaderIconButton: React.FC<{ children: React.ReactNode; 'aria-label': string; onClick?: () => void }> = ({ children, 'aria-label': ariaLabel, onClick }) => (
  <button onClick={onClick} className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" aria-label={ariaLabel}>{children}</button>
);

export default Header;