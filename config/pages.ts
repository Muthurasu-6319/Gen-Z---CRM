// src/config/pages.ts
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for all pages in the CRM.
//
// 🚀 புது page add பண்ணும்போது:
//   1. inga oru object add pannu
//   2. MainLayout.tsx-la page component register pannu
//   3. Sidebar.tsx-la (if needed) menu item add pannu
//   4. Automatically permission editor-la varum!
// ─────────────────────────────────────────────────────────────────────────────

export interface PageConfig {
  id: string;
  label: string;
  group?: string;          // grouping header in permissions UI
  staffVisible?: boolean;  // false = Admin-only, don't show in permissions editor
}

export const ALL_PAGES: PageConfig[] = [
  // ── Dashboard ───────────────────────────────────────────────────────────
  { id: 'dashboard',        label: 'Dashboard',              group: 'General' },

  // ── Mail Box ────────────────────────────────────────────────────────────
  { id: 'mailbox',          label: 'Mail Box → Compose',     group: 'Mail' },
  { id: 'mailbox-inbox',    label: 'Mail Box → Inbox',       group: 'Mail' },
  { id: 'mail-templates',   label: 'Mail Box → Templates',   group: 'Mail' },

  // ── Projects & Tasks ─────────────────────────────────────────────────────
  { id: 'projects',         label: 'Projects',               group: 'Work' },
  { id: 'tasks',            label: 'Tasks',                  group: 'Work' },
  { id: 'meetings',         label: 'Meetings',               group: 'Work' },
  { id: 'calendar',         label: 'Calendar',               group: 'Work' },

  // ── Files ───────────────────────────────────────────────────────────────
  { id: 'file-manager',     label: 'File Manager',           group: 'Files' },

  // ── Finance ─────────────────────────────────────────────────────────────
  { id: 'accounting',       label: 'Accounting',             group: 'Finance' },
  { id: 'invoices',         label: 'Invoices',               group: 'Finance' },
  { id: 'quotes',           label: 'Quotes',                 group: 'Finance' },

  // ── CRM ─────────────────────────────────────────────────────────────────
  { id: 'leads',            label: 'Leads',                  group: 'CRM' },
  { id: 'products',         label: 'Products',               group: 'CRM' },

  // ── HR ──────────────────────────────────────────────────────────────────
  { id: 'my-attendance',    label: 'My Attendance',          group: 'HR' },
  { id: 'my-leave-requests',label: 'My Leave Requests',      group: 'HR' },
  { id: 'reports',          label: 'My Daily Reports',       group: 'HR' },

  // ── Team ────────────────────────────────────────────────────────────────
  { id: 'team-chat',        label: 'Team Chat',              group: 'Team' },
  { id: 'support-ticket',   label: 'Support Ticket',         group: 'Team' },

  // ── Admin-only (staffVisible: false = hidden from Staff permissions) ────
  { id: 'attendance',       label: 'Staff Attendance',       group: 'Admin', staffVisible: false },
  { id: 'user-management',  label: 'User Management',        group: 'Admin', staffVisible: false },
  { id: 'leave-management', label: 'Leave Management',       group: 'Admin', staffVisible: false },
  { id: 'staff-reports',    label: 'Staff Reports',          group: 'Admin', staffVisible: false },
  { id: 'settings',         label: 'Settings',               group: 'Admin', staffVisible: false },
  { id: 'backup-database',  label: 'Backup Database',        group: 'Admin', staffVisible: false },
];

// Pages shown in Staff permissions editor (excludes Admin-only pages)
export const STAFF_PERMISSION_PAGES = ALL_PAGES.filter(p => p.staffVisible !== false);

// Child → Parent mapping for permission fallthrough
// e.g. if 'mailbox' is allowed, then 'mailbox-inbox' and 'mail-templates' are too
export const PERMISSION_PARENT_MAP: Record<string, string> = {
  'mailbox-inbox':  'mailbox',
  'mail-templates': 'mailbox',
};
