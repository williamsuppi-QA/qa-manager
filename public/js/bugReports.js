const BugReports = {
  filters: { status: '', severity: '', priority: '', search: '' },

  async render() {
    UI.setTitle('Bug Reports');
    UI.loading();
    try {
      const data = await API.getBugReports(this.filters);
      this._renderPage(data);
    } catch (err) {
      UI.toast('Erro ao carregar bug reports: ' + err.message, 'error');
    }
  },

  _renderPage(data) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="btn-group" style="margin-bottom:16px">
        <button class="btn btn-primary" id="btnNewBug">+ Novo Bug Report</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="bugSearch" placeholder="Buscar por título, descrição..." value="${this.filters.search}" style="flex:1;min-width:200px" />
        <select id="bugStatus">
          <option value="">Todos os Status</option>
          <option value="open"        ${this.filters.status==='open'       ?'selected':''}>Aberto</option>
          <option value="in_progress" ${this.filters.status==='in_progress'?'selected':''}>Em Andamento</option>
          <option value="resolved"    ${this.filters.status==='resolved'   ?'selected':''}>Resolvido</option>
          <option value="closed"      ${this.filters.status==='closed'     ?'selected':''}>Fechado</option>
        </select>
        <select id="bugSeverity">
          <option value="">Todas as Severidades</option>
          <option value="low"      ${this.filters.severity==='low'     ?'selected':''}>Baixa</option>
          <option value="medium"   ${this.filters.severity==='medium'  ?'selected':''}>Média</option>
          <option value="high"     ${this.filters.severity==='high'    ?'selected':''}>Alta</option>
          <option value="critical" ${this.filters.severity==='critical'?'selected':''}>Crítica</option>
        </select>
        <select id="bugPriority">
          <option value="">Todas as Prioridades</option>
          <option value="low"    ${this.filters.priority==='low'   ?'selected':''}>Baixa</option>
          <option value="medium" ${this.filters.priority==='medium'?'selected':''}>Média</option>
          <option value="high"   ${this.filters.priority==='high'  ?'selected':''}>Alta</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="bugFilter">🔍 Filtrar</button>
        <button class="btn btn-secondary btn-sm" id="bugClear">✕ Limpar</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Bug Reports <span style="color:var(--text-muted);font-weight:400">(${data.length})</span></span>
        </div>
        ${data.length === 0
          ? UI.emptyState('🐛', 'Nenhum bug report encontrado', 'Clique em "+ Novo Bug Report" para começar')
          : `<div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Severidade</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Ambiente</th>
                    <th>Responsável</th>
                    <th>Reportado por</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(b => `
                    <tr class="row-${b.status}">
                      <td><strong>${UI.truncate(b.title, 40)}</strong></td>
                      <td>${UI.badge(b.severity)}</td>
                      <td>${UI.badge(b.priority)}</td>
                      <td>${UI.badge(b.status)}</td>
                      <td>${b.environment || '—'}</td>
                      <td>${b.assigned_to || '—'}</td>
                      <td>${b.reported_by || '—'}</td>
                      <td>${UI.date(b.created_at)}</td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-secondary btn-sm btn-view-bug" data-id="${b.id}" title="Visualizar">👁️</button>
                          <button class="btn btn-secondary btn-sm btn-edit-bug" data-id="${b.id}" title="Editar">✏️</button>
                          <button class="btn btn-danger    btn-sm btn-del-bug"  data-id="${b.id}" title="Excluir">🗑️</button>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
      </div>`;

    this._bindEvents();
  },

  _bindEvents() {
    document.getElementById('btnNewBug')?.addEventListener('click', () => this.openForm());
    document.getElementById('bugFilter')?.addEventListener('click', () => {
      this.filters.search   = document.getElementById('bugSearch').value.trim();
      this.filters.status   = document.getElementById('bugStatus').value;
      this.filters.severity = document.getElementById('bugSeverity').value;
      this.filters.priority = document.getElementById('bugPriority').value;
      this.render();
    });
    document.getElementById('bugClear')?.addEventListener('click', () => {
      this.filters = { status: '', severity: '', priority: '', search: '' };
      this.render();
    });
    document.getElementById('bugSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('bugFilter').click();
    });

    document.querySelectorAll('.btn-view-bug').forEach(b =>
      b.addEventListener('click', () => this.viewDetail(b.dataset.id)));
    document.querySelectorAll('.btn-edit-bug').forEach(b =>
      b.addEventListener('click', () => this.openForm(b.dataset.id)));
    document.querySelectorAll('.btn-del-bug').forEach(b =>
      b.addEventListener('click', () => this.delete(b.dataset.id)));
  },

  async viewDetail(id) {
    try {
      const b = await API.getBugReport(id);
      const steps = Array.isArray(b.steps_to_reproduce) ? b.steps_to_reproduce : [];
      const tags  = Array.isArray(b.tags) ? b.tags : [];

      UI.openModal(`🐛 ${b.title}`, `
        <div class="detail-grid">
          <div class="detail-item"><label>Severidade</label><p>${UI.badge(b.severity)}</p></div>
          <div class="detail-item"><label>Prioridade</label><p>${UI.badge(b.priority)}</p></div>
          <div class="detail-item"><label>Status</label><p>${UI.badge(b.status)}</p></div>
          <div class="detail-item"><label>Ambiente</label><p>${b.environment || '—'}</p></div>
          <div class="detail-item"><label>Browser</label><p>${b.browser || '—'}</p></div>
          <div class="detail-item"><label>Sistema Operacional</label><p>${b.os || '—'}</p></div>
          <div class="detail-item"><label>Versão</label><p>${b.version || '—'}</p></div>
          <div class="detail-item"><label>Responsável</label><p>${b.assigned_to || '—'}</p></div>
          <div class="detail-item"><label>Reportado por</label><p>${b.reported_by || '—'}</p></div>
          <div class="detail-item"><label>Criado em</label><p>${UI.date(b.created_at)}</p></div>
          ${b.description ? `<div class="detail-item full"><label>Descrição</label><p>${b.description}</p></div>` : ''}
          ${steps.length > 0 ? `
            <div class="detail-item full">
              <label>Passos para Reproduzir</label>
              <ul class="steps-list">
                ${steps.map((s, i) => `<li><span class="step-n">${i+1}</span><span>${s}</span></li>`).join('')}
              </ul>
            </div>` : ''}
          ${b.expected_result ? `<div class="detail-item full"><label>Resultado Esperado</label><p style="color:var(--success)">${b.expected_result}</p></div>` : ''}
          ${b.actual_result   ? `<div class="detail-item full"><label>Resultado Atual</label><p style="color:var(--danger)">${b.actual_result}</p></div>` : ''}
          ${b.screenshot_url  ? `<div class="detail-item full"><label>Screenshot</label><p><a href="${b.screenshot_url}" target="_blank">${b.screenshot_url}</a></p></div>` : ''}
          ${tags.length > 0   ? `<div class="detail-item full"><label>Tags</label><p>${UI.tags(tags)}</p></div>` : ''}
        </div>`,
        `<button class="btn btn-secondary" id="modalCloseBtn">Fechar</button>
         <button class="btn btn-primary"   id="modalEditBtn">✏️ Editar</button>
         <button class="btn btn-primary"   id="modalJiraBtn" data-id="${b.id}" style="background:#0052cc;">🚀 Enviar p/ Jira</button>`
      );

      document.getElementById('modalCloseBtn').addEventListener('click', () => UI.closeModal());
      document.getElementById('modalEditBtn').addEventListener('click', () => {
        UI.closeModal();
        this.openForm(id);
      });
      document.getElementById('modalJiraBtn')?.addEventListener('click', async (e) => {
        const bugId = e.target.dataset.id;
        UI.toast('Sincronizando com a Atlassian...', 'info');
        try {
          const res = await API.syncJira(bugId);
          UI.toast('Bug clonado no Jira com sucesso! Ticket: ' + res.key, 'success');
          if (res.url) window.open(res.url, '_blank');
        } catch(err) {
          UI.toast(err.message, 'error');
        }
      });
    } catch (err) {
      UI.toast('Erro ao carregar detalhes: ' + err.message, 'error');
    }
  },

  async openForm(id = null) {
    let b = {};
    if (id) {
      try { b = await API.getBugReport(id); }
      catch (err) { UI.toast('Erro ao carregar dados: ' + err.message, 'error'); return; }
    }

    UI.openModal(id ? '✏️ Editar Bug Report' : '➕ Novo Bug Report', `
      <form id="bugForm" class="form-grid">
        <div class="form-group full">
          <label>Título *</label>
          <input type="text" id="bugTitle" value="${b.title || ''}" placeholder="Título do bug" required />
        </div>
        <div class="form-group full">
          <label>Descrição</label>
          <textarea id="bugDesc" placeholder="Descreva o bug encontrado...">${b.description || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Passos para Reproduzir</label>
          ${UI.buildStepsInput(b.steps_to_reproduce || [])}
        </div>
        <div class="form-group full">
          <label>Resultado Esperado</label>
          <textarea id="bugExpected" placeholder="O que deveria acontecer...">${b.expected_result || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Resultado Atual</label>
          <textarea id="bugActual" placeholder="O que realmente aconteceu...">${b.actual_result || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Severidade</label>
          <select id="bugFormSeverity">
            <option value="low"      ${b.severity==='low'     ?'selected':''}>Baixa</option>
            <option value="medium"   ${b.severity==='medium'  ?'selected':''}>Média</option>
            <option value="high"     ${b.severity==='high'    ?'selected':''}>Alta</option>
            <option value="critical" ${b.severity==='critical'?'selected':''}>Crítica</option>
          </select>
        </div>
        <div class="form-group">
          <label>Prioridade</label>
          <select id="bugFormPriority">
            <option value="low"    ${b.priority==='low'   ?'selected':''}>Baixa</option>
            <option value="medium" ${b.priority==='medium'?'selected':''}>Média</option>
            <option value="high"   ${b.priority==='high'  ?'selected':''}>Alta</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="bugFormStatus">
            <option value="open"        ${b.status==='open'       ?'selected':''}>Aberto</option>
            <option value="in_progress" ${b.status==='in_progress'?'selected':''}>Em Andamento</option>
            <option value="resolved"    ${b.status==='resolved'   ?'selected':''}>Resolvido</option>
            <option value="closed"      ${b.status==='closed'     ?'selected':''}>Fechado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Ambiente</label>
          <input type="text" id="bugEnv" value="${b.environment || ''}" placeholder="Ex: Staging, Produção..." />
        </div>
        <div class="form-group">
          <label>Browser</label>
          <input type="text" id="bugBrowser" value="${b.browser || ''}" placeholder="Ex: Chrome 120, Firefox 121..." />
        </div>
        <div class="form-group">
          <label>Sistema Operacional</label>
          <input type="text" id="bugOs" value="${b.os || ''}" placeholder="Ex: Windows 11, macOS 14..." />
        </div>
        <div class="form-group">
          <label>Versão</label>
          <input type="text" id="bugVersion" value="${b.version || ''}" placeholder="Ex: 2.1.0" />
        </div>
        <div class="form-group">
          <label>Responsável</label>
          <input type="text" id="bugAssigned" value="${b.assigned_to || ''}" placeholder="Nome do responsável" />
        </div>
        <div class="form-group">
          <label>Reportado por</label>
          <input type="text" id="bugReported" value="${b.reported_by || ''}" placeholder="Nome de quem reportou" />
        </div>
        <div class="form-group full">
          <label>Evidência (Imagem / Screenshot)</label>
          <div style="display:flex; gap:10px;">
            <input type="text" id="bugScreenshot" value="${b.screenshot_url || ''}" placeholder="URL ou faça Upload 👉" style="flex:1" autocomplete="off" />
            <input type="file" id="bugScreenshotFile" accept="image/*,video/*" style="display:none" />
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('bugScreenshotFile').click()">📤 Upload</button>
          </div>
        </div>
        <div class="form-group full">
          <label>Tags (separadas por vírgula)</label>
          <input type="text" id="bugTags" value="${Array.isArray(b.tags) ? b.tags.join(', ') : ''}" placeholder="Ex: ui, api, regressão" />
        </div>
      </form>`,
      `<button class="btn btn-secondary" id="bugFormCancel">Cancelar</button>
       <button class="btn btn-primary"   id="bugFormSave">💾 Salvar</button>`
    );

    UI.initStepsInput();
    document.getElementById('bugFormCancel').addEventListener('click', () => UI.closeModal());
    document.getElementById('bugFormSave').addEventListener('click', () => this._save(id));

    const fileInput = document.getElementById('bugScreenshotFile');
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        UI.toast('Enviando arquivo...', 'info');
        try {
          const res = await API.uploadFile(file);
          if (res.error) throw new Error(res.error);
          document.getElementById('bugScreenshot').value = res.url;
          UI.toast('Upload concluído!', 'success');
        } catch (err) {
          UI.toast('Falha no upload: ' + err.message, 'error');
        }
      });
    }
  },

  async _save(id) {
    const title = document.getElementById('bugTitle').value.trim();
    if (!title) { UI.toast('Título é obrigatório', 'warning'); return; }

    const tagsRaw = document.getElementById('bugTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = {
      title,
      description:        document.getElementById('bugDesc').value.trim(),
      steps_to_reproduce: UI.getSteps(),
      expected_result:    document.getElementById('bugExpected').value.trim(),
      actual_result:      document.getElementById('bugActual').value.trim(),
      severity:           document.getElementById('bugFormSeverity').value,
      priority:           document.getElementById('bugFormPriority').value,
      status:             document.getElementById('bugFormStatus').value,
      environment:        document.getElementById('bugEnv').value.trim(),
      browser:            document.getElementById('bugBrowser').value.trim(),
      os:                 document.getElementById('bugOs').value.trim(),
      version:            document.getElementById('bugVersion').value.trim(),
      assigned_to:        document.getElementById('bugAssigned').value.trim(),
      reported_by:        document.getElementById('bugReported').value.trim(),
      screenshot_url:     document.getElementById('bugScreenshot').value.trim(),
      tags
    };

    const saveBtn = document.getElementById('bugFormSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      if (id) {
        await API.updateBugReport(id, payload);
        UI.toast('Bug report atualizado com sucesso!', 'success');
      } else {
        await API.createBugReport(payload);
        UI.toast('Bug report criado com sucesso!', 'success');
      }
      UI.closeModal();
      this.render();
    } catch (err) {
      UI.toast('Erro ao salvar: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Salvar';
    }
  },

  async delete(id) {
    const confirmed = await UI.confirm('Tem certeza que deseja excluir este bug report? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    try {
      await API.deleteBugReport(id);
      UI.toast('Bug report excluído.', 'success');
      this.render();
    } catch (err) {
      UI.toast('Erro ao excluir: ' + err.message, 'error');
    }
  }
};