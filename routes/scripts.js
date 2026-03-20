const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const parseJSON = (str) => { try { return JSON.parse(str); } catch { return str; } };

router.get('/', (req, res) => {
  try {
    const { language, framework, search } = req.query;
    let query = 'SELECT * FROM scripts WHERE 1=1';
    const params = [];

    if (language)  { query += ' AND language = ?';  params.push(language); }
    if (framework) { query += ' AND framework = ?'; params.push(framework); }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params);
    res.json(rows.map(r => ({ ...r, tags: parseJSON(r.tags) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Script não encontrado' });
    res.json({ ...row, tags: parseJSON(row.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, description, language, framework, code, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO scripts (id, title, description, language, framework, code, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title, description || '',
      language || 'javascript', framework || '',
      code || '', JSON.stringify(tags || [])
    );

    const created = db.prepare('SELECT * FROM scripts WHERE id = ?').get(id);
    res.status(201).json({ ...created, tags: parseJSON(created.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Script não encontrado' });

    const { title, description, language, framework, code, tags } = req.body;

    db.prepare(`
      UPDATE scripts SET
        title = ?, description = ?, language = ?,
        framework = ?, code = ?, tags = ?
      WHERE id = ?
    `).run(
      title       || existing.title,
      description ?? existing.description,
      language    || existing.language,
      framework   ?? existing.framework,
      code        ?? existing.code,
      JSON.stringify(tags || parseJSON(existing.tags)),
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
    res.json({ ...updated, tags: parseJSON(updated.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM scripts WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Script não encontrado' });
    db.prepare('DELETE FROM scripts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Script removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;