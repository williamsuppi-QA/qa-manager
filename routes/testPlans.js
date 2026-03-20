const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const parseJSON = (str) => { try { return JSON.parse(str); } catch { return str; } };

router.get('/', (req, res) => {
  try {
    const { status, priority, search } = req.query;
    let query = 'SELECT * FROM test_cases WHERE 1=1';
    const params = [];

    if (status)   { query += ' AND status = ?';   params.push(status); }
    if (priority) { query += ' AND priority = ?'; params.push(priority); }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    const result = rows.map(r => ({ ...r, steps: parseJSON(r.steps), tags: parseJSON(r.tags) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Caso de teste não encontrado' });
    res.json({ ...row, steps: parseJSON(row.steps), tags: parseJSON(row.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      title, description, preconditions, steps, expected_result,
      actual_result, status, priority, severity, category,
      assigned_to, environment, version, tags
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO test_cases
        (id, title, description, preconditions, steps, expected_result, actual_result,
         status, priority, severity, category, assigned_to, environment, version, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title, description || '', preconditions || '',
      JSON.stringify(steps || []), expected_result || '', actual_result || '',
      status || 'pending', priority || 'medium', severity || 'medium',
      category || '', assigned_to || '', environment || '', version || '',
      JSON.stringify(tags || [])
    );

    const created = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(id);
    res.status(201).json({ ...created, steps: parseJSON(created.steps), tags: parseJSON(created.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Caso de teste não encontrado' });

    const {
      title, description, preconditions, steps, expected_result,
      actual_result, status, priority, severity, category,
      assigned_to, environment, version, tags
    } = req.body;

    db.prepare(`
      UPDATE test_cases SET
        title = ?, description = ?, preconditions = ?, steps = ?,
        expected_result = ?, actual_result = ?, status = ?, priority = ?,
        severity = ?, category = ?, assigned_to = ?, environment = ?, version = ?, tags = ?
      WHERE id = ?
    `).run(
      title || existing.title,
      description    ?? existing.description,
      preconditions  ?? existing.preconditions,
      JSON.stringify(steps || parseJSON(existing.steps)),
      expected_result ?? existing.expected_result,
      actual_result   ?? existing.actual_result,
      status   || existing.status,
      priority || existing.priority,
      severity || existing.severity,
      category    ?? existing.category,
      assigned_to ?? existing.assigned_to,
      environment ?? existing.environment,
      version     ?? existing.version,
      JSON.stringify(tags || parseJSON(existing.tags)),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    res.json({ ...updated, steps: parseJSON(updated.steps), tags: parseJSON(updated.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Caso de teste não encontrado' });
    db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
    res.json({ message: 'Caso de teste removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;