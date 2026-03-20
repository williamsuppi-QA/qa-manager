require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const path       = require('path');
const fs         = require('fs');
const { v4: uuidv4 } = require('uuid');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');

const db = require('./database.js');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qa_manager_secret';

// ── MIDDLEWARE ───────────────────────────────────────────────────
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// ── AUTH MIDDLEWARE ──────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

function getProjectId(req) {
  return req.headers['x-project-id'] || req.query.project_id;
}

function requireProject(req, res, next) {
  if (!getProjectId(req)) return res.status(400).json({ error: 'Você precisa selecionar um projeto para acessar estes recursos.' });
  next();
}

// ── AUTH ROUTES ──────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, inviteCode } = req.body;
  
  if (!name || !email || !password || !inviteCode) {
    return res.status(400).json({ error: 'Preencha todos os campos e o código de convite.' });
  }

  const expectedCode = process.env.INVITE_CODE || 'qa2024invite';
  if (inviteCode !== expectedCode) {
    return res.status(401).json({ error: 'Código de convite inválido.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email já cadastrado.' });
  }

  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(id, name, email, hash, 'user');

  res.status(201).json({ success: true, message: 'Conta criada com sucesso!' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => res.json(req.user));

// ── PROJECTS ROUTES ──────────────────────────────────────────────
app.get('/api/projects', authMiddleware, (req, res) => {
  const proj = db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all();
  res.json(proj);
});

app.post('/api/projects', authMiddleware, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do projeto é obrigatório.' });
  const id = uuidv4();
  db.prepare('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)').run(id, name, description || '');
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
});

app.get('/api/projects/:id/settings/:key', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT setting_value FROM project_settings WHERE project_id = ? AND setting_key = ?').get(req.params.id, req.params.key);
  res.json({ value: row ? row.setting_value : null });
});

app.put('/api/projects/:id/settings/:key', authMiddleware, (req, res) => {
  const { value } = req.body;
  db.prepare(`
    INSERT INTO project_settings (project_id, setting_key, setting_value) 
    VALUES (?, ?, ?) 
    ON CONFLICT(project_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value
  `).run(req.params.id, req.params.key, value);
  res.json({ success: true });
});

// ── UPLOADS ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', authMiddleware, requireProject, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

// ── HELPERS ──────────────────────────────────────────────────────
function filterRecords(records, query) {
  let result = [...records];
  const search = (query.search || '').toLowerCase();
  if (search) {
    result = result.filter(r =>
      Object.values(r).some(v => v && String(v).toLowerCase().includes(search))
    );
  }
  const fields = ['status','priority','severity','language','framework'];
  fields.forEach(f => {
    if (query[f]) result = result.filter(r => r[f] === query[f]);
  });
  return result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

// ── DASHBOARD ────────────────────────────────────────────────────
app.get('/api/dashboard', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const tc = db.prepare('SELECT id, status, priority, title FROM test_cases WHERE project_id = ?').all(pId);
  const bugs = db.prepare('SELECT id, status, severity, title FROM bug_reports WHERE project_id = ?').all(pId);
  
  const recentTc = db.prepare('SELECT * FROM test_cases WHERE project_id = ? ORDER BY created_at DESC LIMIT 5').all(pId);
  const recentBugs = db.prepare('SELECT * FROM bug_reports WHERE project_id = ? ORDER BY created_at DESC LIMIT 5').all(pId);

  res.json({
    testCases: {
      total:   tc.length,
      passed:  tc.filter(r => r.status === 'passed').length,
      failed:  tc.filter(r => r.status === 'failed').length,
      pending: tc.filter(r => r.status === 'pending').length,
      blocked: tc.filter(r => r.status === 'blocked').length,
    },
    bugs: {
      total:      bugs.length,
      open:       bugs.filter(r => r.status === 'open').length,
      inProgress: bugs.filter(r => r.status === 'in_progress').length,
      resolved:   bugs.filter(r => r.status === 'resolved').length,
      critical:   bugs.filter(r => r.severity === 'critical').length,
    },
    plans:   { 
      total: db.prepare('SELECT COUNT(*) as c FROM test_plans WHERE project_id = ?').get(pId).c, 
      active: db.prepare("SELECT COUNT(*) as c FROM test_plans WHERE status='active' AND project_id = ?").get(pId).c 
    },
    scripts: { total: db.prepare('SELECT COUNT(*) as c FROM scripts WHERE project_id = ?').get(pId).c },
    recentBugs:      recentBugs,
    recentTestCases: recentTc,
  });
});

// ── CRUD FACTORY ─────────────────────────────────────────────────
function parseJSONFields(r) {
  if (r.steps) r.steps = JSON.parse(r.steps);
  if (r.tags) r.tags = JSON.parse(r.tags);
  return r;
}

function makeCRUD(router, tableName) {
  router.get('/', authMiddleware, requireProject, (req, res) => {
    const rows = db.prepare(`SELECT * FROM ${tableName} WHERE project_id = ? ORDER BY created_at DESC`).all(getProjectId(req)).map(parseJSONFields);
    res.json(filterRecords(rows, req.query));
  });

  router.get('/:id', authMiddleware, requireProject, (req, res) => {
    const rec = db.prepare(`SELECT * FROM ${tableName} WHERE id = ? AND project_id = ?`).get(req.params.id, getProjectId(req));
    if (!rec) return res.status(404).json({ error: 'Não encontrado' });
    res.json(parseJSONFields(rec));
  });

  router.post('/', authMiddleware, requireProject, (req, res) => {
    const id = uuidv4();
    const pId = getProjectId(req);
    const body = req.body;
    let fields = ['id', 'project_id'];
    let values = [id, pId];
    let placeholders = ['?', '?'];
    
    if (body.steps) { fields.push('steps'); values.push(JSON.stringify(body.steps)); placeholders.push('?'); }
    if (body.tags) { fields.push('tags'); values.push(JSON.stringify(body.tags)); placeholders.push('?'); }
    
    const allowed = ['title','description','preconditions','expected_result','actual_result','status','priority','severity','category','assigned_to','environment','version','steps_to_reproduce','browser','os','reported_by','screenshot_url','language','framework','code'];
    
    for (const key of Object.keys(body)) {
      if (allowed.includes(key) && body[key] !== undefined && body[key] !== null) {
        fields.push(key);
        values.push(String(body[key]));
        placeholders.push('?');
      }
    }
    
    db.prepare(`INSERT INTO ${tableName} (${fields.join(',')}) VALUES (${placeholders.join(',')})`).run(...values);
    const rec = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
    res.status(201).json(parseJSONFields(rec));
  });

  router.put('/:id', authMiddleware, requireProject, (req, res) => {
    const body = req.body;
    let sets = [];
    let values = [];
    
    if (body.steps) { sets.push('steps = ?'); values.push(JSON.stringify(body.steps)); }
    if (body.tags) { sets.push('tags = ?'); values.push(JSON.stringify(body.tags)); }
    
    const allowed = ['title','description','preconditions','expected_result','actual_result','status','priority','severity','category','assigned_to','environment','version','steps_to_reproduce','browser','os','reported_by','screenshot_url','language','framework','code'];
    for (const key of Object.keys(body)) {
      if (allowed.includes(key) && body[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(String(body[key]));
      }
    }
    
    if (sets.length === 0) return res.json(parseJSONFields(db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id)));
    
    sets.push("updated_at = CURRENT_TIMESTAMP");
    values.push(req.params.id, getProjectId(req));
    
    db.prepare(`UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = ? AND project_id = ?`).run(...values);
    const rec = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Não encontrado' });
    res.json(parseJSONFields(rec));
  });

  router.delete('/:id', authMiddleware, requireProject, (req, res) => {
    const info = db.prepare(`DELETE FROM ${tableName} WHERE id = ? AND project_id = ?`).run(req.params.id, getProjectId(req));
    if (info.changes === 0) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ success: true });
  });
}

const tcRouter   = express.Router();
const bugRouter  = express.Router();
const planRouter = express.Router();
const scrRouter  = express.Router();

makeCRUD(tcRouter,  'test_cases');
makeCRUD(bugRouter, 'bug_reports');
makeCRUD(scrRouter, 'scripts');

// ── TEST PLANS ROUTES ────────────────────────────────────────────
planRouter.get('/', authMiddleware, requireProject, (req, res) => {
  const rows = db.prepare(`SELECT * FROM test_plans WHERE project_id = ? ORDER BY created_at DESC`).all(getProjectId(req)).map(parseJSONFields);
  res.json(filterRecords(rows, req.query));
});

planRouter.get('/:id', authMiddleware, requireProject, (req, res) => {
  const plan = db.prepare('SELECT * FROM test_plans WHERE id = ? AND project_id = ?').get(req.params.id, getProjectId(req));
  if (!plan) return res.status(404).json({ error: 'Não encontrado' });
  parseJSONFields(plan);
  
  plan.testCases = db.prepare(`
    SELECT tc.* FROM test_cases tc
    JOIN test_plan_cases tpc ON tc.id = tpc.test_case_id
    WHERE tpc.test_plan_id = ?
  `).all(plan.id).map(parseJSONFields);
  
  res.json(plan);
});

planRouter.post('/', authMiddleware, requireProject, (req, res) => {
  const id = uuidv4();
  const body = req.body;
  const tagsStr = body.tags ? JSON.stringify(body.tags) : '[]';
  
  db.prepare(`INSERT INTO test_plans (id, project_id, title, description, objective, scope, out_of_scope, environment, start_date, end_date, status, version, tags) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, getProjectId(req), body.title, body.description, body.objective, body.scope, body.out_of_scope, body.environment, body.startDate, body.endDate, body.status || 'draft', body.version, tagsStr
  );
  
  if (body.testCaseIds && Array.isArray(body.testCaseIds)) {
    const insertRel = db.prepare('INSERT OR IGNORE INTO test_plan_cases (test_plan_id, test_case_id) VALUES (?, ?)');
    db.transaction((tcs) => { for(const tc of tcs) insertRel.run(id, tc); })(body.testCaseIds);
  }
  
  res.status(201).json(parseJSONFields(db.prepare('SELECT * FROM test_plans WHERE id = ?').get(id)));
});

planRouter.put('/:id', authMiddleware, requireProject, (req, res) => {
  const body = req.body;
  const tagsStr = body.tags ? JSON.stringify(body.tags) : '[]';
  
  db.prepare(`UPDATE test_plans SET title=?, description=?, objective=?, scope=?, out_of_scope=?, environment=?, start_date=?, end_date=?, status=?, version=?, tags=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND project_id=?`).run(
    body.title, body.description, body.objective, body.scope, body.out_of_scope, body.environment, body.startDate, body.endDate, body.status, body.version, tagsStr, req.params.id, getProjectId(req)
  );
  
  if (body.testCaseIds && Array.isArray(body.testCaseIds)) {
    db.prepare('DELETE FROM test_plan_cases WHERE test_plan_id = ?').run(req.params.id);
    const insertRel = db.prepare('INSERT OR IGNORE INTO test_plan_cases (test_plan_id, test_case_id) VALUES (?, ?)');
    db.transaction((tcs) => { for(const tc of tcs) insertRel.run(req.params.id, tc); })(body.testCaseIds);
  }
  
  res.json(parseJSONFields(db.prepare('SELECT * FROM test_plans WHERE id = ?').get(req.params.id)));
});

planRouter.delete('/:id', authMiddleware, requireProject, (req, res) => {
  const info = db.prepare('DELETE FROM test_plans WHERE id = ? AND project_id = ?').run(req.params.id, getProjectId(req));
  if (info.changes === 0) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ success: true });
});

app.use('/api/test-cases',  tcRouter);
app.use('/api/bug-reports', bugRouter);
app.use('/api/test-plans',  planRouter);
app.use('/api/scripts',     scrRouter);

// ── GLOBAL LIBRARY ──────────────────────────────────────────────
app.get('/api/library', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT tc.*, p.name as project_name 
    FROM test_cases tc 
    LEFT JOIN projects p ON tc.project_id = p.id 
    WHERE tc.is_global = 1 
    ORDER BY tc.category, tc.title
  `).all();
  rows.forEach(r => {
    if (r.steps) r.steps = JSON.parse(r.steps);
    if (r.tags) r.tags = JSON.parse(r.tags);
  });
  res.json(rows);
});

app.put('/api/test-cases/:id/toggle-global', authMiddleware, (req, res) => {
  const tc = db.prepare('SELECT is_global FROM test_cases WHERE id = ?').get(req.params.id);
  if (!tc) return res.status(404).json({ error: 'Caso não encontrado' });
  const newVal = tc.is_global ? 0 : 1;
  db.prepare('UPDATE test_cases SET is_global = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ is_global: newVal });
});

app.post('/api/library/clone', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const { case_ids } = req.body;
  if (!case_ids || !Array.isArray(case_ids) || case_ids.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um caso para clonar.' });
  }
  
  const insertStmt = db.prepare(`
    INSERT INTO test_cases (id, project_id, title, description, preconditions, steps, expected_result, 
      status, priority, severity, category, assigned_to, environment, version, tags, is_global)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  
  const cloneMany = db.transaction((ids) => {
    let count = 0;
    for (const caseId of ids) {
      const src = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(caseId);
      if (!src) continue;
      const newId = uuidv4();
      insertStmt.run(
        newId, pId, src.title, src.description, src.preconditions, src.steps, src.expected_result,
        src.priority, src.severity, src.category, src.assigned_to, src.environment, src.version, src.tags
      );
      count++;
    }
    return count;
  });
  
  const cloned = cloneMany(case_ids);
  res.json({ success: true, cloned });
});

// ── OUTBOUND SYNC ROUTES ─────────────────────────────────────────
app.post('/api/bug-reports/:id/jira-sync', authMiddleware, async (req, res) => {
  try {
    const bugId = req.params.id;
    const bug = db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(bugId);
    if (!bug) return res.status(404).json({ error: 'Bug não encontrado' });
    
    const settingRow = db.prepare('SELECT setting_value FROM project_settings WHERE project_id = ? AND setting_key = ?').get(bug.project_id, 'jira_config');
    if (!settingRow || !settingRow.setting_value) return res.status(400).json({ error: 'Jira não configurado neste projeto.' });
    
    const jiraConfig = JSON.parse(settingRow.setting_value);
    const { url, email, token, projectKey } = jiraConfig;
    if (!url || !email || !token || !projectKey) return res.status(400).json({ error: 'Configuração do Jira incompleta.' });

    let desc = bug.description || '';
    if (bug.steps_to_reproduce) desc += '\n\n*Passos de Reprodução:*\n' + JSON.parse(bug.steps_to_reproduce).join('\n');
    if (bug.expected_result) desc += '\n\n*Resultado Esperado:* ' + bug.expected_result;
    if (bug.actual_result) desc += '\n\n*Resultado Atual:* ' + bug.actual_result;
    if (bug.screenshot_url) desc += `\n\n*Evidência Anexada:* ${req.protocol}://${req.get('host')}${bug.screenshot_url}`;

    const payload = {
      fields: {
        project: { key: projectKey },
        summary: `[QA Manager] ${bug.title}`,
        description: desc,
        issuetype: { name: "Bug" }
      }
    };
    
    const jiraUrl = `${url.replace(/\/$/, '')}/rest/api/2/issue`;
    const authHeader = 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
    
    // API Fetch Nativo do Node.js
    const response = await fetch(jiraUrl, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const respData = await response.json();
    if (!response.ok) {
      console.error(respData);
      return res.status(response.status).json({ error: 'Erro no servidor do Jira: ' + JSON.stringify(respData.errorMessages || respData.errors) });
    }
    
    res.json({ success: true, key: respData.key, url: `${url.replace(/\/$/, '')}/browse/${respData.key}` });
  } catch(e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ── TEST RUNS ROUTES ─────────────────────────────────────────────
const runRouter = express.Router();

runRouter.get('/', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const rows = db.prepare(`
    SELECT tr.*, tp.title as plan_title 
    FROM test_runs tr 
    JOIN test_plans tp ON tr.test_plan_id = tp.id 
    WHERE tr.project_id = ? 
    ORDER BY tr.created_at DESC
  `).all(pId);
  res.json(rows);
});

runRouter.get('/:id', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const run = db.prepare(`
    SELECT tr.*, tp.title as plan_title 
    FROM test_runs tr 
    JOIN test_plans tp ON tr.test_plan_id = tp.id 
    WHERE tr.id = ? AND tr.project_id = ?
  `).get(req.params.id, pId);
  if (!run) return res.status(404).json({ error: 'Execução não encontrada' });
  
  run.results = db.prepare(`
    SELECT r.*, tc.title as case_title, tc.steps, tc.expected_result, tc.preconditions 
    FROM test_run_results r
    JOIN test_cases tc ON r.test_case_id = tc.id
    WHERE r.test_run_id = ?
  `).all(run.id).map(r => {
    if (r.steps) r.steps = JSON.parse(r.steps);
    return r;
  });
  res.json(run);
});

runRouter.post('/', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const { title, test_plan_id, environment } = req.body;
  if (!title || !test_plan_id) return res.status(400).json({ error: 'Título e Plano de Teste são obrigatórios' });
  
  const plan = db.prepare('SELECT id FROM test_plans WHERE id = ? AND project_id = ?').get(test_plan_id, pId);
  if (!plan) return res.status(400).json({ error: 'Plano inválido' });
  
  const runId = uuidv4();
  db.prepare('INSERT INTO test_runs (id, project_id, test_plan_id, title, environment, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(
    runId, pId, test_plan_id, title, environment || '', req.user.name
  );
  
  const tcs = db.prepare('SELECT test_case_id FROM test_plan_cases WHERE test_plan_id = ?').all(test_plan_id);
  const insertRes = db.prepare('INSERT INTO test_run_results (id, test_run_id, test_case_id) VALUES (?, ?, ?)');
  db.transaction((cases) => {
    for (const tc of cases) insertRes.run(uuidv4(), runId, tc.test_case_id);
  })(tcs);
  
  res.status(201).json({ id: runId, title });
});

runRouter.put('/:id/results/:tc_id', authMiddleware, requireProject, (req, res) => {
  const { status, actual_result } = req.body;
  const pId = getProjectId(req);
  
  const run = db.prepare('SELECT id FROM test_runs WHERE id = ? AND project_id = ?').get(req.params.id, pId);
  if (!run) return res.status(404).json({ error: 'Test run não encontrado' });
  
  const info = db.prepare(`
    UPDATE test_run_results 
    SET status = ?, actual_result = ?, executed_by = ?, executed_at = CURRENT_TIMESTAMP
    WHERE test_run_id = ? AND test_case_id = ?
  `).run(status, actual_result || '', req.user.name, run.id, req.params.tc_id);
  
  if (info.changes === 0) return res.status(404).json({ error: 'Caso de teste não encontrado na execução' });
  res.json({ success: true });
});

runRouter.delete('/:id', authMiddleware, requireProject, (req, res) => {
  const info = db.prepare('DELETE FROM test_runs WHERE id = ? AND project_id = ?').run(req.params.id, getProjectId(req));
  if (info.changes === 0) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ success: true });
});

app.use('/api/test-runs', runRouter);

// ── WEBHOOKS INTERNAL ROUTES ─────────────────────────────────────
const hookRouter = express.Router();

hookRouter.get('/', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const keys = db.prepare('SELECT id, name, token, created_at FROM webhook_keys WHERE project_id = ? ORDER BY created_at DESC').all(pId);
  res.json(keys);
});

hookRouter.post('/', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da integração obrigatório' });
  const id = uuidv4();
  const token = 'qa_' + Buffer.from(uuidv4() + Date.now().toString()).toString('base64').replace(/=/g, '');
  db.prepare('INSERT INTO webhook_keys (id, project_id, name, token) VALUES (?, ?, ?, ?)').run(id, pId, name, token);
  res.status(201).json({ id, name, token });
});

hookRouter.delete('/:id', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const info = db.prepare('DELETE FROM webhook_keys WHERE id = ? AND project_id = ?').run(req.params.id, pId);
  if (info.changes === 0) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ success: true });
});

app.use('/api/webhooks', hookRouter);

// ── ACTIVITY FEED ───────────────────────────────────────────
app.get('/api/activity', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const events = [];
  
  const recentBugs = db.prepare('SELECT id, title, severity, created_at FROM bug_reports WHERE project_id = ? ORDER BY created_at DESC LIMIT 8').all(pId);
  recentBugs.forEach(b => events.push({ type: 'bug', icon: '🐛', text: `Bug reportado: ${b.title}`, severity: b.severity, time: b.created_at }));
  
  const recentCases = db.prepare('SELECT id, title, status, created_at FROM test_cases WHERE project_id = ? ORDER BY created_at DESC LIMIT 6').all(pId);
  recentCases.forEach(tc => events.push({ type: 'case', icon: '✅', text: `Caso criado: ${tc.title}`, status: tc.status, time: tc.created_at }));
  
  const recentRuns = db.prepare('SELECT id, title, status, created_at FROM test_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 4').all(pId);
  recentRuns.forEach(r => events.push({ type: 'run', icon: '▶️', text: `Execução: ${r.title}`, status: r.status, time: r.created_at }));
  
  events.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(events.slice(0, 12));
});

// ── TRACEABILITY MATRIX ─────────────────────────────────────────
app.get('/api/traceability/:plan_id', authMiddleware, requireProject, (req, res) => {
  const pId = getProjectId(req);
  const planId = req.params.plan_id;
  
  const plan = db.prepare('SELECT * FROM test_plans WHERE id = ? AND project_id = ?').get(planId, pId);
  if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
  if (plan.test_case_ids) plan.test_case_ids = JSON.parse(plan.test_case_ids);
  
  // Casos do plano
  const caseIds = plan.test_case_ids || [];
  const cases = caseIds.length > 0
    ? db.prepare(`SELECT id, title, status, priority, severity FROM test_cases WHERE id IN (${caseIds.map(() => '?').join(',')})`).all(...caseIds)
    : [];
  
  // Execuções deste plano
  const runs = db.prepare('SELECT id, title, status, environment, created_by, created_at FROM test_runs WHERE test_plan_id = ? AND project_id = ? ORDER BY created_at DESC').all(planId, pId);
  
  // Resultados por execução
  const matrix = [];
  for (const tc of cases) {
    const row = { case_id: tc.id, case_title: tc.title, priority: tc.priority, severity: tc.severity, runs: [] };
    for (const run of runs) {
      const result = db.prepare('SELECT status, actual_result, executed_by, executed_at FROM test_run_results WHERE test_run_id = ? AND test_case_id = ?').get(run.id, tc.id);
      row.runs.push({
        run_id: run.id,
        run_title: run.title,
        status: result ? result.status : 'not_included',
        executed_by: result ? result.executed_by : null,
        executed_at: result ? result.executed_at : null
      });
    }
    matrix.push(row);
  }
  
  // Métricas
  const lastRun = runs[0] || null;
  let metrics = { total: cases.length, passed: 0, failed: 0, blocked: 0, untested: 0 };
  if (lastRun) {
    const results = db.prepare('SELECT status, COUNT(*) as count FROM test_run_results WHERE test_run_id = ? GROUP BY status').all(lastRun.id);
    results.forEach(r => {
      if (r.status === 'passed') metrics.passed = r.count;
      else if (r.status === 'failed') metrics.failed = r.count;
      else if (r.status === 'blocked' || r.status === 'skipped') metrics.blocked += r.count;
      else metrics.untested += r.count;
    });
  }
  
  res.json({ plan, cases, runs, matrix, metrics });
});

// ── EXTERNAL INBOUND WEBHOOK (No AuthMiddleware) ─────────────────
app.post('/api/int/webhooks/:project_id', (req, res) => {
  const pId = req.params.project_id;
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Bearer Token' });
  
  const token = auth.split(' ')[1];
  const key = db.prepare('SELECT id, name FROM webhook_keys WHERE project_id = ? AND token = ?').get(pId, token);
  if (!key) return res.status(403).json({ error: 'Invalid Webhook Token' });
  
  const { title, description, severity, status, source } = req.body;
  if (!title) return res.status(400).json({ error: 'Payload requires a title' });
  
  const bugId = uuidv4();
  const reportedBy = source ? `Sistema Inbound: ${source} (${key.name})` : `Webhook API (${key.name})`;
  
  db.prepare(`
    INSERT INTO bug_reports (id, project_id, title, description, severity, status, priority, reported_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bugId, pId, title, description || '', severity || 'medium', status || 'open', 'medium', reportedBy
  );
  
  res.status(201).json({ message: 'Bug report created via Webhook', bug_id: bugId });
});

// ── QUICK CAPTURE (CORS Enabled) ─────────────────────────────
app.options('/api/quick-capture', (req, res) => {
  res.set({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST' });
  res.sendStatus(204);
});

app.post('/api/quick-capture', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Token inválido' });
  const token = auth.split(' ')[1];
  
  const key = db.prepare('SELECT project_id, name FROM webhook_keys WHERE token = ?').get(token);
  if (!key) return res.status(403).json({ error: 'Token não reconhecido' });
  
  const { title, description, severity, page_url, browser, os, screenshot_base64 } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });
  
  let screenshotUrl = '';
  if (screenshot_base64) {
    try {
      const matches = screenshot_base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `capture_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        screenshotUrl = `/uploads/${filename}`;
      }
    } catch(e) { console.error('Screenshot save error:', e); }
  }
  
  const bugId = uuidv4();
  const desc = [description || '', page_url ? `URL: ${page_url}` : '', browser ? `Navegador: ${browser}` : '', os ? `SO: ${os}` : ''].filter(Boolean).join('\n');
  
  db.prepare(`INSERT INTO bug_reports (id, project_id, title, description, severity, status, priority, reported_by, screenshot_url, environment)
    VALUES (?, ?, ?, ?, ?, 'open', 'medium', ?, ?, ?)`
  ).run(bugId, key.project_id, title, desc, severity || 'medium', `Quick Capture (${key.name})`, screenshotUrl, browser || '');
  
  res.status(201).json({ success: true, bug_id: bugId });
});

// ── EXPORTS ──────────────────────────────────────────────────────
const LABEL_MAP = {
  id: 'ID', title: 'Título', description: 'Descrição', preconditions: 'Pré-condições',
  steps: 'Passos', expected_result: 'Resultado Esperado', actual_result: 'Resultado Atual',
  status: 'Status', priority: 'Prioridade', severity: 'Severidade', category: 'Categoria',
  assigned_to: 'Responsável', reported_by: 'Reportado por', environment: 'Ambiente',
  browser: 'Navegador', os: 'Sistema Operacional', version: 'Versão', screenshot_url: 'URL da Imagem',
  tags: 'Tags', objective: 'Objetivo', scope: 'Escopo', out_of_scope: 'Fora de Escopo',
  start_date: 'Data de Início', end_date: 'Data de Término', startDate: 'Data de Início', endDate: 'Data de Término',
  created_by: 'Criado por', approved_by: 'Aprovado por', language: 'Linguagem', framework: 'Framework', code: 'Código',
  created_at: 'Criado em', updated_at: 'Atualizado em', actual: 'Resultado Atual', expected: 'Resultado Esperado'
};

function translateKey(k) { return LABEL_MAP[k] || k; }

app.get('/api/exports/:resource/:format', authMiddleware, requireProject, async (req, res) => {
  const { resource, format } = req.params;
  const pId = getProjectId(req);

  const map = {
    'test-cases':  'test_cases',
    'bug-reports': 'bug_reports',
    'test-plans':  'test_plans',
    'scripts':     'scripts',
  };
  const tableName = map[resource];
  if (!tableName) return res.status(404).json({ error: 'Recurso inválido' });

  let q = `SELECT * FROM ${tableName} WHERE project_id = ?`;
  let params = [pId];
  
  if (req.query.ids) {
    const ids = req.query.ids.split(',');
    q += ' AND id IN (' + ids.map(()=>'?').join(',') + ')';
    params.push(...ids);
  }
  
  const data = db.prepare(q).all(...params).map(parseJSONFields);

  try {
    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="${resource}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(data, null, 2));
    }
    if (format === 'csv') {
      if (!data.length) return res.status(400).json({ error: 'Sem dados' });
      const keys   = Object.keys(data[0]).filter(k => !['steps','tags','testCaseIds', 'project_id'].includes(k));
      const header = keys.map(translateKey).join(',');
      const rows   = data.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','));
      res.setHeader('Content-Disposition', `attachment; filename="${resource}.csv"`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send([header, ...rows].join('\n'));
    }
    if (format === 'excel') {
      const ExcelJS = require('exceljs');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(resource);
      if (!data.length) return res.status(400).json({ error: 'Sem dados' });
      const keys = Object.keys(data[0]).filter(k => !['steps','tags','testCaseIds', 'project_id'].includes(k));
      ws.columns = keys.map(k => ({ header: translateKey(k).toUpperCase(), key: k, width: 20 }));
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2980B9' } };
      data.forEach(r => ws.addRow(keys.reduce((o, k) => ({ ...o, [k]: r[k] ?? '' }), {})));
      res.setHeader('Content-Disposition', `attachment; filename="${resource}.xlsx"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return wb.xlsx.write(res).then(() => res.end());
    }
    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Disposition', `attachment; filename="${resource}.pdf"`);
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);
      const pdfTitle = req.query.title || `Relatório: ${resource}`;
      doc.fontSize(18).fillColor('#2980B9').text(pdfTitle, { align: 'center' });
      doc.moveDown();
      data.forEach((r, i) => {
        doc.fontSize(12).fillColor('#2980B9').text(`#${i + 1} — ${r.title || r.id}`);
        doc.fontSize(9).fillColor('#555');
        Object.entries(r).forEach(([k, v]) => {
          if (['id','created_at','updated_at','steps','tags','testCaseIds','code', 'project_id'].includes(k)) return;
          doc.text(`${translateKey(k)}: ${v ?? '—'}`);
        });
        doc.moveDown(0.5);
        if (i < data.length - 1) doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#ddd').stroke().moveDown(0.3);
      });
      doc.end();
      return;
    }
    res.status(400).json({ error: 'Formato inválido' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro de exportação' });
  }
});

// ── INIT ─────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`QA Manager rodando na porta ${PORT}`));