const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'qa_manager.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    preconditions TEXT,
    steps TEXT,
    expected_result TEXT,
    actual_result TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    severity TEXT DEFAULT 'medium',
    category TEXT,
    assigned_to TEXT,
    environment TEXT,
    version TEXT,
    tags TEXT,
    is_global INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bug_reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    severity TEXT DEFAULT 'medium',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    environment TEXT,
    browser TEXT,
    os TEXT,
    version TEXT,
    assigned_to TEXT,
    reported_by TEXT,
    screenshot_url TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS test_plans (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    objective TEXT,
    scope TEXT,
    out_of_scope TEXT,
    environment TEXT,
    start_date TEXT,
    end_date TEXT,
    status TEXT DEFAULT 'draft',
    version TEXT,
    created_by TEXT,
    approved_by TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS test_plan_cases (
    test_plan_id TEXT,
    test_case_id TEXT,
    FOREIGN KEY (test_plan_id) REFERENCES test_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (test_case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    PRIMARY KEY (test_plan_id, test_case_id)
  );

  CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    test_plan_id TEXT REFERENCES test_plans(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'in_progress',
    environment TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS test_run_results (
    id TEXT PRIMARY KEY,
    test_run_id TEXT REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id TEXT REFERENCES test_cases(id),
    status TEXT DEFAULT 'untested',
    actual_result TEXT,
    executed_by TEXT,
    executed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_run_id, test_case_id)
  );

  CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT DEFAULT 'javascript',
    framework TEXT,
    code TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS webhook_keys (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id),
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS project_settings (
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    PRIMARY KEY (project_id, setting_key)
  );

  CREATE TRIGGER IF NOT EXISTS update_test_cases_timestamp
    AFTER UPDATE ON test_cases
    BEGIN
      UPDATE test_cases SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
`);

// Migração segura para bancos já existentes
try { db.exec('ALTER TABLE test_cases ADD COLUMN is_global INTEGER DEFAULT 0'); } catch(e) { /* coluna já existe */ }

function migrateFromJSON() {
  const dbJsonPath = path.join(dataDir, 'db.json');
  const usersJsonPath = path.join(dataDir, 'users.json');

  if (fs.existsSync(usersJsonPath)) {
    const users = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    if (count === 0 && users.length > 0) {
      const insert = db.prepare('INSERT INTO users (id, name, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) insert.run(item.id, item.name, item.email, item.password, item.role, item.created_at || new Date().toISOString());
      });
      insertMany(users);
    }
  }

  if (fs.existsSync(dbJsonPath)) {
    const data = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    
    // Test Cases
    let count = db.prepare('SELECT COUNT(*) as c FROM test_cases').get().c;
    if (count === 0 && data.testCases && data.testCases.length > 0) {
      const insert = db.prepare('INSERT INTO test_cases (id, title, description, preconditions, steps, expected_result, actual_result, status, priority, severity, category, assigned_to, environment, version, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          const stepsStr = item.steps ? JSON.stringify(item.steps) : '[]';
          const tagsStr = item.tags ? JSON.stringify(item.tags) : '[]';
          insert.run(item.id, item.title, item.description, item.preconditions, stepsStr, item.expected_result, item.actual_result, item.status||'pending', item.priority||'medium', item.severity||'medium', item.category, item.assigned_to, item.environment, item.version, tagsStr, item.created_at || new Date().toISOString());
        }
      });
      insertMany(data.testCases);
    }

    // Bug Reports
    count = db.prepare('SELECT COUNT(*) as c FROM bug_reports').get().c;
    if (count === 0 && data.bugReports && data.bugReports.length > 0) {
      const insert = db.prepare('INSERT INTO bug_reports (id, title, description, steps_to_reproduce, expected_result, actual_result, severity, priority, status, environment, browser, os, version, assigned_to, reported_by, screenshot_url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          const tagsStr = item.tags ? JSON.stringify(item.tags) : '[]';
          insert.run(item.id, item.title, item.description, item.steps_to_reproduce, item.expected_result, item.actual_result, item.severity||'medium', item.priority||'medium', item.status||'open', item.environment, item.browser, item.os, item.version, item.assigned_to, item.reported_by, item.screenshot_url, tagsStr, item.created_at || new Date().toISOString());
        }
      });
      insertMany(data.bugReports);
    }

    // Scripts
    count = db.prepare('SELECT COUNT(*) as c FROM scripts').get().c;
    if (count === 0 && data.scripts && data.scripts.length > 0) {
      const insert = db.prepare('INSERT INTO scripts (id, title, description, language, framework, code, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          const tagsStr = item.tags ? JSON.stringify(item.tags) : '[]';
          insert.run(item.id, item.title, item.description, item.language||'javascript', item.framework, item.code, tagsStr, item.created_at || new Date().toISOString());
        }
      });
      insertMany(data.scripts);
    }

    // Test Plans
    count = db.prepare('SELECT COUNT(*) as c FROM test_plans').get().c;
    if (count === 0 && data.testPlans && data.testPlans.length > 0) {
      const insertPlan = db.prepare('INSERT INTO test_plans (id, title, description, objective, scope, out_of_scope, environment, start_date, end_date, status, version, created_by, approved_by, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const insertRel = db.prepare('INSERT OR IGNORE INTO test_plan_cases (test_plan_id, test_case_id) VALUES (?, ?)');
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          const tagsStr = item.tags ? JSON.stringify(item.tags) : '[]';
          insertPlan.run(item.id, item.title, item.description, item.objective, item.scope, item.out_of_scope, item.environment, item.startDate, item.endDate, item.status||'draft', item.version, item.created_by, item.approved_by, tagsStr, item.created_at || new Date().toISOString());
          if (item.testCaseIds) {
            for (const tcId of item.testCaseIds) {
              insertRel.run(item.id, tcId);
            }
          }
        }
      });
      insertMany(data.testPlans);
    }
  }
}

function migrateProjects() {
  const count = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
  let defaultProjectId = null;
  
  if (count === 0) {
    defaultProjectId = uuidv4();
    db.prepare('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)').run(defaultProjectId, 'Projeto Principal', 'Projeto base do sistema');
  } else {
    defaultProjectId = db.prepare('SELECT id FROM projects ORDER BY created_at ASC LIMIT 1').get().id;
  }

  const tables = ['test_cases', 'bug_reports', 'test_plans', 'scripts'];
  tables.forEach(table => {
    const cols = db.pragma(`table_info(${table})`);
    if (!cols.some(c => c.name === 'project_id')) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN project_id TEXT REFERENCES projects(id)`);
      db.prepare(`UPDATE ${table} SET project_id = ? WHERE project_id IS NULL`).run(defaultProjectId);
    }
  });
}

try {
  migrateFromJSON();
} catch(e) {
  console.error('Migration error:', e);
}

try {
  migrateProjects();
} catch(e) {
  console.error('Projects Migration error:', e);
}

module.exports = db;
