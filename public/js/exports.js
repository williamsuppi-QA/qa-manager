const Exports = {
  render() {
    UI.setTitle('Exportações');

    document.getElementById('pageContent').innerHTML = `
      <div style="margin-bottom:20px">
        <h2 style="font-size:16px;color:var(--text-secondary);font-weight:500">
          Exporte seus dados nos formatos disponíveis para cada módulo. Você poderá selecionar quais itens quer exportar.
        </h2>
      </div>

      <div class="export-grid">
        <!-- CASOS DE TESTE -->
        <div class="export-card">
          <div class="export-card-icon">✅</div>
          <h3>Casos de Teste</h3>
          <p>Exporte casos de teste cadastrados no sistema.</p>
          <div class="export-format-btns">
            <button class="btn btn-primary btn-sm"   data-res="test-cases" data-fmt="excel">📊 Excel</button>
            <button class="btn btn-secondary btn-sm" data-res="test-cases" data-fmt="pdf">📄 PDF</button>
            <button class="btn btn-secondary btn-sm" data-res="test-cases" data-fmt="csv">📋 CSV</button>
            <button class="btn btn-secondary btn-sm" data-res="test-cases" data-fmt="json">🗂️ JSON</button>
          </div>
        </div>

        <!-- BUG REPORTS -->
        <div class="export-card">
          <div class="export-card-icon">🐛</div>
          <h3>Bug Reports</h3>
          <p>Exporte bug reports registrados no sistema.</p>
          <div class="export-format-btns">
            <button class="btn btn-primary btn-sm"   data-res="bug-reports" data-fmt="excel">📊 Excel</button>
            <button class="btn btn-secondary btn-sm" data-res="bug-reports" data-fmt="pdf">📄 PDF</button>
            <button class="btn btn-secondary btn-sm" data-res="bug-reports" data-fmt="csv">📋 CSV</button>
            <button class="btn btn-secondary btn-sm" data-res="bug-reports" data-fmt="json">🗂️ JSON</button>
          </div>
        </div>

        <!-- PLANOS DE TESTE -->
        <div class="export-card">
          <div class="export-card-icon">📋</div>
          <h3>Planos de Teste</h3>
          <p>Exporte planos de teste cadastrados no sistema.</p>
          <div class="export-format-btns">
            <button class="btn btn-primary btn-sm"   data-res="test-plans" data-fmt="excel">📊 Excel</button>
            <button class="btn btn-secondary btn-sm" data-res="test-plans" data-fmt="csv">📋 CSV</button>
            <button class="btn btn-secondary btn-sm" data-res="test-plans" data-fmt="json">🗂️ JSON</button>
          </div>
        </div>

        <!-- SCRIPTS -->
        <div class="export-card">
          <div class="export-card-icon">⚙️</div>
          <h3>Scripts</h3>
          <p>Exporte scripts de automação cadastrados.</p>
          <div class="export-format-btns">
            <button class="btn btn-primary btn-sm"   data-res="scripts" data-fmt="csv">📋 CSV</button>
            <button class="btn btn-secondary btn-sm" data-res="scripts" data-fmt="json">🗂️ JSON</button>
          </div>
        </div>
      </div>

      <!-- INFO BOX -->
      <div class="card" style="margin-top:24px">
        <div class="card-header">
          <span class="card-title">ℹ️ Sobre os Formatos</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
          ${Exports._infoBox('📊', 'Excel (.xlsx)',
            'Planilha formatada com cores, filtros e colunas organizadas. Ideal para análise e compartilhamento.')}
          ${Exports._infoBox('📄', 'PDF',
            'Relatório visual formatado para impressão ou envio. Inclui cabeçalhos e paginação.')}
          ${Exports._infoBox('📋', 'CSV',
            'Arquivo de texto simples separado por vírgulas. Compatível com qualquer banco de dados.')}
          ${Exports._infoBox('🗂️', 'JSON',
            'Formato estruturado completo. Ideal para integração com outras ferramentas e sistemas.')}
        </div>
      </div>`;

    this._bindEvents();
  },

  _infoBox(icon, title, desc) {
    return `
      <div style="background:var(--bg-primary);border-radius:var(--radius-sm);
                  padding:14px;border:1px solid var(--border)">
        <div style="font-size:24px;margin-bottom:8px">${icon}</div>
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${title}</div>
        <div style="font-size:12px;color:var(--text-muted)">${desc}</div>
      </div>`;
  },

  _bindEvents() {
    document.querySelectorAll('[data-res][data-fmt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = btn.dataset.res;
        const fmt = btn.dataset.fmt;
        this.openSelectionModal(res, fmt, btn);
      });
    });
  },

  async openSelectionModal(resource, format, btn) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Aguarde...';

    try {
      // Fetch all items for this resource
      let items = [];
      if (resource === 'test-cases')  items = await API.getTestCases();
      if (resource === 'bug-reports') items = await API.getBugReports();
      if (resource === 'test-plans')  items = await API.getTestPlans();
      if (resource === 'scripts')     items = await API.getScripts();

      if (!items || items.length === 0) {
        UI.toast('Não há dados disponíveis para exportar.', 'warning');
        return;
      }

      // Build Modal Table
      const mapNames = {
        'test-cases': 'Casos de Teste', 'bug-reports': 'Bug Reports',
        'test-plans': 'Planos de Teste', 'scripts': 'Scripts'
      };

      const tableRows = items.map(item => `
        <tr>
          <td style="text-align:center"><input type="checkbox" class="export-checkbox" value="${item.id}" checked></td>
          <td><strong>${UI.truncate(item.title, 60)}</strong></td>
          <td>${item.status ? UI.badge(item.status) : (item.language || '')}</td>
        </tr>
      `).join('');

      UI.openModal(`Selecione o que deseja exportar (${mapNames[resource]})`, `
        <div style="margin-bottom:12px; color:var(--text-secondary); font-size:13px">
          Selecione os itens abaixo que você deseja incluir no formato <strong>${format.toUpperCase()}</strong>.
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block; margin-bottom:4px; font-weight:500; font-size:13px; color:var(--text-color)">Título do Relatório (opcional)</label>
          <input type="text" id="exportCustomTitle" class="form-control" placeholder="Ex: Relatório Semanal" style="width:100%">
        </div>
        <div class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center"><input type="checkbox" id="exportCheckAll" checked></th>
                <th>Título</th>
                <th>Status / Info</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>`,
        `<button class="btn btn-secondary" id="modalCloseBtn">Cancelar</button>
         <button class="btn btn-primary" id="modalConfirmExportBtn">📥 Exportar Selecionados</button>`
      );

      // Modal Events
      document.getElementById('modalCloseBtn').addEventListener('click', () => UI.closeModal());
      
      const checkAll = document.getElementById('exportCheckAll');
      const checkboxes = document.querySelectorAll('.export-checkbox');

      checkAll.addEventListener('change', (e) => {
        checkboxes.forEach(cb => cb.checked = e.target.checked);
      });

      document.getElementById('modalConfirmExportBtn').addEventListener('click', () => {
        const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (selectedIds.length === 0) {
          UI.toast('Selecione ao menos um item para exportar.', 'warning');
          return;
        }
        const customTitle = document.getElementById('exportCustomTitle').value.trim();
        UI.closeModal();
        this._download(resource, format, selectedIds, customTitle);
      });

    } catch (err) {
      UI.toast('Erro ao buscar dados: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  },

  async _download(resource, format, ids = [], customTitle = '') {
    UI.toast(`Preparando exportação...`, 'info', 2000);

    try {
      const url = API.exportUrl(resource, format, ids, customTitle);
      const res = await apiFetch(url);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao gerar arquivo' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const ext  = { excel: 'xlsx', pdf: 'pdf', csv: 'csv', json: 'json' }[format] || format;
      const name = `${resource}-${new Date().toISOString().slice(0,10)}.${ext}`;

      const link = document.createElement('a');
      link.href  = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);

      UI.toast(`Arquivo ${name} gerado com sucesso!`, 'success');
    } catch (err) {
      UI.toast('Erro ao exportar: ' + err.message, 'error');
    }
  }
};