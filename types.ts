

export interface PagePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface StaffPermissions extends PagePermissions {}

// in src/types.ts
// in src/types.ts

// ... other types ...

export interface AttendanceBreak {
  id: number;
  entry_id: number;
  break_start_time: string;
  break_end_time: string | null;
}

export interface AttendanceRecord {
  id: number;
  profile_id: string;
  check_in_time: string;
  check_out_time: string | null;
  date: string;
  status: 'Checked In' | 'On Break' | 'Checked Out';
  profiles?: {
    username: string;
  };
  attendance_breaks?: AttendanceBreak[]; // For Admin view
}

export interface Project {
   id: number;
   created_at: string;
   name: string;
   category: string | null;
   client_name?: string | null; // Made optional to align with ProjectDetail
   client_mobile?: string | null;
   total_cost?: number | null;
   project_asset?: string | null;
   start_date: string | null;
   end_date: string | null;
   status: 'Started' | 'In Progress' | 'On Hold' | 'Cancelled' | 'Completed';
   tags: string[] | null;
   description?: string | null;
   created_by: string;
   assigned_to: string[] | null;
   assigned_amounts?: Record<string, number> | null;
   assigned_by?: Record<string, string> | null;
   assigned_users?: User[];
   lead_generator_id?: string | null;
   lead_generator_incentive?: number | null;
 }

// in src/types.ts

// ... other types ...

export interface Task {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  assignee_id: string | null; // Changed from 'assignee'
  start_date: string | null;
  due_date: string | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Completed';
}

// in src/types.ts

// ... other types ...

  export interface Notification {
      id: number;
      created_at: string;
      recipient_profile_id: string;
      message: string;
      related_item_type: string | null;
      related_item_id: string | null;
      is_read: boolean;
    }
  






// src/types.ts

// ... (keep your other types like User, Project, Task, etc.)

export interface Quote {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  document_url: string | null;
  created_by: string;
  client_id?: string | null;
 }

// Added missing type definitions
export interface AccountingTransaction {
  id: number;
  type: 'Income' | 'Expense' | 'Salary';
  transaction_date: string;
  related_profile_id?: string;
  category?: string;
  payment_mode?: string;
  amount: number;
  description?: string;
  profile?: User;
}

export interface InvoiceWithRelations {
  id: number;
  invoice_number: string;
  issue_date: string;
  total_amount: number;
  paid_amount: number;
  payment_method?: string;
  status: string;
  due_date?: string;
  notes?: string;
  client_name_override?: string;
  profiles?: {
    id?: string;
    username: string;
    address?: string;
    mobile?: string;
  };
  // other fields as needed
}

export type Invoice = InvoiceWithRelations;

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

// You should already have these types, just make sure they are here.
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  role: 'Admin' | 'Staff' | 'Client' | string;
  mobile?: string;
  gpay?: string;
  bankDetails?: string;
  bank_details?: string;
  bloodGroup?: string;
  blood_group?: string;
  permissions?: StaffPermissions;
  address?: string;
  designation?: string;
  total_paid?: number;
  total_pending?: number;
  services?: string[];
  profile_picture?: string;
 }



export type PageId = 'dashboard' | 'projects' | 'tasks' | 'file-manager' | 'calendar' | 'meetings' | 'accounting' | 'invoices' | 'quotes' | 'leads' | 'products' | 'attendance' | 'user-management' | 'leave-management' | 'reports' | 'client-reports' | 'team-chat' | 'support-ticket' | 'settings' | 'backup-database' | 'mailbox' | 'mailbox-inbox' | 'mail-templates' | 'my-attendance' | 'user-notes' | 'staff-attendance-detail' | 'web-dashboard' | 'app-dashboard' | 'marketing-dashboard' | 'seo-dashboard' | 'software-dashboard';

export interface LineItem {
    id?: number;
    invoice_id?: number;
    description: string;
    quantity: number;
    price: number;
}

// ... (and any other types you have)

// src/types.ts

// ... (keep all your other types like User, Quote, etc.)

export interface Lead {
  id: number;
  client_name: string;
  requirements: string | null;
  mobile_no: string | null;
  notes: string | null;
  location?: string | null;
  assigned_to?: string | null;
  created_at: string;
  created_by: string;
}

// src/types.ts

// ... (keep all your other types like User, Quote, Lead, etc.)

export interface Product {
  id: number;
  name: string;
  category: string | null;
  tags: string[] | null;
  end_date: string | null;
  collaborators: string[] | null; // Array of profile IDs (UUIDs)
  notes: string | null;
  status: 'Started' | 'In Progress' | 'On Hold' | 'Cancelled' | 'Completed';
  created_at: string;
  created_by: string;
}

// In src/types.ts
export interface Leave {
  id: number;
  created_at: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
}

// In src/types.ts
export interface DailyReport {
  id: number;
  created_at: string;
  profile_id: string; // UUID
  report_date: string;
  tasks_completed: string;
  hours_spent?: number;
}

// In src/types.ts
export interface Meeting {
  id: number;
  created_at: string;
  created_by: string; // profile UUID
  title: string;
  start_time: string;
  end_time: string;
  google_meet_link?: string;
  assigned_to?: string[]; // array of profile UUIDs
}

// In src/types.ts
export interface ClientReport {
  id: string;
  created_at: string;
  client_id: string; // profile UUID
  title: string;
  category: 'SEO' | 'Digital Marketing' | 'Website' | 'Other';
  file_url: string;
  file_name: string;
  notes?: string;
  created_by: string;
}