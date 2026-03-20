const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const parseJSON = (str) => { try { return JSON.parse(str); } catch { return str; } };

router.get('/', (req, res) => {
  try {
    const { status, severity, priority, search } = req.query;
    let query = 'SELECT * FROM bug_reports WHERE 1=1';
    const params = [];

    if (status)   { query += ' AND status = ?';   params.push(status); }
    if (severity) { query += ' AND severity = ?'; params.push(severity); }
    if (priority) { query += ' AND priority = ?'; params.push(priority); }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    const result = rows.map(r => ({
      ...r,
      steps_to_reproduce: parseJSON(r.steps_to_reproduce),
      tags: parseJSON(r.tags)
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

