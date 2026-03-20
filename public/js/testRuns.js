const TestRuns = {
  activeRun: null,
  activeCaseIndex: 0,

  async render() {
    UI.setTitle('Cilos de Execução (Test Runs)');
    UI.loading();
    try {
      const data = await API.getTestRuns();
      this._renderList(data);
    } catch (err) {
      UI.toast('Erro ao carregar execuções: ' + err.message, 'error');
    }
  },

  _renderList(data) {
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="btn-group" style="margin-bottom:16px">
        <button class="btn btn-primary" id="btnNewRun">▶️ Nova Execução</button>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Histórico de Execuções <span style="color:var(--text-muted);font-weight:400">(${data.length})</span></span>
        </div>
        ${data.length === 0
          ? UI.emptyState('▶️', 'Nenhuma execução registrada', 'Clique em "Nova Execução" para começar a testar um Plano.')
          : `<div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Plano de Teste</th>
                    <th>Ambiente</th>
                    <th>Status</th>
                    <th>Iniciado por</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map(r => `
                    <tr>
                      <td><strong>${UI.truncate(r.title, 40)}</strong></td>
                      <td>${r.plan_title || '—'}</td>
                      <td>${r.environment || '—'}</td>
                      <td>${UI.badge(r.status)}</td>
                      <td>${r.created_by || '—'}</td>
                      <td>${UI.date(r.created_at)}</td>
                      <td>
                        <button class="btn btn-primary btn-sm btn-play-run" data-id="${r.id}" title="Abrir Player Execução">Executar</button>
                        <button class="btn btn-danger  btn-sm btn-del-run"  data-id="${r.id}" title="Excluir">🗑️</button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>`}
      </div>`;

    document.getElementById('btnNewRun')?.addEventListener('click', () => this.openCreateModal());
    document.querySelectorAll('.btn-play-run').forEach(b => b.addEventListener('click', () => this.renderPlayer(b.dataset.id)));
    document.querySelectorAll('.btn-del-run').forEach(b => b.addEventListener('click', () => this.delete(b.dataset.id)));
  },

  async openCreateModal() {
    try {
      const plans = await API.getTestPlans();
      if (plans.length === 0) {
        return UI.toast('Você precisa criar um Plano de Testes primeiro antes de executar um Test Run!', 'warning');
      }
      
      UI.openModal('▶️ Nova Execução (Test Run)', `
        <div class="form-group full">
          <label>Título da Execução *</label>
          <input type="text" id="runTitle" class="form-control" style="width:100%" placeholder="Ex: Regressão Sprint 15" required />
        </div>
        <div class="form-group full">
          <label>Plano de Teste Analisado *</label>
          <select id="runPlan" class="form-control" style="width:100%">
            ${plans.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
          </select>
        </div>
        <div class="form-group full">
          <label>Ambiente de Execução</label>
          <input type="text" id="runEnv" class="form-control" style="width:100%" placeholder="Ex: Produção, Staging, QA..." />
        </div>
      `, `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
          <button class="btn btn-primary" id="btnSaveRun">Criar e Iniciar</button>`);
          
      document.getElementById('btnSaveRun').addEventListener('click', async () => {
        const title = document.getElementById('runTitle').value.trim();
        const test_plan_id = document.getElementById('runPlan').value;
        const environment = document.getElementById('runEnv').value.trim();
        if (!title || !test_plan_id) return UI.toast('Título e Plano são obrigatórios!', 'warning');
        
        try {
          const res = await API.createTestRun({ title, test_plan_id, environment });
          UI.toast('Test Run criado!', 'success');
          UI.closeModal();
          this.renderPlayer(res.id);
        } catch(e) { UI.toast(e.message, 'error'); }
      });
    } catch(e) { UI.toast(e.message, 'error'); }
  },

  async renderPlayer(id) {
    UI.setTitle('Player de Execução');
    UI.loading();
    try {
      this.activeRun = await API.getTestRun(id);
      this.activeCaseIndex = 0;
      
      // Auto-selecionar o primeiro pending/untested
      const idx = this.activeRun.results.findIndex(r => r.status === 'untested' || r.status === 'pending');
      if (idx !== -1) this.activeCaseIndex = idx;
      
      this._updatePlayerUI();
    } catch(e) {
      UI.toast(e.message, 'error');
      this.render();
    }
  },

  _updatePlayerUI() {
    if (!this.activeRun) return;
    const run = this.activeRun;
    const pc = document.getElementById('pageContent');
    
    // Calcula progresso
    const total = run.results.length;
    const passed = run.results.filter(r => r.status === 'passed').length;
    const failed = run.results.filter(r => r.status === 'failed').length;
    const blocked = run.results.filter(r => r.status === 'blocked' || r.status === 'skipped').length;
    const pending = total - (passed + failed + blocked);
    const progress = total > 0 ? Math.round(((total - pending) / total) * 100) : 0;
    
    const currentCase = run.results[this.activeCaseIndex];
    if (!currentCase) {
      // Todos finalizados ou vazio
      pc.innerHTML = `
        <div class="card" style="text-align:center; padding: 40px;">
          <h2>Execução 100% Finalizada! 🎉</h2>
          <p>Todos os casos do ciclo <strong>${run.title}</strong> foram classificados.</p>
          <div style="margin-top:20px;">
            <button class="btn btn-primary" onclick="TestRuns.render()">Voltar para Test Runs</button>
          </div>
        </div>`;
      return;
    }

    pc.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h2 style="margin:0">${run.title} <span style="font-size:14px; color:var(--text-muted); font-weight:normal;">(${run.plan_title})</span></h2>
        <button class="btn btn-secondary" onclick="TestRuns.render()">⬅ Voltar</button>
      </div>
      
      <div style="background:var(--bg-secondary); border-radius:8px; padding:15px; margin-bottom:20px; display:flex; gap:20px; align-items:center;">
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:8px; color:var(--text-muted);">
            <span>Progresso da Execução</span>
            <span>${progress}% (${total - pending}/${total})</span>
          </div>
          <div style="height:10px; background:var(--border); border-radius:5px; overflow:hidden; display:flex;">
            <div style="width:${(passed/total)*100}%; background:var(--success);"></div>
            <div style="width:${(failed/total)*100}%; background:var(--danger);"></div>
            <div style="width:${(blocked/total)*100}%; background:var(--warning);"></div>
          </div>
        </div>
        <div style="display:flex; gap:15px; font-size:14px;">
          <span style="color:var(--success)">✅ ${passed}</span>
          <span style="color:var(--danger)">❌ ${failed}</span>
          <span style="color:var(--warning)">🚫 ${blocked}</span>
          <span style="color:var(--text-muted)">⏳ ${pending}</span>
        </div>
      </div>

      <div style="display:flex; gap:20px; align-items:flex-start;">
        <!-- Menus Laterais (Casos) -->
        <div class="card" style="flex:0 0 320px; max-height: 600px; overflow-y:auto; padding:0;">
          <div style="padding:15px; border-bottom:1px solid var(--border); font-weight:bold; position:sticky; top:0; background:var(--bg-primary);">Casos do Plano</div>
          <ul style="list-style:none; padding:0; margin:0;">
            ${run.results.map((r, i) => {
              const isActive = i === this.activeCaseIndex;
              let icon = '⏳';
              if(r.status==='passed') icon='✅';
              if(r.status==='failed') icon='❌';
              if(r.status==='blocked') icon='🚫';
              if(r.status==='skipped') icon='⏭️';
              
              return `
                <li style="padding:12px 15px; border-bottom:1px solid var(--border); cursor:pointer; background:${isActive ? 'var(--bg-secondary)' : 'transparent'}; border-left: 4px solid ${isActive ? 'var(--primary)' : 'transparent'}; display:flex; align-items:center; gap:10px;" onclick="TestRuns.selectCase(${i})">
                  <span style="font-size:16px;">${icon}</span>
                  <span style="flex:1; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.case_title}">${r.case_title}</span>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
        
        <!-- Detalhe do Caso Atual -->
        <div class="card" style="flex:1;">
          <div style="border-bottom:1px solid var(--border); padding-bottom:15px; margin-bottom:15px;">
            <h3 style="margin:0 0 10px 0; font-size:18px;">${currentCase.case_title}</h3>
            ${currentCase.preconditions ? `<div style="font-size:13px; color:var(--text-muted); background:var(--bg-secondary); padding:10px; border-radius:4px;"><strong>Pré-condições:</strong> ${currentCase.preconditions}</div>` : ''}
          </div>
          
          <div style="margin-bottom:20px;">
            <h4 style="margin:0 0 10px 0;">Passos de Execução</h4>
            ${currentCase.steps && currentCase.steps.length > 0 ? `
              <ul class="steps-list" style="padding-left:0;">
                ${currentCase.steps.map((s,i) => `<li style="margin-bottom:8px; display:flex; gap:10px;"><span style="background:var(--primary); color:#fff; width:22px; height:22px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:12px; font-weight:bold; flex-shrink:0;">${i+1}</span> <span>${s}</span></li>`).join('')}
              </ul>
            ` : '<p style="color:var(--text-muted); font-size:13px;">Nenhum passo cadastrado.</p>'}
          </div>
          
          <div style="margin-bottom:20px; background:#f0fbe8; border-left:4px solid var(--success); padding:10px 15px; color:#1a4d00; border-radius:0 4px 4px 0;">
            <strong>Resultado Esperado:</strong><br/>
            ${currentCase.expected_result || 'Nenhum resultado esperado preenchido.'}
          </div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block; margin-bottom:5px; font-weight:bold;">Anotações / Resultado Atual (Opcional)</label>
            <textarea id="runActualResult" class="form-control" style="width:100%; min-height:80px;" placeholder="O que aconteceu de fato durante o teste?">${currentCase.actual_result || ''}</textarea>
          </div>
          
          <div style="display:flex; gap:10px; border-top:1px solid var(--border); padding-top:20px;">
            <button class="btn btn-success" onclick="TestRuns.submitResult('passed')" style="flex:1; padding:12px; font-size:15px;">✅ Passou</button>
            <button class="btn btn-danger" onclick="TestRuns.submitResult('failed')" style="flex:1; padding:12px; font-size:15px;">❌ Falhou</button>
            <button class="btn btn-warning" onclick="TestRuns.submitResult('blocked')" style="flex:1; padding:12px; font-size:15px; color:#fff;">🚫 Bloqueado</button>
            <button class="btn btn-secondary" onclick="TestRuns.submitResult('skipped')" style="flex:1; padding:12px; font-size:15px;">⏭️ Pular</button>
          </div>
          
        </div>
      </div>
    `;
  },

  selectCase(index) {
    this.activeCaseIndex = index;
    this._updatePlayerUI();
  },

  async submitResult(status) {
    const currentCase = this.activeRun.results[this.activeCaseIndex];
    const actualText = document.getElementById('runActualResult').value.trim();
    
    UI.toast('Salvando resultado...', 'info');
    try {
      await API.updateTestRunResult(this.activeRun.id, currentCase.test_case_id, {
        status: status,
        actual_result: actualText
      });
      
      // Update local state
      currentCase.status = status;
      currentCase.actual_result = actualText;
      
      // Move to next untested case immediately if possible
      let nextIndex = this.activeRun.results.findIndex((r, i) => i > this.activeCaseIndex && (r.status === 'untested' || r.status === 'pending'));
      if (nextIndex === -1) {
        // Wrap around
        nextIndex = this.activeRun.results.findIndex(r => r.status === 'untested' || r.status === 'pending');
      }
      
      if (nextIndex !== -1) {
        this.activeCaseIndex = nextIndex;
      }
      
      this._updatePlayerUI();
      
    } catch(e) { UI.toast(e.message, 'error'); }
  },

  async delete(id) {
    const confirmed = await UI.confirm('Tem certeza que deseja excluir toda essa Execução/Test Run e seu histórico?');
    if (!confirmed) return;
    try {
      await API.deleteTestRun(id);
      UI.toast('Execução excluída com sucesso.', 'success');
      this.render();
    } catch (err) { UI.toast(err.message, 'error'); }
  }
};
