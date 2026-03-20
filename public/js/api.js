// ── API COM TOKEN JWT ────────────────────────────────────────────
function apiFetch(url, options = {}) {
  const token = localStorage.getItem('qa_token');
  const projectId = localStorage.getItem('projectId');
  const headers = {
    'Content-Type': 'application/json',
    ...(projectId ? { 'x-project-id': projectId } : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers }).then(res => {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('qa_token');
      localStorage.removeItem('qa_user');
      window.location.href = '/login.html';
      return null;
    }
    return res;
  });
}

const API = {
  get:    (url)          => apiFetch(url).then(res => res ? res.json() : null),
  post:   (url, body)    => apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }).then(res => res ? res.json() : null),
  put:    (url, body)    => apiFetch(url, { method: 'PUT',    body: JSON.stringify(body) }).then(res => res ? res.json() : null),
  delete: (url)          => apiFetch(url, { method: 'DELETE' }).then(res => res ? res.json() : null),

  // PROJECTS
  getProjects: () => API.get('/api/projects'),
  createProject: (payload) => API.post('/api/projects', payload),
  getProjectSetting: (projectId, key) => API.get(`/api/projects/${projectId}/settings/${key}`),
  setProjectSetting: (projectId, key, value) => API.put(`/api/projects/${projectId}/settings/${key}`, { value }),

  // UPLOADS
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('qa_token');
    const projectId = localStorage.getItem('projectId');
    const headers = {
      ...(projectId ? { 'x-project-id': projectId } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    
    return fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData
    }).then(res => res.json());
  },

  // DASHBOARD
  getDashboard: () => API.get('/api/dashboard'),

  // TEST CASES
  getTestCases: (filters) => {
    const params = new URLSearchParams(filters || {}).toString();
    return API.get(`/api/test-cases?${params}`);
  },
  getTestCase:    (id)      => API.get(`/api/test-cases/${id}`),
  createTestCase: (payload) => API.post('/api/test-cases', payload),
  updateTestCase: (id, payload) => API.put(`/api/test-cases/${id}`, payload),
  deleteTestCase: (id)      => API.delete(`/api/test-cases/${id}`),

  // BUG REPORTS
  getBugReports: (filters) => {
    const params = new URLSearchParams(filters || {}).toString();
    return API.get(`/api/bug-reports?${params}`);
  },
  getBugReport:    (id)      => API.get(`/api/bug-reports/${id}`),
  createBugReport: (payload) => API.post('/api/bug-reports', payload),
  updateBugReport: (id, payload) => API.put(`/api/bug-reports/${id}`, payload),
  deleteBugReport: (id)      => API.delete(`/api/bug-reports/${id}`),
  syncJira:        (id)      => API.post(`/api/bug-reports/${id}/jira-sync`, {}),

  // TEST PLANS
  getTestPlans: (filters) => {
    const params = new URLSearchParams(filters || {}).toString();
    return API.get(`/api/test-plans?${params}`);
  },
  getTestPlan:    (id)      => API.get(`/api/test-plans/${id}`),
  createTestPlan: (payload) => API.post('/api/test-plans', payload),
  updateTestPlan: (id, payload) => API.put(`/api/test-plans/${id}`, payload),
  deleteTestPlan: (id)      => API.delete(`/api/test-plans/${id}`),

  // TEST RUNS (Execuções)
  getTestRuns:    ()        => API.get(`/api/test-runs`),
  getTestRun:     (id)      => API.get(`/api/test-runs/${id}`),
  createTestRun:  (payload) => API.post('/api/test-runs', payload),
  deleteTestRun:  (id)      => API.delete(`/api/test-runs/${id}`),
  updateTestRunResult: (runId, tcId, payload) => API.put(`/api/test-runs/${runId}/results/${tcId}`, payload),

  // WEBHOOKS
  getWebhooks:    ()        => API.get(`/api/webhooks`),
  createWebhook:  (payload) => API.post('/api/webhooks', payload),
  deleteWebhook:  (id)      => API.delete(`/api/webhooks/${id}`),

  // TRACEABILITY
  getTraceability: (planId) => API.get(`/api/traceability/${planId}`),

  // ACTIVITY
  getActivity: () => API.get('/api/activity'),

  // LIBRARY
  getLibrary:       ()        => API.get('/api/library'),
  toggleGlobal:     (id)      => API.put(`/api/test-cases/${id}/toggle-global`, {}),
  cloneFromLibrary: (caseIds) => API.post('/api/library/clone', { case_ids: caseIds }),

  // SCRIPTS
  getScripts: (filters) => {
    const params = new URLSearchParams(filters || {}).toString();
    return API.get(`/api/scripts?${params}`);
  },
  getScript:    (id)      => API.get(`/api/scripts/${id}`),
  createScript: (payload) => API.post('/api/scripts', payload),
  updateScript: (id, payload) => API.put(`/api/scripts/${id}`, payload),
  deleteScript: (id)      => API.delete(`/api/scripts/${id}`),

  // EXPORTS
  exportUrl: (resource, format, ids = [], customTitle = '') => {
    let url = `/api/exports/${resource}/${format}`;
    const params = new URLSearchParams();
    if (ids && ids.length > 0) {
      params.append('ids', ids.join(','));
    }
    if (customTitle) {
      params.append('title', customTitle);
    }
    const projectId = localStorage.getItem('projectId');
    if (projectId) {
      params.append('project_id', projectId);
    }
    const qString = params.toString();
    if (qString) {
      url += `?${qString}`;
    }
    return url;
  }
};