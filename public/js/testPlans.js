const TestPlans = {
  filters: { status: '', search: '' },

  async render() {
    UI.setTitle('Planos de Teste');
    UI.loading();
    try {
      const data = await API.getTestPlans(this.filters);
      this._renderPage(data);
    } catch (err) {
      UI.toast('Erro ao carregar planos de teste: ' + err.message, 'error');
    }
  },

  _renderPage(data) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="btn-group" style="margin-bottom:16px">
        <button class="btn btn-primary" id="btnNewPlan">+ Novo Plano de Teste</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="planSearch" placeholder="Buscar por título, descrição..." value="${this.filters.search}" style="flex:1;min-width:200px" />
        <select id="planStatus">
          <option value="">Todos os Status</option>
          <option value="draft"     ${this.filters.status==='draft'    ?'selected':''}>Rascunho</option>
          <option value="active"    ${this.filters.status==='active'   ?'selected':''}>Ativo</option>
          <option value="completed" ${this.filters.status==='completed'?'selected':''}>Concluído</option>
          <option value="archived"  ${this.filters.status==='archived' ?'selected':''}>Arquivado</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="planFilter">🔍 Filtrar</button>
        <button class="btn btn-secondary btn-sm" id="planClear">✕ Limpar</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Planos de Teste <span style="color:var(--text-muted);font-weight:400">(${data.length})</span></span>
        </div>
        ${data.length === 0
          ? UI.emptyState('📋', 'Nenhum plano de teste encontrado', 'Clique em "+ Novo Plano de Teste" para começar')
          : `<div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Ambiente</th>
                    <th>Versão</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Criado por</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(p => `
                    <tr>
                      <td><strong>${UI.truncate(p.title, 40)}</strong></td>
                      <td>${UI.badge(p.status)}</td>
                      <td>${p.environment || '—'}</td>
                      <td>${p.version || '—'}</td>
                      <td>${p.start_date || '—'}</td>
                      <td>${p.end_date || '—'}</td>
                      <td>${p.created_by || '—'}</td>
                      <td>${UI.date(p.created_at)}</td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-secondary btn-sm btn-view-plan" data-id="${p.id}" title="Visualizar">👁️</button>
                          <button class="btn btn-secondary btn-sm btn-edit-plan" data-id="${p.id}" title="Editar">✏️</button>
                          <button class="btn btn-danger    btn-sm btn-del-plan"  data-id="${p.id}" title="Excluir">🗑️</button>
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
    document.getElementById('btnNewPlan')?.addEventListener('click', () => this.openForm());
    document.getElementById('planFilter')?.addEventListener('click', () => {
      this.filters.search = document.getElementById('planSearch').value.trim();
      this.filters.status = document.getElementById('planStatus').value;
      this.render();
    });
    document.getElementById('planClear')?.addEventListener('click', () => {
      this.filters = { status: '', search: '' };
      this.render();
    });
    document.getElementById('planSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('planFilter').click();
    });

    document.querySelectorAll('.btn-view-plan').forEach(b =>
      b.addEventListener('click', () => this.viewDetail(b.dataset.id)));
    document.querySelectorAll('.btn-edit-plan').forEach(b =>
      b.addEventListener('click', () => this.openForm(b.dataset.id)));
    document.querySelectorAll('.btn-del-plan').forEach(b =>
      b.addEventListener('click', () => this.delete(b.dataset.id)));
  },

  async viewDetail(id) {
    try {
      const p    = await API.getTestPlan(id);
      const tags = Array.isArray(p.tags) ? p.tags : [];
      const tcs  = Array.isArray(p.testCases) ? p.testCases : [];

      UI.openModal(`📋 ${p.title}`, `
        <div class="detail-grid">
          <div class="detail-item"><label>Status</label><p>${UI.badge(p.status)}</p></div>
          <div class="detail-item"><label>Versão</label><p>${p.version || '—'}</p></div>
          <div class="detail-item"><label>Ambiente</label><p>${p.environment || '—'}</p></div>
          <div class="detail-item"><label>Criado por</label><p>${p.created_by || '—'}</p></div>
          <div class="detail-item"><label>Aprovado por</label><p>${p.approved_by || '—'}</p></div>
          <div class="detail-item"><label>Criado em</label><p>${UI.date(p.created_at)}</p></div>
          <div class="detail-item"><label>Data Início</label><p>${p.start_date || '—'}</p></div>
          <div class="detail-item"><label>Data Fim</label><p>${p.end_date || '—'}</p></div>
          ${p.description  ? `<div class="detail-item full"><label>Descrição</label><p>${p.description}</p></div>`   : ''}
          ${p.objective    ? `<div class="detail-item full"><label>Objetivo</label><p>${p.objective}</p></div>`      : ''}
          ${p.scope        ? `<div class="detail-item full"><label>Escopo</label><p>${p.scope}</p></div>`            : ''}
          ${p.out_of_scope ? `<div class="detail-item full"><label>Fora do Escopo</label><p>${p.out_of_scope}</p></div>` : ''}
          ${tags.length > 0 ? `<div class="detail-item full"><label>Tags</label><p>${UI.tags(tags)}</p></div>`      : ''}
        </div>

        ${tcs.length > 0 ? `
          <div style="margin-top:16px">
            <div style="font-size:13px;font-weight:700;color:var(--text-secondary);
                        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">
              Casos de Teste Vinculados (${tcs.length})
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Título</th><th>Status</th><th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  ${tcs.map(tc => `
                    <tr>
                      <td>${UI.truncate(tc.title, 50)}</td>
                      <td>${UI.badge(tc.status)}</td>
                      <td>${UI.badge(tc.priority)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>` : ''}`,
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
    let p = {};
    let allTC = [];

    try {
      allTC = await API.getTestCases();
      if (id) p = await API.getTestPlan(id);
    } catch (err) {
      UI.toast('Erro ao carregar dados: ' + err.message, 'error');
      return;
    }

    const linkedIds = new Set((p.testCases || []).map(tc => tc.id));

    UI.openModal(id ? '✏️ Editar Plano de Teste' : '➕ Novo Plano de Teste', `
      <form id="planForm" class="form-grid">
        <div class="form-group full">
          <label>Título *</label>
          <input type="text" id="planTitle" value="${p.title || ''}" placeholder="Nome do plano de teste" required />
        </div>
        <div class="form-group full">
          <label>Descrição</label>
          <textarea id="planDesc" placeholder="Descrição geral do plano...">${p.description || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Objetivo</label>
          <textarea id="planObjective" placeholder="Qual o objetivo deste plano de teste...">${p.objective || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Escopo</label>
          <textarea id="planScope" placeholder="O que está dentro do escopo...">${p.scope || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Fora do Escopo</label>
          <textarea id="planOutScope" placeholder="O que está fora do escopo...">${p.out_of_scope || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="planFormStatus">
            <option value="draft"     ${p.status==='draft'    ?'selected':''}>Rascunho</option>
            <option value="active"    ${p.status==='active'   ?'selected':''}>Ativo</option>
            <option value="completed" ${p.status==='completed'?'selected':''}>Concluído</option>
            <option value="archived"  ${p.status==='archived' ?'selected':''}>Arquivado</option>
          </select>
        </div>
        <div class="form-group">
          <label>Ambiente</label>
          <input type="text" id="planEnv" value="${p.environment || ''}" placeholder="Ex: Staging, Produção..." />
        </div>
        <div class="form-group">
          <label>Versão</label>
          <input type="text" id="planVersion" value="${p.version || ''}" placeholder="Ex: 2.1.0" />
        </div>
        <div class="form-group">
          <label>Criado por</label>
          <input type="text" id="planCreatedBy" value="${p.created_by || ''}" placeholder="Nome do autor" />
        </div>
        <div class="form-group">
          <label>Aprovado por</label>
          <input type="text" id="planApprovedBy" value="${p.approved_by || ''}" placeholder="Nome do aprovador" />
        </div>
        <div class="form-group">
          <label>Data de Início</label>
          <input type="date" id="planStartDate" value="${p.start_date || ''}" />
        </div>
        <div class="form-group">
          <label>Data de Fim</label>
          <input type="date" id="planEndDate" value="${p.end_date || ''}" />
        </div>
        <div class="form-group full">
          <label>Tags (separadas por vírgula)</label>
          <input type="text" id="planTags" value="${Array.isArray(p.tags) ? p.tags.join(', ') : ''}" placeholder="Ex: regressão, sprint-10" />
        </div>
        ${allTC.length > 0 ? `
          <div class="form-group full">
            <label>Casos de Teste Vinculados</label>
            <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);
                        border-radius:var(--radius-sm);padding:10px;background:var(--bg-primary)">
              ${allTC.map(tc => `
                <label style="display:flex;align-items:center;gap:8px;padding:5px 0;
                               cursor:pointer;font-size:13px;text-transform:none;letter-spacing:0">
                  <input type="checkbox" class="tc-checkbox" value="${tc.id}"
                    ${linkedIds.has(tc.id) ? 'checked' : ''} />
                  <span>${tc.title}</span>
                  ${UI.badge(tc.status)}
                </label>`).join('')}
            </div>
          </div>` : ''}
      </form>`,
      `<button class="btn btn-secondary" id="planFormCancel">Cancelar</button>
       <button class="btn btn-primary"   id="planFormSave">💾 Salvar</button>`
    );

    document.getElementById('planFormCancel').addEventListener('click', () => UI.closeModal());
    document.getElementById('planFormSave').addEventListener('click', () => this._save(id));
  },

  async _save(id) {
    const title = document.getElementById('planTitle').value.trim();
    if (!title) { UI.toast('Título é obrigatório', 'warning'); return; }

    const tagsRaw = document.getElementById('planTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const testCaseIds = Array.from(document.querySelectorAll('.tc-checkbox:checked'))
      .map(cb => cb.value);

    const payload = {
      title,
      description:  document.getElementById('planDesc').value.trim(),
      objective:    document.getElementById('planObjective').value.trim(),
      scope:        document.getElementById('planScope').value.trim(),
      out_of_scope: document.getElementById('planOutScope').value.trim(),
      status:       document.getElementById('planFormStatus').value,
      environment:  document.getElementById('planEnv').value.trim(),
      version:      document.getElementById('planVersion').value.trim(),
      created_by:   document.getElementById('planCreatedBy').value.trim(),
      approved_by:  document.getElementById('planApprovedBy').value.trim(),
      start_date:   document.getElementById('planStartDate').value,
      end_date:     document.getElementById('planEndDate').value,
      tags,
      testCaseIds
    };

    const saveBtn = document.getElementById('planFormSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      if (id) {
        await API.updateTestPlan(id, payload);
        UI.toast('Plano de teste atualizado com sucesso!', 'success');
      } else {
        await API.createTestPlan(payload);
        UI.toast('Plano de teste criado com sucesso!', 'success');
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
    const confirmed = await UI.confirm('Tem certeza que deseja excluir este plano de teste? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    try {
      await API.deleteTestPlan(id);
      UI.toast('Plano de teste excluído.', 'success');
      this.render();
    } catch (err) {
      UI.toast('Erro ao excluir: ' + err.message, 'error');
    }
  }
};