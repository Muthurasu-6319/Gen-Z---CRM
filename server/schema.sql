-- CRM MySQL Schema
-- Run this after creating the database: CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────
-- PROFILES (users)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           VARCHAR(36)  NOT NULL PRIMARY KEY,
  username     VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('Admin','Staff','Client') NOT NULL DEFAULT 'Staff',
  designation  VARCHAR(100),
  mobile       VARCHAR(30),
  address      TEXT,
  gpay         VARCHAR(50),
  bank_details TEXT,
  blood_group  VARCHAR(10),
  permissions  JSON,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────
-- TASKS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  assignee_id  VARCHAR(36),
  start_date   DATE,
  due_date     DATE,
  priority     ENUM('Low','Medium','High') DEFAULT 'Medium',
  status       ENUM('To Do','In Progress','Completed') DEFAULT 'To Do',
  created_by   VARCHAR(36),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- PROJECTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100),
  client_name   VARCHAR(100),
  client_mobile VARCHAR(30),
  total_cost    DECIMAL(12,2),
  project_asset TEXT,
  start_date    DATE,
  end_date      DATE,
  status        ENUM('Started','In Progress','On Hold','Cancelled','Completed') DEFAULT 'Started',
  tags          JSON,
  created_by    VARCHAR(36),
  assigned_to   JSON,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100),
  tags          JSON,
  end_date      DATE,
  collaborators JSON,
  notes         TEXT,
  status        ENUM('Started','In Progress','On Hold','Cancelled','Completed') DEFAULT 'Started',
  created_by    VARCHAR(36),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- LEADS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id          INT  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  requirements TEXT,
  mobile_no   VARCHAR(30),
  notes       TEXT,
  created_by  VARCHAR(36),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- QUOTES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  document_url VARCHAR(500),
  created_by   VARCHAR(36),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- INVOICES
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             INT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_no     VARCHAR(50),
  client_name    VARCHAR(255),
  issue_date     DATE,
  due_date       DATE,
  status         ENUM('Draft','Sent','Paid','Overdue','Pending') DEFAULT 'Draft',
  total_amount   DECIMAL(12,2) DEFAULT 0,
  paid_amount    DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50),
  notes          TEXT,
  created_by     VARCHAR(36),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id          INT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_id  INT    NOT NULL,
  description VARCHAR(500),
  quantity    DECIMAL(10,2) DEFAULT 1,
  price       DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────
-- ACCOUNTING / TRANSACTIONS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                 INT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type               ENUM('Income','Expense','Salary') NOT NULL,
  category           VARCHAR(100),
  description        TEXT,
  amount             DECIMAL(12,2) NOT NULL DEFAULT 0,
  date               DATE,
  payment_mode       VARCHAR(50),
  related_profile_id VARCHAR(36),
  created_by         VARCHAR(36),
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (related_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- CALENDAR EVENTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id          INT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  start_time  DATETIME,
  end_time    DATETIME,
  description TEXT,
  color       VARCHAR(20),
  assigned_to JSON,
  created_by  VARCHAR(36),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- ATTENDANCE
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id             INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  profile_id     VARCHAR(36)  NOT NULL,
  date           DATE         NOT NULL,
  check_in_time  DATETIME,
  check_out_time DATETIME,
  status         ENUM('Checked In','On Break','Checked Out') DEFAULT 'Checked In',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_breaks (
  id               INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  entry_id         INT NOT NULL,
  break_start_time DATETIME,
  break_end_time   DATETIME,
  FOREIGN KEY (entry_id) REFERENCES attendance(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────
-- LEAVE REQUESTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaves (
  id          INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  profile_id  VARCHAR(36) NOT NULL,
  start_date  DATE        NOT NULL,
  end_date    DATE        NOT NULL,
  reason      TEXT,
  status      ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  approved_by VARCHAR(36),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id)  REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- MEETINGS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
  id              INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  start_time      DATETIME,
  end_time        DATETIME,
  google_meet_link VARCHAR(500),
  assigned_to     JSON,
  created_by      VARCHAR(36),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- DAILY REPORTS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_reports (
  id               INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  profile_id       VARCHAR(36) NOT NULL,
  report_date      DATE        NOT NULL,
  tasks_completed  TEXT,
  hours_spent      DECIMAL(5,2),
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────
-- MESSAGES (Team Chat)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  profile_id VARCHAR(36) NOT NULL,
  content    TEXT        NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────
-- FILE MANAGER
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type    VARCHAR(100),
  size         INT,
  path         VARCHAR(500),
  folder       VARCHAR(255) DEFAULT 'root',
  url          VARCHAR(1000),
  uploaded_by  VARCHAR(36),
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- MAILBOX
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mails (
  id          INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  sender_id   VARCHAR(36),
  recipient_id VARCHAR(36),
  subject     VARCHAR(500),
  body        TEXT,
  is_read     TINYINT(1) DEFAULT 0,
  folder      ENUM('inbox','sent','draft','trash') DEFAULT 'inbox',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)    REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id                    INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipient_profile_id  VARCHAR(36),
  message               TEXT,
  related_item_type     VARCHAR(100),
  related_item_id       VARCHAR(100),
  is_read               TINYINT(1) DEFAULT 0,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────
-- SETTINGS
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id         INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  key_name   VARCHAR(100) NOT NULL UNIQUE,
  value      TEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SET FOREIGN_KEY_CHECKS = 1;

-- ────────────────────────────────────────────────
-- SEED: Default admin user (password: admin123)
-- ────────────────────────────────────────────────
INSERT IGNORE INTO profiles (id, username, email, password, role, designation)
VALUES (
   'admin-uuid-0001-0001-000000000001',
   'Admin',
   'admin@gmail.com',
   '$2b$10$IcH820CAncuUhXimAuWfEuVeroiwxEYrcKHub3TuXReO45Sfx.Fye', -- password: 12345
   'Admin',
   'System Administrator'
);
