const TestCases = {
  filters: { status: '', priority: '', search: '' },

  async render() {
    UI.setTitle('Casos de Teste');
    UI.loading();
    try {
      const data = await API.getTestCases(this.filters);
      this._renderPage(data);
    } catch (err) {
      UI.toast('Erro ao carregar casos de teste: ' + err.message, 'error');
    }
  },

  _renderPage(data) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="btn-group" style="margin-bottom:16px">
        <button class="btn btn-primary" id="btnNewTC">+ Novo Caso de Teste</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="tcSearch" placeholder="Buscar por título, descrição..." value="${this.filters.search}" style="flex:1;min-width:200px" />
        <select id="tcStatus">
          <option value="">Todos os Status</option>
          <option value="pending"  ${this.filters.status==='pending' ?'selected':''}>Pendente</option>
          <option value="passed"   ${this.filters.status==='passed'  ?'selected':''}>Aprovado</option>
          <option value="failed"   ${this.filters.status==='failed'  ?'selected':''}>Reprovado</option>
          <option value="blocked"  ${this.filters.status==='blocked' ?'selected':''}>Bloqueado</option>
          <option value="skipped"  ${this.filters.status==='skipped' ?'selected':''}>Ignorado</option>
        </select>
        <select id="tcPriority">
          <option value="">Todas as Prioridades</option>
          <option value="low"    ${this.filters.priority==='low'   ?'selected':''}>Baixa</option>
          <option value="medium" ${this.filters.priority==='medium'?'selected':''}>Média</option>
          <option value="high"   ${this.filters.priority==='high'  ?'selected':''}>Alta</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="tcFilter">🔍 Filtrar</button>
        <button class="btn btn-secondary btn-sm" id="tcClear">✕ Limpar</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Casos de Teste <span style="color:var(--text-muted);font-weight:400">(${data.length})</span></span>
        </div>
        ${data.length === 0
          ? UI.emptyState('✅', 'Nenhum caso de teste encontrado', 'Clique em "+ Novo Caso de Teste" para começar')
          : `<div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Severidade</th>
                    <th>Categoria</th>
                    <th>Responsável</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(tc => `
                    <tr class="row-${tc.status}">
                      <td><strong>${UI.truncate(tc.title, 45)}</strong></td>
                      <td>${UI.badge(tc.status)}</td>
                      <td>${UI.badge(tc.priority)}</td>
                      <td>${UI.badge(tc.severity)}</td>
                      <td>${tc.category || '—'}</td>
                      <td>${tc.assigned_to || '—'}</td>
                      <td>${UI.date(tc.created_at)}</td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-secondary btn-sm btn-view-tc" data-id="${tc.id}" title="Visualizar">👁️</button>
                          <button class="btn btn-secondary btn-sm btn-edit-tc" data-id="${tc.id}" title="Editar">✏️</button>
                          <button class="btn btn-danger btn-sm btn-del-tc"    data-id="${tc.id}" title="Excluir">🗑️</button>
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
    document.getElementById('btnNewTC')?.addEventListener('click', () => this.openForm());
    document.getElementById('tcFilter')?.addEventListener('click', () => {
      this.filters.search   = document.getElementById('tcSearch').value.trim();
      this.filters.status   = document.getElementById('tcStatus').value;
      this.filters.priority = document.getElementById('tcPriority').value;
      this.render();
    });
    document.getElementById('tcClear')?.addEventListener('click', () => {
      this.filters = { status: '', priority: '', search: '' };
      this.render();
    });
    document.getElementById('tcSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('tcFilter').click();
    });

    document.querySelectorAll('.btn-view-tc').forEach(b =>
      b.addEventListener('click', () => this.viewDetail(b.dataset.id)));
    document.querySelectorAll('.btn-edit-tc').forEach(b =>
      b.addEventListener('click', () => this.openForm(b.dataset.id)));
    document.querySelectorAll('.btn-del-tc').forEach(b =>
      b.addEventListener('click', () => this.delete(b.dataset.id)));
  },

  async viewDetail(id) {
    try {
      const tc   = await API.getTestCase(id);
      const steps = Array.isArray(tc.steps) ? tc.steps : [];
      const tags  = Array.isArray(tc.tags)  ? tc.tags  : [];

      UI.openModal(`📋 ${tc.title}`, `
        <div class="detail-grid">
          <div class="detail-item"><label>Status</label><p>${UI.badge(tc.status)}</p></div>
          <div class="detail-item"><label>Prioridade</label><p>${UI.badge(tc.priority)}</p></div>
          <div class="detail-item"><label>Severidade</label><p>${UI.badge(tc.severity)}</p></div>
          <div class="detail-item"><label>Categoria</label><p>${tc.category || '—'}</p></div>
          <div class="detail-item"><label>Responsável</label><p>${tc.assigned_to || '—'}</p></div>
          <div class="detail-item"><label>Ambiente</label><p>${tc.environment || '—'}</p></div>
          <div class="detail-item"><label>Versão</label><p>${tc.version || '—'}</p></div>
          <div class="detail-item"><label>Criado em</label><p>${UI.date(tc.created_at)}</p></div>
          ${tc.description ? `<div class="detail-item full"><label>Descrição</label><p>${tc.description}</p></div>` : ''}
          ${tc.preconditions ? `<div class="detail-item full"><label>Precondições</label><p>${tc.preconditions}</p></div>` : ''}
          ${steps.length > 0 ? `
            <div class="detail-item full">
              <label>Passos</label>
              <ul class="steps-list">
                ${steps.map((s, i) => `<li><span class="step-n">${i+1}</span><span>${s}</span></li>`).join('')}
              </ul>
            </div>` : ''}
          ${tc.expected_result ? `<div class="detail-item full"><label>Resultado Esperado</label><p style="color:var(--success)">${tc.expected_result}</p></div>` : ''}
          ${tc.actual_result   ? `<div class="detail-item full"><label>Resultado Atual</label><p style="color:var(--danger)">${tc.actual_result}</p></div>` : ''}
          ${tags.length > 0   ? `<div class="detail-item full"><label>Tags</label><p>${UI.tags(tags)}</p></div>` : ''}
        </div>`,
        `<button class="btn btn-secondary" id="modalCloseBtn">Fechar</button>
         <button class="btn btn-primary"   id="modalEditBtn">✏️ Editar</button>`
      );

      document.getElementById('modalCloseBtn').addEventListener('click', () => UI.closeModal());
      document.getElementById('modalEditBtn').addEventListener('click', () => {
        UI.closeModal();
        this.openForm(id);
      });
    } catch (err) {
      UI.toast('Erro ao carregar detalhes: ' + err.message, 'error');
    }
  },

  async openForm(id = null) {
    let tc = {};
    if (id) {
      try { tc = await API.getTestCase(id); }
      catch (err) { UI.toast('Erro ao carregar dados: ' + err.message, 'error'); return; }
    }

    UI.openModal(id ? '✏️ Editar Caso de Teste' : '➕ Novo Caso de Teste', `
      <form id="tcForm" class="form-grid">
        <div class="form-group full">
          <label>Título *</label>
          <input type="text" id="tcTitle" value="${tc.title || ''}" placeholder="Nome do caso de teste" required />
        </div>
        <div class="form-group full">
          <label>Descrição</label>
          <textarea id="tcDesc" placeholder="Descreva o objetivo do teste...">${tc.description || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Precondições</label>
          <textarea id="tcPre" placeholder="O que deve estar configurado antes de executar...">${tc.preconditions || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Passos de Execução</label>
          ${UI.buildStepsInput(tc.steps || [])}
        </div>
        <div class="form-group full">
          <label>Resultado Esperado</label>
          <textarea id="tcExpected" placeholder="O que deveria acontecer...">${tc.expected_result || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Resultado Atual</label>
          <textarea id="tcActual" placeholder="O que realmente aconteceu...">${tc.actual_result || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="tcFormStatus">
            <option value="pending"  ${tc.status==='pending' ?'selected':''}>Pendente</option>
            <option value="passed"   ${tc.status==='passed'  ?'selected':''}>Aprovado</option>
            <option value="failed"   ${tc.status==='failed'  ?'selected':''}>Reprovado</option>
            <option value="blocked"  ${tc.status==='blocked' ?'selected':''}>Bloqueado</option>
            <option value="skipped"  ${tc.status==='skipped' ?'selected':''}>Ignorado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Prioridade</label>
          <select id="tcFormPriority">
            <option value="low"    ${tc.priority==='low'   ?'selected':''}>Baixa</option>
            <option value="medium" ${tc.priority==='medium'?'selected':''}>Média</option>
            <option value="high"   ${tc.priority==='high'  ?'selected':''}>Alta</option>
          </select>
        </div>
        <div class="form-group">
          <label>Severidade</label>
          <select id="tcFormSeverity">
            <option value="low"      ${tc.severity==='low'     ?'selected':''}>Baixa</option>
            <option value="medium"   ${tc.severity==='medium'  ?'selected':''}>Média</option>
            <option value="high"     ${tc.severity==='high'    ?'selected':''}>Alta</option>
            <option value="critical" ${tc.severity==='critical'?'selected':''}>Crítica</option>
          </select>
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <input type="text" id="tcCategory" value="${tc.category || ''}" placeholder="Ex: Login, Pagamento..." />
        </div>
        <div class="form-group">
          <label>Responsável</label>
          <input type="text" id="tcAssigned" value="${tc.assigned_to || ''}" placeholder="Nome do testador" />
        </div>
        <div class="form-group">
          <label>Ambiente</label>
          <input type="text" id="tcEnv" value="${tc.environment || ''}" placeholder="Ex: Staging, Produção..." />
        </div>
        <div class="form-group">
          <label>Versão</label>
          <input type="text" id="tcVersion" value="${tc.version || ''}" placeholder="Ex: 2.1.0" />
        </div>
        <div class="form-group full">
          <label>Tags (separadas por vírgula)</label>
          <input type="text" id="tcTags" value="${Array.isArray(tc.tags) ? tc.tags.join(', ') : ''}" placeholder="Ex: regressão, smoke, crítico" />
        </div>
        <div class="form-group full" style="background:var(--bg-primary); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border);">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; text-transform:none; font-size:14px;">
            <input type="checkbox" id="tcGlobal" ${tc.is_global ? 'checked' : ''} style="width:18px; height:18px;" />
            📚 Disponível na Biblioteca Global (permite clonagem para outros projetos)
          </label>
        </div>
      </form>`,
      `<button class="btn btn-secondary" id="tcFormCancel">Cancelar</button>
       <button class="btn btn-primary"   id="tcFormSave">💾 Salvar</button>`
    );

    UI.initStepsInput();
    document.getElementById('tcFormCancel').addEventListener('click', () => UI.closeModal());
    document.getElementById('tcFormSave').addEventListener('click', () => this._save(id));
  },

  async _save(id) {
    const title = document.getElementById('tcTitle').value.trim();
    if (!title) { UI.toast('Título é obrigatório', 'warning'); return; }

    const tagsRaw = document.getElementById('tcTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = {
      title,
      description:     document.getElementById('tcDesc').value.trim(),
      preconditions:   document.getElementById('tcPre').value.trim(),
      steps:           UI.getSteps(),
      expected_result: document.getElementById('tcExpected').value.trim(),
      actual_result:   document.getElementById('tcActual').value.trim(),
      status:          document.getElementById('tcFormStatus').value,
      priority:        document.getElementById('tcFormPriority').value,
      severity:        document.getElementById('tcFormSeverity').value,
      category:        document.getElementById('tcCategory').value.trim(),
      assigned_to:     document.getElementById('tcAssigned').value.trim(),
      environment:     document.getElementById('tcEnv').value.trim(),
      version:         document.getElementById('tcVersion').value.trim(),
      tags,
      is_global:       document.getElementById('tcGlobal').checked ? 1 : 0
    };

    const saveBtn = document.getElementById('tcFormSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      if (id) {
        await API.updateTestCase(id, payload);
        UI.toast('Caso de teste atualizado com sucesso!', 'success');
      } else {
        await API.createTestCase(payload);
        UI.toast('Caso de teste criado com sucesso!', 'success');
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
    const confirmed = await UI.confirm('Tem certeza que deseja excluir este caso de teste? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    try {
      await API.deleteTestCase(id);
      UI.toast('Caso de teste excluído.', 'success');
      this.render();
    } catch (err) {
      UI.toast('Erro ao excluir: ' + err.message, 'error');
    }
  }
};