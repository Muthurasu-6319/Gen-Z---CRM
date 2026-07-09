// server/routes/reports.js
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/performance', auth, async (req, res) => {
  const targetId = req.query.profile_id || req.user.id;
  
  // Security check: Only admin can view others' performance
  if (req.query.profile_id && req.user.role !== 'Admin' && req.query.profile_id !== String(req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { getDoc, getCollection } = require('../firebase-admin');
    const profile = await getDoc('profiles', targetId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Projects completed
    const allProjects = await getCollection('projects');
    const completedProjects = allProjects.filter(p => 
      p.status === 'Completed' && p.assigned_to && p.assigned_to.includes(targetId)
    );

    // Leads taken
    const [leads] = await db.query('SELECT * FROM leads WHERE created_by = ?', [targetId]);

    res.json({
      total_paid: profile.total_paid || 0,
      total_pending: profile.total_pending || 0,
      projects_completed: completedProjects.length,
      leads_taken: leads.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  const { profile_id, month } = req.query;
  try {
    let query, params;

    if (req.user.role === 'Admin') {
      // Admin: optionally filter by profile_id and/or month (YYYY-MM)
      let conditions = [];
      params = [];
      if (profile_id) { conditions.push('r.profile_id = ?'); params.push(profile_id); }
      if (month) {
        conditions.push('DATE_FORMAT(r.report_date, "%Y-%m") = ?');
        params.push(month);
      }
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      query = `SELECT r.*, p.username FROM daily_reports r LEFT JOIN profiles p ON r.profile_id = p.id ${where} ORDER BY r.report_date DESC`;
    } else {
      // Staff: only see their own reports
      query = `SELECT r.*, p.username FROM daily_reports r LEFT JOIN profiles p ON r.profile_id = p.id WHERE r.profile_id=? ORDER BY r.report_date DESC`;
      params = [req.user.id];
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { report_date, tasks_completed, hours_spent } = req.body;
  try {
    const [result] = await db.query(
      `INSERT INTO daily_reports (profile_id, report_date, tasks_completed, hours_spent) VALUES (?, ?, ?, ?)`,
      [req.user.id, report_date, tasks_completed || null, hours_spent || null]
    );
    const [rows] = await db.query('SELECT * FROM daily_reports WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  const { report_date, tasks_completed, hours_spent } = req.body;
  try {
    await db.query(
      `UPDATE daily_reports SET report_date=?, tasks_completed=?, hours_spent=? WHERE id=?`,
      [report_date, tasks_completed || null, hours_spent || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM daily_reports WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM daily_reports WHERE id = ?', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/full_report/:profile_id', auth, async (req, res) => {
  const targetId = req.params.profile_id;
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Access denied' });

  try {
    const { getDoc, getCollection } = require('../firebase-admin');
    const profile = await getDoc('profiles', targetId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // Projects
    const allProjects = await getCollection('projects');
    const assignedProjects = allProjects.filter(p => p.assigned_to && p.assigned_to.includes(targetId));
    const completedProjects = assignedProjects.filter(p => p.status === 'Completed');
    
    let totalAssignedAmount = 0;
    assignedProjects.forEach(p => {
        if (p.assigned_amounts && p.assigned_amounts[targetId]) {
            totalAssignedAmount += Number(p.assigned_amounts[targetId]);
        }
    });

    // Tasks
    const [tasks] = await db.query('SELECT * FROM tasks WHERE assignee_id = ?', [targetId]);
    const completedTasks = tasks.filter(t => t.status === 'Completed');

    // Products
    const allProducts = await getCollection('products');
    const assignedProducts = allProducts.filter(p => p.collaborators && p.collaborators.includes(targetId));
    const completedProducts = assignedProducts.filter(p => p.status === 'Completed');

    // Leads
    const [leadsAssigned] = await db.query('SELECT * FROM leads WHERE assigned_to = ? OR created_by = ?', [targetId, targetId]);

    // Attendance
    const [attendance] = await db.query('SELECT * FROM attendance WHERE profile_id = ?', [targetId]);
    const daysPresent = attendance.filter(a => a.status === 'Checked In' || a.status === 'Checked Out');

    // Meetings
    const [allMeetingsRows] = await db.query('SELECT * FROM meetings');
    const meetingsAttended = allMeetingsRows.filter(m => 
        m.created_by === targetId || 
        (m.assigned_to && (() => {
            try { const arr = typeof m.assigned_to === 'string' ? JSON.parse(m.assigned_to) : m.assigned_to; return arr.includes(targetId); } catch(e){return false;}
        })())
    );

    // Mails
    const allMails = await getCollection('mails');
    const sentMails = allMails.filter(m => m.sender_id === targetId && m.folder === 'sent');

    // Support Tickets
    const [tickets] = await db.query('SELECT * FROM tickets WHERE client_id = ? OR assigned_to = ?', [targetId, targetId]);
    const resolvedTickets = tickets.filter(t => t.status === 'Closed' || t.status === 'Resolved');

    // Construct full report
    const fullReport = {
        profile: {
            id: profile.id,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            designation: profile.designation || 'N/A',
            mobile: profile.mobile || 'N/A'
        },
        financials: {
            total_paid: profile.total_paid || 0,
            total_pending: profile.total_pending || 0,
            project_incentives: totalAssignedAmount
        },
        work: {
            projects_assigned: assignedProjects.length,
            projects_completed: completedProjects.length,
            tasks_assigned: tasks.length,
            tasks_completed: completedTasks.length,
            products_involved: assignedProducts.length,
            products_completed: completedProducts.length
        },
        crm: {
            leads_handled: leadsAssigned.length
        },
        hr: {
            attendance_days: daysPresent.length
        },
        communication: {
            meetings: meetingsAttended.length,
            emails_sent: sentMails.length,
            support_tickets: tickets.length,
            resolved_tickets: resolvedTickets.length
        }
    };

    res.json(fullReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
