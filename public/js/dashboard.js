const Dashboard = {
  async render() {
    UI.setTitle('Dashboard');
    UI.loading();
    try {
      const data = await API.getDashboard();
      this._renderPage(data);
      this._initCharts(data);
      this._loadActivity();
    } catch (err) {
      UI.toast('Erro ao carregar dashboard: ' + err.message, 'error');
    }
  },

  _renderPage(data) {
    const tc   = data.testCases;
    const bugs = data.bugs;

    const passRate = tc.total > 0
      ? Math.round((tc.passed / tc.total) * 100) : 0;
    const resolveRate = bugs.total > 0
      ? Math.round((bugs.resolved / bugs.total) * 100) : 0;

    document.getElementById('pageContent').innerHTML = `
      <!-- STAT CARDS (Clicáveis) -->
      <div class="stats-grid">
        <div class="stat-card clickable" data-nav="test-cases">
          <div class="stat-icon blue">✅</div>
          <div class="stat-info">
            <div class="stat-value">${tc.total}</div>
            <div class="stat-label">Casos de Teste</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="test-cases">
          <div class="stat-icon green">✔️</div>
          <div class="stat-info">
            <div class="stat-value">${tc.passed}</div>
            <div class="stat-label">Aprovados</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="test-cases">
          <div class="stat-icon red">❌</div>
          <div class="stat-info">
            <div class="stat-value">${tc.failed}</div>
            <div class="stat-label">Reprovados</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="bug-reports">
          <div class="stat-icon orange">🐛</div>
          <div class="stat-info">
            <div class="stat-value">${bugs.total}</div>
            <div class="stat-label">Bug Reports</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="bug-reports">
          <div class="stat-icon red">🔴</div>
          <div class="stat-info">
            <div class="stat-value">${bugs.open}</div>
            <div class="stat-label">Bugs Abertos</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="bug-reports">
          <div class="stat-icon purple">⚠️</div>
          <div class="stat-info">
            <div class="stat-value">${bugs.critical}</div>
            <div class="stat-label">Bugs Críticos</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="test-plans">
          <div class="stat-icon blue">📋</div>
          <div class="stat-info">
            <div class="stat-value">${data.plans.total}</div>
            <div class="stat-label">Planos de Teste</div>
          </div>
        </div>
        <div class="stat-card clickable" data-nav="scripts">
          <div class="stat-icon green">⚙️</div>
          <div class="stat-info">
            <div class="stat-value">${data.scripts.total}</div>
            <div class="stat-label">Scripts</div>
          </div>
        </div>
      </div>

      <!-- CHARTS + ACTIVITY -->
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-bottom:20px;">
        <div class="card" style="display:flex; flex-direction:column; align-items:center;">
          <div class="card-header" style="width:100%">
            <span class="card-title">📊 Casos de Teste</span>
          </div>
          <div style="width: 200px; height: 200px; margin: 12px 0;">
            <canvas id="tcChart"></canvas>
          </div>
          <div style="width:100%; display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
            ${this._pill('Aprovados',  tc.passed,  'var(--success)')}
            ${this._pill('Reprovados', tc.failed,  'var(--danger)')}
            ${this._pill('Pendentes',  tc.pending, 'var(--warning)')}
            ${this._pill('Bloqueados', tc.blocked, 'var(--purple)')}
          </div>
        </div>

        <div class="card" style="display:flex; flex-direction:column; align-items:center;">
          <div class="card-header" style="width:100%">
            <span class="card-title">🐛 Bugs</span>
          </div>
          <div style="width: 200px; height: 200px; margin: 12px 0;">
            <canvas id="bugsChart"></canvas>
          </div>
          <div style="width:100%; display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
            ${this._pill('Abertos',       bugs.open,       'var(--danger)')}
            ${this._pill('Em Andamento',  bugs.inProgress, 'var(--warning)')}
            ${this._pill('Resolvidos',    bugs.resolved,   'var(--success)')}
            ${this._pill('Críticos',      bugs.critical,   'var(--purple)')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">⚡ Atividade Recente</span>
          </div>
          <div id="activityFeed" class="activity-feed">
            <div class="loading-state" style="padding:20px;"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- PROGRESS + RECENT -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🕐 Bugs Recentes</span>
            <button class="btn btn-secondary btn-sm" id="goToBugs">Ver todos</button>
          </div>
          ${data.recentBugs.length === 0
            ? UI.emptyState('🐛', 'Nenhum bug registrado')
            : `<div class="recent-list">
                ${data.recentBugs.map(b => `
                  <div class="recent-item">
                    <span class="recent-item-title">${UI.truncate(b.title, 38)}</span>
                    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
                      ${UI.badge(b.severity)}
                      ${UI.badge(b.status)}
                    </div>
                  </div>`).join('')}
              </div>`}
        </div>

        <div class="card">
          <div class="card-header">
            <span class="card-title">🕐 Casos de Teste Recentes</span>
            <button class="btn btn-secondary btn-sm" id="goToTC">Ver todos</button>
          </div>
          ${data.recentTestCases.length === 0
            ? UI.emptyState('✅', 'Nenhum caso de teste registrado')
            : `<div class="recent-list">
                ${data.recentTestCases.map(tc => `
                  <div class="recent-item">
                    <span class="recent-item-title">${UI.truncate(tc.title, 38)}</span>
                    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
                      ${UI.badge(tc.priority)}
                      ${UI.badge(tc.status)}
                    </div>
                  </div>`).join('')}
              </div>`}
        </div>
      </div>`;

    // Stat cards clicáveis
    document.querySelectorAll('.stat-card.clickable').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.dataset.nav;
        if (target) App.navigate(target);
      });
    });

    document.getElementById('goToBugs')?.addEventListener('click',
      () => App.navigate('bug-reports'));
    document.getElementById('goToTC')?.addEventListener('click',
      () => App.navigate('test-cases'));
  },

  async _loadActivity() {
    try {
      const events = await API.getActivity();
      const container = document.getElementById('activityFeed');
      if (!container) return;

      if (events.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:20px;"><p style="font-size:12px;">Nenhuma atividade ainda</p></div>';
        return;
      }

      container.innerHTML = events.map(ev => {
        const ago = this._timeAgo(ev.time);
        return `<div class="activity-item">
          <span class="activity-icon">${ev.icon}</span>
          <span class="activity-text">${UI.truncate(ev.text, 42)}</span>
          <span class="activity-time">${ago}</span>
        </div>`;
      }).join('');
    } catch(e) {
      const c = document.getElementById('activityFeed');
      if (c) c.innerHTML = '<p style="font-size:12px; color:var(--text-muted); padding:10px;">Erro ao carregar</p>';
    }
  },

  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora';
    if (mins < 60) return mins + ' min';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h';
    const days = Math.floor(hours / 24);
    return days + 'd';
  },

  _pill(label, value, color) {
    return `
      <div style="flex:1;min-width:60px;background:var(--bg-primary);border-radius:var(--radius-sm);
                  padding:6px;border:1px solid var(--border);text-align:center">
        <div style="font-size:16px;font-weight:800;color:${color}">${value}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${label}</div>
      </div>`;
  },

  _initCharts(data) {
    if (typeof Chart === 'undefined') return;

    const colors = {
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
      purple: '#8B5CF6',
    };

    Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";

    const ctxTC = document.getElementById('tcChart');
    if (ctxTC) {
      new Chart(ctxTC, {
        type: 'doughnut',
        data: {
          labels: ['Aprovados', 'Reprovados', 'Pendentes', 'Bloqueados'],
          datasets: [{
            data: [data.testCases.passed, data.testCases.failed, data.testCases.pending, data.testCases.blocked],
            backgroundColor: [colors.success, colors.danger, colors.warning, colors.purple],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '72%'
        }
      });
    }

    const ctxBugs = document.getElementById('bugsChart');
    if (ctxBugs) {
      new Chart(ctxBugs, {
        type: 'doughnut',
        data: {
          labels: ['Abertos', 'Em Andamento', 'Resolvidos', 'Críticos'],
          datasets: [{
            data: [data.bugs.open, data.bugs.inProgress, data.bugs.resolved, data.bugs.critical],
            backgroundColor: [colors.danger, colors.warning, colors.success, colors.purple],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '72%'
        }
      });
    }
  }
};