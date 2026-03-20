const Traceability = {
  async render() {
    UI.setTitle('Matriz de Rastreabilidade');
    UI.loading();
    try {
      const plans = await API.getTestPlans();
      this._renderSelector(plans);
    } catch (err) {
      UI.toast('Erro: ' + err.message, 'error');
    }
  },

  _renderSelector(plans) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-top:0;">📊 Selecione o Plano de Teste para Rastrear</h3>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:15px;">
          A Matriz cruza todos os Casos vinculados ao Plano com as Execuções realizadas, provando a cobertura de testes da sua Release.
        </p>
        <div style="display:flex; gap:12px; align-items:center;">
          <select id="tracePlan" class="form-control" style="flex:1; padding:10px;">
            <option value="">-- Selecione um Plano --</option>
            ${plans.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
          </select>
          <button class="btn btn-primary" id="btnLoadTrace">Gerar Matriz</button>
        </div>
      </div>
      <div id="traceResult"></div>`;

    document.getElementById('btnLoadTrace')?.addEventListener('click', () => {
      const planId = document.getElementById('tracePlan').value;
      if (!planId) return UI.toast('Selecione um Plano de Teste', 'warning');
      this.loadMatrix(planId);
    });
  },

  async loadMatrix(planId) {
    const container = document.getElementById('traceResult');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div> Carregando Matriz...</div>';
    
    try {
      const data = await API.getTraceability(planId);
      this._renderMatrix(data, container);
    } catch(e) {
      container.innerHTML = '';
      UI.toast(e.message, 'error');
    }
  },

  _renderMatrix(data, container) {
    const { plan, runs, matrix, metrics } = data;
    const total = metrics.total;
    const coverage = total > 0 ? Math.round(((metrics.passed + metrics.failed + metrics.blocked) / total) * 100) : 0;
    const passRate = total > 0 ? Math.round((metrics.passed / total) * 100) : 0;

    const statusIcon = (s) => {
      if (s === 'passed') return '<span style="color:#4CAF50;" title="Passou">✅</span>';
      if (s === 'failed') return '<span style="color:#F44336;" title="Falhou">❌</span>';
      if (s === 'blocked' || s === 'skipped') return '<span style="color:#FF9800;" title="Bloqueado/Pulado">🚫</span>';
      if (s === 'not_included') return '<span style="color:#ccc;" title="Não incluído">—</span>';
      return '<span style="color:#9E9E9E;" title="Pendente">⏳</span>';
    };

    let matrixRows = '';
    matrix.forEach(row => {
      matrixRows += `<tr>
        <td style="font-weight:600; max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${row.case_title}">${row.case_title}</td>
        <td>${UI.badge(row.priority)}</td>
        <td>${UI.badge(row.severity)}</td>
        ${row.runs.map(r => `<td style="text-align:center;">${statusIcon(r.status)}</td>`).join('')}
      </tr>`;
    });

    container.innerHTML = `
      <div style="display:flex; gap:15px; margin-bottom:20px;">
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon blue">📋</div>
          <div class="stat-info"><div class="stat-value">${total}</div><div class="stat-label">Casos no Plano</div></div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon green">✅</div>
          <div class="stat-info"><div class="stat-value">${metrics.passed}</div><div class="stat-label">Aprovados</div></div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon red">❌</div>
          <div class="stat-info"><div class="stat-value">${metrics.failed}</div><div class="stat-label">Reprovados</div></div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon orange">📈</div>
          <div class="stat-info"><div class="stat-value">${coverage}%</div><div class="stat-label">Cobertura</div></div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-icon purple">🏆</div>
          <div class="stat-info"><div class="stat-value">${passRate}%</div><div class="stat-label">Taxa Aprovação</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="card-header">
          <span class="card-title">Matriz: ${plan.title}</span>
          <button class="btn btn-primary" id="btnExportCert">📄 Exportar Certificado PDF</button>
        </div>
        ${matrix.length === 0
          ? UI.emptyState('📊', 'Nenhum caso vinculado a esse plano', 'Vincule casos de teste ao plano para gerar a rastreabilidade.')
          : `<div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Caso de Teste</th>
                    <th>Prioridade</th>
                    <th>Severidade</th>
                    ${runs.map(r => `<th style="text-align:center; max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.title}">${r.title.substring(0,15)}${r.title.length > 15 ? '...' : ''}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${matrixRows}
                </tbody>
              </table>
            </div>`}
      </div>
      
      <div class="card" style="font-size:13px; color:var(--text-muted);">
        <strong>Legenda:</strong> ✅ Passou &nbsp; ❌ Falhou &nbsp; 🚫 Bloqueado/Pulado &nbsp; ⏳ Pendente &nbsp; — Não incluído nessa execução
      </div>`;

    document.getElementById('btnExportCert')?.addEventListener('click', () => this._exportPDF(data));
  },

  _exportPDF(data) {
    const { plan, runs, matrix, metrics } = data;
    const total = metrics.total;
    const coverage = total > 0 ? Math.round(((metrics.passed + metrics.failed + metrics.blocked) / total) * 100) : 0;
    const passRate = total > 0 ? Math.round((metrics.passed / total) * 100) : 0;
    const now = new Date().toLocaleString('pt-BR');

    const statusText = (s) => {
      if (s === 'passed') return '✅ OK';
      if (s === 'failed') return '❌ FALHA';
      if (s === 'blocked' || s === 'skipped') return '🚫 BLOQ';
      if (s === 'not_included') return '—';
      return '⏳';
    };

    let tableRows = '';
    matrix.forEach((row, i) => {
      const lastStatus = row.runs.length > 0 ? row.runs[0].status : 'untested';
      const bgColor = i % 2 === 0 ? '#fff' : '#f8f9fa';
      tableRows += `<tr style="background:${bgColor};">
        <td style="padding:8px 12px; border:1px solid #ddd; font-weight:500;">${row.case_title}</td>
        <td style="padding:8px 12px; border:1px solid #ddd; text-align:center;">${row.priority?.toUpperCase() || '—'}</td>
        <td style="padding:8px 12px; border:1px solid #ddd; text-align:center;">${row.severity?.toUpperCase() || '—'}</td>
        <td style="padding:8px 12px; border:1px solid #ddd; text-align:center; font-weight:bold;">${statusText(lastStatus)}</td>
      </tr>`;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Certificado de Release - ${plan.title}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color:#1a1a2e; padding:40px; }
          .header { text-align:center; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #2980b9; }
          .header h1 { font-size:28px; color:#2980b9; margin-bottom:5px; }
          .header h2 { font-size:16px; color:#555; font-weight:400; }
          .header p { font-size:12px; color:#888; margin-top:8px; }
          .metrics { display:flex; gap:15px; margin-bottom:25px; }
          .metric-box { flex:1; text-align:center; padding:15px; border-radius:8px; border:1px solid #e0e0e0; }
          .metric-box .value { font-size:28px; font-weight:800; }
          .metric-box .label { font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }
          .metric-blue .value { color:#2980b9; }
          .metric-green .value { color:#27ae60; }
          .metric-red .value { color:#e74c3c; }
          .metric-orange .value { color:#f39c12; }
          .metric-purple .value { color:#8e44ad; }
          table { width:100%; border-collapse:collapse; margin-bottom:25px; font-size:13px; }
          table th { background:#2980b9; color:#fff; padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
          .footer { text-align:center; padding-top:20px; border-top:2px solid #e0e0e0; font-size:11px; color:#888; }
          .seal { display:inline-block; padding:8px 25px; border:2px solid ${passRate >= 80 ? '#27ae60' : '#e74c3c'}; border-radius:8px; color:${passRate >= 80 ? '#27ae60' : '#e74c3c'}; font-weight:700; font-size:14px; margin-top:10px; }
          @media print { body { padding:20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Certificado de Release</h1>
          <h2>${plan.title}</h2>
          <p>Gerado em ${now} pelo QA Manager</p>
        </div>
        
        <div class="metrics">
          <div class="metric-box metric-blue"><div class="value">${total}</div><div class="label">Casos Totais</div></div>
          <div class="metric-box metric-green"><div class="value">${metrics.passed}</div><div class="label">Aprovados</div></div>
          <div class="metric-box metric-red"><div class="value">${metrics.failed}</div><div class="label">Reprovados</div></div>
          <div class="metric-box metric-orange"><div class="value">${coverage}%</div><div class="label">Cobertura</div></div>
          <div class="metric-box metric-purple"><div class="value">${passRate}%</div><div class="label">Aprovação</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Caso de Teste</th>
              <th style="text-align:center;">Prioridade</th>
              <th style="text-align:center;">Severidade</th>
              <th style="text-align:center;">Último Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          <p>Execuções realizadas: ${runs.length} | Última execução: ${runs.length > 0 ? new Date(runs[0].created_at).toLocaleString('pt-BR') : 'N/A'}</p>
          <div class="seal">${passRate >= 80 ? '✅ RELEASE APROVADA' : '⚠️ RELEASE COM PENDÊNCIAS'}</div>
          <p style="margin-top:12px;">QA Manager - Plataforma de Gestão de Qualidade de Software</p>
        </div>
      </body>
      </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
};
