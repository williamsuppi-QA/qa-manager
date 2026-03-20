const Scripts = {
  filters: { language: '', framework: '', search: '' },

  async render() {
    UI.setTitle('Scripts');
    UI.loading();
    try {
      const data = await API.getScripts(this.filters);
      this._renderPage(data);
    } catch (err) {
      UI.toast('Erro ao carregar scripts: ' + err.message, 'error');
    }
  },

  _renderPage(data) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="btn-group" style="margin-bottom:16px">
        <button class="btn btn-primary" id="btnNewScript">+ Novo Script</button>
      </div>
      <div class="filters-bar">
        <input type="text" id="scriptSearch" placeholder="Buscar por título, descrição, código..." value="${this.filters.search}" style="flex:1;min-width:200px" />
        <select id="scriptLanguage">
          <option value="">Todas as Linguagens</option>
          <option value="javascript" ${this.filters.language==='javascript'?'selected':''}>JavaScript</option>
          <option value="typescript" ${this.filters.language==='typescript'?'selected':''}>TypeScript</option>
          <option value="python"     ${this.filters.language==='python'    ?'selected':''}>Python</option>
          <option value="java"       ${this.filters.language==='java'      ?'selected':''}>Java</option>
          <option value="csharp"     ${this.filters.language==='csharp'    ?'selected':''}>C#</option>
          <option value="ruby"       ${this.filters.language==='ruby'      ?'selected':''}>Ruby</option>
          <option value="php"        ${this.filters.language==='php'       ?'selected':''}>PHP</option>
          <option value="other"      ${this.filters.language==='other'     ?'selected':''}>Outro</option>
        </select>
        <select id="scriptFramework">
          <option value="">Todos os Frameworks</option>
          <option value="cypress"    ${this.filters.framework==='cypress'   ?'selected':''}>Cypress</option>
          <option value="playwright" ${this.filters.framework==='playwright'?'selected':''}>Playwright</option>
          <option value="selenium"   ${this.filters.framework==='selenium'  ?'selected':''}>Selenium</option>
          <option value="jest"       ${this.filters.framework==='jest'      ?'selected':''}>Jest</option>
          <option value="pytest"     ${this.filters.framework==='pytest'    ?'selected':''}>Pytest</option>
          <option value="robot"      ${this.filters.framework==='robot'     ?'selected':''}>Robot Framework</option>
          <option value="postman"    ${this.filters.framework==='postman'   ?'selected':''}>Postman</option>
          <option value="other"      ${this.filters.framework==='other'     ?'selected':''}>Outro</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="scriptFilter">🔍 Filtrar</button>
        <button class="btn btn-secondary btn-sm" id="scriptClear">✕ Limpar</button>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Scripts <span style="color:var(--text-muted);font-weight:400">(${data.length})</span></span>
        </div>
        ${data.length === 0
          ? UI.emptyState('⚙️', 'Nenhum script encontrado', 'Clique em "+ Novo Script" para começar')
          : `<div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Linguagem</th>
                    <th>Framework</th>
                    <th>Descrição</th>
                    <th>Tags</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(s => `
                    <tr>
                      <td><strong>${UI.truncate(s.title, 40)}</strong></td>
                      <td>${this._langBadge(s.language)}</td>
                      <td>${s.framework || '—'}</td>
                      <td>${UI.truncate(s.description, 50)}</td>
                      <td>${UI.tags(s.tags)}</td>
                      <td>${UI.date(s.created_at)}</td>
                      <td>
                        <div class="btn-group">
                          <button class="btn btn-secondary btn-sm btn-view-script" data-id="${s.id}" title="Visualizar">👁️</button>
                          <button class="btn btn-secondary btn-sm btn-edit-script" data-id="${s.id}" title="Editar">✏️</button>
                          <button class="btn btn-danger    btn-sm btn-del-script"  data-id="${s.id}" title="Excluir">🗑️</button>
                        </div>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
      </div>`;

    this._bindEvents();
  },

  _langBadge(lang) {
    const colors = {
      javascript: '#F7DF1E', typescript: '#3178C6', python: '#3776AB',
      java: '#ED8B00', csharp: '#239120', ruby: '#CC342D',
      php: '#777BB4', other: '#95A5A6'
    };
    const color = colors[lang] || '#95A5A6';
    const textColor = ['javascript'].includes(lang) ? '#333' : '#fff';
    return `<span style="background:${color};color:${textColor};padding:3px 10px;
      border-radius:20px;font-size:11px;font-weight:700">${lang || '—'}</span>`;
  },

  _bindEvents() {
    document.getElementById('btnNewScript')?.addEventListener('click', () => this.openForm());
    document.getElementById('scriptFilter')?.addEventListener('click', () => {
      this.filters.search    = document.getElementById('scriptSearch').value.trim();
      this.filters.language  = document.getElementById('scriptLanguage').value;
      this.filters.framework = document.getElementById('scriptFramework').value;
      this.render();
    });
    document.getElementById('scriptClear')?.addEventListener('click', () => {
      this.filters = { language: '', framework: '', search: '' };
      this.render();
    });
    document.getElementById('scriptSearch')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('scriptFilter').click();
    });

    document.querySelectorAll('.btn-view-script').forEach(b =>
      b.addEventListener('click', () => this.viewDetail(b.dataset.id)));
    document.querySelectorAll('.btn-edit-script').forEach(b =>
      b.addEventListener('click', () => this.openForm(b.dataset.id)));
    document.querySelectorAll('.btn-del-script').forEach(b =>
      b.addEventListener('click', () => this.delete(b.dataset.id)));
  },

  async viewDetail(id) {
    try {
      const s    = await API.getScript(id);
      const tags = Array.isArray(s.tags) ? s.tags : [];

      UI.openModal(`⚙️ ${s.title}`, `
        <div class="detail-grid">
          <div class="detail-item"><label>Linguagem</label><p>${this._langBadge(s.language)}</p></div>
          <div class="detail-item"><label>Framework</label><p>${s.framework || '—'}</p></div>
          <div class="detail-item"><label>Criado em</label><p>${UI.date(s.created_at)}</p></div>
          <div class="detail-item"><label>Atualizado em</label><p>${UI.date(s.updated_at)}</p></div>
          ${s.description ? `<div class="detail-item full"><label>Descrição</label><p>${s.description}</p></div>` : ''}
          ${tags.length > 0 ? `<div class="detail-item full"><label>Tags</label><p>${UI.tags(tags)}</p></div>` : ''}
        </div>
        ${s.code ? `
          <div style="margin-top:16px">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);
                        text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Código</div>
            <div class="code-wrapper">
              <button class="code-copy-btn" id="copyCodeBtn">📋 Copiar</button>
              <pre><code class="language-${s.language || 'plaintext'}">${this._escapeHtml(s.code)}</code></pre>
            </div>
          </div>` : ''}`,
        `<button class="btn btn-secondary" id="modalCloseBtn">Fechar</button>
         <button class="btn btn-primary"   id="modalEditBtn">✏️ Editar</button>`
      );

      if (window.hljs) {
        document.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
      }

      document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
        navigator.clipboard.writeText(s.code || '').then(() => {
          UI.toast('Código copiado!', 'success');
        });
      });

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
    let s = {};
    if (id) {
      try { s = await API.getScript(id); }
      catch (err) { UI.toast('Erro ao carregar dados: ' + err.message, 'error'); return; }
    }

    UI.openModal(id ? '✏️ Editar Script' : '➕ Novo Script', `
      <form id="scriptForm" class="form-grid">
        <div class="form-group full">
          <label>Título *</label>
          <input type="text" id="scriptTitle" value="${s.title || ''}" placeholder="Nome do script" required />
        </div>
        <div class="form-group full">
          <label>Descrição</label>
          <textarea id="scriptDesc" placeholder="Descreva o propósito do script...">${s.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label>Linguagem</label>
          <select id="scriptFormLanguage">
            <option value="javascript" ${s.language==='javascript'?'selected':''}>JavaScript</option>
            <option value="typescript" ${s.language==='typescript'?'selected':''}>TypeScript</option>
            <option value="python"     ${s.language==='python'    ?'selected':''}>Python</option>
            <option value="java"       ${s.language==='java'      ?'selected':''}>Java</option>
            <option value="csharp"     ${s.language==='csharp'    ?'selected':''}>C#</option>
            <option value="ruby"       ${s.language==='ruby'      ?'selected':''}>Ruby</option>
            <option value="php"        ${s.language==='php'       ?'selected':''}>PHP</option>
            <option value="other"      ${s.language==='other'     ?'selected':''}>Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label>Framework</label>
          <select id="scriptFormFramework">
            <option value=""          ${!s.framework              ?'selected':''}>Nenhum</option>
            <option value="cypress"   ${s.framework==='cypress'   ?'selected':''}>Cypress</option>
            <option value="playwright"${s.framework==='playwright'?'selected':''}>Playwright</option>
            <option value="selenium"  ${s.framework==='selenium'  ?'selected':''}>Selenium</option>
            <option value="jest"      ${s.framework==='jest'      ?'selected':''}>Jest</option>
            <option value="pytest"    ${s.framework==='pytest'    ?'selected':''}>Pytest</option>
            <option value="robot"     ${s.framework==='robot'     ?'selected':''}>Robot Framework</option>
            <option value="postman"   ${s.framework==='postman'   ?'selected':''}>Postman</option>
            <option value="other"     ${s.framework==='other'     ?'selected':''}>Outro</option>
          </select>
        </div>
        <div class="form-group full">
          <label>Código</label>
          <textarea id="scriptCode" class="code-area" placeholder="// Cole ou escreva seu script aqui...">${s.code || ''}</textarea>
        </div>
        <div class="form-group full">
          <label>Tags (separadas por vírgula)</label>
          <input type="text" id="scriptTags" value="${Array.isArray(s.tags) ? s.tags.join(', ') : ''}" placeholder="Ex: login, smoke, api" />
        </div>
      </form>`,
      `<button class="btn btn-secondary" id="scriptFormCancel">Cancelar</button>
       <button class="btn btn-primary"   id="scriptFormSave">💾 Salvar</button>`
    );

    document.getElementById('scriptFormCancel').addEventListener('click', () => UI.closeModal());
    document.getElementById('scriptFormSave').addEventListener('click', () => this._save(id));
  },

  async _save(id) {
    const title = document.getElementById('scriptTitle').value.trim();
    if (!title) { UI.toast('Título é obrigatório', 'warning'); return; }

    const tagsRaw = document.getElementById('scriptTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const payload = {
      title,
      description: document.getElementById('scriptDesc').value.trim(),
      language:    document.getElementById('scriptFormLanguage').value,
      framework:   document.getElementById('scriptFormFramework').value,
      code:        document.getElementById('scriptCode').value,
      tags
    };

    const saveBtn = document.getElementById('scriptFormSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      if (id) {
        await API.updateScript(id, payload);
        UI.toast('Script atualizado com sucesso!', 'success');
      } else {
        await API.createScript(payload);
        UI.toast('Script criado com sucesso!', 'success');
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
    const confirmed = await UI.confirm('Tem certeza que deseja excluir este script? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    try {
      await API.deleteScript(id);
      UI.toast('Script excluído.', 'success');
      this.render();
    } catch (err) {
      UI.toast('Erro ao excluir: ' + err.message, 'error');
    }
  },

  _escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;');
  }
};