const Library = {
  selectedIds: new Set(),

  async render() {
    UI.setTitle('Biblioteca Global de Suítes');
    UI.loading();
    try {
      const data = await API.getLibrary();
      this._renderPage(data);
    } catch (err) {
      UI.toast('Erro ao carregar biblioteca: ' + err.message, 'error');
    }
  },

  _renderPage(data) {
    const pc = document.getElementById('pageContent');
    this.selectedIds.clear();

    // Agrupar por categoria
    const groups = {};
    data.forEach(tc => {
      const cat = tc.category || 'Sem Categoria';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tc);
    });

    let groupsHtml = '';
    if (data.length === 0) {
      groupsHtml = UI.emptyState('📚', 'Biblioteca vazia', 'Marque seus Casos de Teste como "Global" para que apareçam aqui e possam ser clonados para outros projetos.');
    } else {
      Object.keys(groups).sort().forEach(cat => {
        const cases = groups[cat];
        let rows = '';
        cases.forEach(tc => {
          const steps = Array.isArray(tc.steps) ? tc.steps : [];
          rows += `
            <tr>
              <td><input type="checkbox" class="lib-check" data-id="${tc.id}" /></td>
              <td><strong>${UI.truncate(tc.title, 45)}</strong></td>
              <td>${tc.project_name || '—'}</td>
              <td>${UI.badge(tc.priority)}</td>
              <td>${UI.badge(tc.severity)}</td>
              <td>${steps.length} passos</td>
            </tr>`;
        });

        groupsHtml += `
          <div class="card" style="margin-bottom:16px;">
            <div class="card-header">
              <span class="card-title">📁 ${cat} <span style="color:var(--text-muted);font-weight:400">(${cases.length})</span></span>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style="width:40px;"><input type="checkbox" class="lib-check-all" data-cat="${cat}" /></th>
                    <th>Caso de Teste</th>
                    <th>Projeto Origem</th>
                    <th>Prioridade</th>
                    <th>Severidade</th>
                    <th>Passos</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      });
    }

    pc.innerHTML = `
      <div class="card" style="margin-bottom:20px; border-left:4px solid var(--purple);">
        <h3 style="margin-top:0;">📚 Biblioteca Global de Suítes</h3>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:10px;">
          Aqui ficam reunidos todos os Casos de Teste marcados como <strong>"Global"</strong> em qualquer projeto. 
          Selecione os que deseja e clone-os para o Projeto atual com um clique!
        </p>
        <p style="font-size:13px; color:var(--text-muted);">
          💡 Para adicionar um caso aqui, vá em <strong>Casos de Teste</strong>, clique em Editar e marque a opção "Disponível na Biblioteca Global".
        </p>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <span id="libSelectedCount" style="font-size:14px; color:var(--text-muted);">0 selecionados</span>
        <button class="btn btn-primary" id="btnCloneSelected" disabled>📋 Clonar Selecionados para o Projeto Atual</button>
      </div>

      ${groupsHtml}`;

    // Bind events
    document.querySelectorAll('.lib-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        if (e.target.checked) this.selectedIds.add(e.target.dataset.id);
        else this.selectedIds.delete(e.target.dataset.id);
        this._updateCounter();
      });
    });

    document.querySelectorAll('.lib-check-all').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const table = e.target.closest('table');
        table.querySelectorAll('.lib-check').forEach(c => {
          c.checked = e.target.checked;
          if (e.target.checked) this.selectedIds.add(c.dataset.id);
          else this.selectedIds.delete(c.dataset.id);
        });
        this._updateCounter();
      });
    });

    document.getElementById('btnCloneSelected')?.addEventListener('click', () => this._cloneSelected());
  },

  _updateCounter() {
    const count = this.selectedIds.size;
    const label = document.getElementById('libSelectedCount');
    const btn = document.getElementById('btnCloneSelected');
    if (label) label.textContent = count + ' selecionado' + (count !== 1 ? 's' : '');
    if (btn) btn.disabled = count === 0;
  },

  async _cloneSelected() {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;

    const confirmed = await UI.confirm(`Clonar ${ids.length} caso(s) de teste para o projeto atual?`);
    if (!confirmed) return;

    try {
      const res = await API.cloneFromLibrary(ids);
      UI.toast(`${res.cloned} caso(s) clonado(s) com sucesso!`, 'success');
      this.selectedIds.clear();
      this.render();
    } catch(e) {
      UI.toast(e.message, 'error');
    }
  }
};
