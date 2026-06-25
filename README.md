# Advanced CRM Dashboard

![React](https://img.shields.io/badge/React-18.3-%2361DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6.2-%23646CFF?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-2.43-%233ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-%233178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-%2306B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A comprehensive, full-stack CRM dashboard built with React, Vite, Supabase, and Tailwind CSS. This application is designed to be a powerful internal tool for managing clients, projects, tasks, finances, and team collaboration in real-time.

![Dashboard Screenshot](./[YOUR_SCREENSHOT_HERE.png])

## ✨ Features

This CRM comes packed with a wide range of features to cover all aspects of your business operations:

#### **Core Modules**
- **📊 Dashboard:** An overview of key stats like new leads, active projects, and due tasks.
- **🗂️ Project Management:** Create, track, and assign users to projects with status updates.
- **✅ Task Management:** A detailed task board with features like multiple assignees, priority, status, filters, and bulk actions.
- **🚀 Lead Management:** Manage potential clients, with notes and requirements tracking. Includes CSV import/export functionality.
- **📦 Product Management:** Track internal products or services with collaborators, tags, and status.
- **📂 File Manager:** A complete file management system with folder creation, drag-and-drop uploads, and image linking.

#### **Financial Tools**
- **🧾 Invoicing:** Create, edit, duplicate, and generate professional PDF invoices.
- **📑 Quotes:** Manage and track client quotations.
- **💰 Accounting:** Track company income, expenses, and salaries with monthly summaries.

#### **HR & Team Collaboration**
- **👥 User Management:** Create and manage users with three distinct roles: Admin, Staff, and Client.
- **🔐 Role-Based Access Control (RBAC):** Fine-grained permission system for Staff, controlling view/create/edit/delete access for each module.
- **🕒 Attendance Tracking:** Real-time check-in, pause, resume, and check-out system for staff. Admins can view detailed logs for all employees.
- **📅 Leave Management:** A complete leave request and approval system with notifications.
- **📝 Daily Reports:** Staff can submit daily work reports, which admins can review.
- **💬 Real-time Team Chat:** A dedicated chat page with online user presence and typing indicators.
- **🗓️ Calendar & Meetings:** Schedule events and meetings, and assign them to team members.

#### **Communication & Settings**
- **📫 Mailbox:** Send emails to users directly from the application using an Edge Function.
- **⚙️ Settings:** Configure company details, logo, invoice settings, and terms & conditions.

## 🚀 Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth, Postgres DB with RLS, Storage, Edge Functions)
- **UI & Charting:** FullCalendar, Recharts, React Select
- **Utilities:** `html2canvas`, `jspdf` for PDF generation, `papaparse` for CSV handling.

## 🏁 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or higher)
- `npm` or `yarn`

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Supabase Backend:**
    This project requires a Supabase backend. Follow the detailed instructions in the [Backend Setup](#-supabase-backend-setup) section below.

4.  **Create your environment file:**
    Duplicate the example environment file and fill in your Supabase credentials.
    ```bash
    cp .env.example .env
    ```
    Now, open the `.env` file and add your Supabase URL and Anon Key. You can find these in your Supabase project's **Settings > API** page.
    ```env
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    VITE_SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY" # Needed for User Management
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## ☁️ Supabase Backend Setup

Follow these steps carefully to prepare your Supabase backend.

1.  **Create a Supabase Project:**
    - Go to [supabase.com](https://supabase.com/) and create a new project.
    - Save your **Project URL**, **`anon` key**, and **`service_role` key**.

2.  **Run the Database SQL Script:**
    - In your Supabase project dashboard, navigate to the **SQL Editor**.
    - Create a new query.
    - Copy the entire content of the `supabase_setup.sql` file from this repository and paste it into the editor.
    - Click **Run**. This will create all necessary tables, functions, and policies.

3.  **Deploy the Edge Functions:**
    - This project uses Edge Functions for sending emails (`send-email`) and creating users securely.
    - You need to install the Supabase CLI: `npm install supabase --save-dev`
    - Link your local project: `npx supabase login` followed by `npx supabase link --project-ref <your-project-id>`
    - Deploy the functions (assuming they are in the `supabase/functions` directory): `npx supabase functions deploy`

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.