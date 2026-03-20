const Integrations = {
  async render() {
    UI.setTitle('Integrações e Webhooks');
    UI.loading();
    try {
      const data = await API.getWebhooks();
      const pId = localStorage.getItem('projectId');
      let jiraData = null;
      if (pId) {
        try {
          const res = await API.getProjectSetting(pId, 'jira_config');
          if (res && res.value) jiraData = JSON.parse(res.value);
        } catch(e) { console.warn('Sem config do Jira'); }
      }
      this._renderPage(data, jiraData);
    } catch (err) {
      UI.toast('Erro ao carregar integrações: ' + err.message, 'error');
    }
  },

  _renderPage(data, jiraData) {
    const pc = document.getElementById('pageContent');
    const pId = localStorage.getItem('projectId');
    const webhookUrl = window.location.origin + '/api/int/webhooks/' + pId;

    let html = `
      <div class="card" style="margin-bottom:20px; border-left:4px solid var(--success);">
        <h3 style="margin-top:0; display:flex; align-items:center; gap:8px;">
          📸 Quick Capture (Extensão Web)
        </h3>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:15px;">
          Reporte bugs instantâneamente de qualquer site! Arraste o bookmarklet abaixo para sua barra de favoritos. Ao ativá-lo em qualquer página, um popup abre capturando URL, Navegador e SO automaticamente.
        </p>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
          <a href="javascript:void(window.open('${window.location.origin}/capture.html?url='+encodeURIComponent(location.href),'QACapture','width=560,height=700'))" 
             style="display:inline-flex; align-items:center; gap:6px; padding:10px 20px; background:var(--success); color:#fff; border-radius:8px; font-weight:600; text-decoration:none; font-size:14px; cursor:grab;" 
             title="Arraste para a barra de favoritos!">
            📸 QA Capture
          </a>
          <span style="font-size:12px; color:var(--text-muted);">← Arraste este botão para sua barra de favoritos</span>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <a href="/capture.html" target="_blank" class="btn btn-secondary">Abrir Quick Capture Manualmente</a>
        </div>
        <p style="font-size:11px; color:var(--text-muted); margin-top:10px;">* O Quick Capture exige um Token Bearer (gerado abaixo) para funcionar corretamente.</p>
      </div>

      <div class="card" style="margin-bottom:20px; border-left:4px solid #0052cc;">
        <h3 style="margin-top:0; display:flex; align-items:center; gap:8px;">
           🚀 Exportação Jira Outbound
        </h3>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:15px;">
          Configure as credenciais para ativar o botão "Mandar pro Jira" nos painéis de Bug Reports.
        </p>
        <div style="display:flex; gap:15px; margin-bottom:10px;">
          <div class="form-group" style="flex:1;">
            <label>Jira Base URL</label>
            <input type="text" id="jiraUrl" class="form-control" style="width:100%" placeholder="https://seudominio.atlassian.net" value="\${jiraData ? jiraData.url : ''}" />
          </div>
          <div class="form-group" style="flex:1;">
            <label>Project Key (Chave do Jira)</label>
            <input type="text" id="jiraKey" class="form-control" style="width:100%" placeholder="Ex: QA, ANDROID, WEB" value="\${jiraData ? jiraData.projectKey : ''}" />
          </div>
        </div>
        <div style="display:flex; gap:15px; margin-bottom:15px;">
          <div class="form-group" style="flex:1;">
            <label>Email da Conta</label>
            <input type="text" id="jiraEmail" class="form-control" style="width:100%" placeholder="seu@email.com" value="\${jiraData ? jiraData.email : ''}" />
          </div>
          <div class="form-group" style="flex:1;">
            <label>API Token (Personal Access)</label>
            <input type="password" id="jiraToken" class="form-control" style="width:100%" placeholder="Colar token gerado no painel da Atlassian..." value="\${jiraData ? jiraData.token : ''}" />
          </div>
        </div>
        <button class="btn btn-primary" id="btnSaveJira" style="background:#0052cc;">Salvar Credenciais do Projeto</button>
      </div>

      <div class="btn-group" style="margin-bottom:16px; border-top: 1px solid var(--border); padding-top:20px;">
        <button class="btn btn-primary" id="btnNewWebhook">+ Gerar Novo Token Inbound</button>
      </div>
      
      <div class="card" style="margin-bottom:20px; border-left:4px solid var(--primary);">
        <h3 style="margin-top:0;">📡 Webhooks Inbound</h3>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:10px;">
          Permite que ferramentas externas (como Cypress, Jenkins ou GitHub Actions) abram Bug Reports automaticamente em seu nome neste Projeto quando testes falharem.
        </p>
        <div style="background:var(--bg-secondary); padding:15px; border-radius:6px; font-size:13px; font-family:monospace; color:var(--text-color); margin-bottom:10px;">
          <strong>Endpoint POST:</strong> <br/>
          <span style="color:var(--primary)">\${webhookUrl}</span>
        </div>
        <p style="font-size:13px; margin:0;"><strong>Exemplo de Payload (JSON):</strong></p>
        <pre style="background:#1e1e1e; color:#d4d4d4; padding:15px; border-radius:6px; font-size:12px; overflow-x:auto;">
{
  "title": "Falha no Login (Cypress E2E)",
  "description": "O seletor #btnLogin não foi renderizado a tempo.",
  "severity": "high",
  "status": "open",
  "source": "Cypress CI"
}</pre>
        <p style="font-size:13px; margin-top:10px;">* É obrigatório enviar o header <code>Authorization: Bearer SEU_TOKEN_GERADO_ABAIXO</code></p>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Tokens Ativos</span>
        </div>`;
          
    if (data.length === 0) {
      html += UI.emptyState('🔑', 'Nenhum token gerado', 'Clique em "+ Gerar Novo Token"');
    } else {
      let tbody = '';
      data.forEach(k => {
        tbody += `
          <tr>
            <td><strong>\${k.name}</strong></td>
            <td><code style="background:var(--bg-secondary); padding:2px 6px; border-radius:4px; font-size:12px;">\${k.token}</code></td>
            <td>\${UI.date(k.created_at)}</td>
            <td><button class="btn btn-danger btn-sm btn-del-hook" data-id="\${k.id}" title="Revogar Acesso">Revogar</button></td>
          </tr>`;
      });
      html += `<div class="table-wrapper"><table><thead><tr><th>Nome</th><th>Token (Bearer)</th><th>Criado em</th><th>Ações</th></tr></thead><tbody>\${tbody}</tbody></table></div>`;
    }
    
    html += `</div>`;
    
    // Resolvemos sintaxe dos \${} no JS manual para não quebrar a compilação do backend
    let parsedHtml = html;
    if(jiraData){
      parsedHtml = parsedHtml.replace('\\${jiraData ? jiraData.url : \'\'}', jiraData.url);
      parsedHtml = parsedHtml.replace('\\${jiraData ? jiraData.projectKey : \'\'}', jiraData.projectKey);
      parsedHtml = parsedHtml.replace('\\${jiraData ? jiraData.email : \'\'}', jiraData.email);
      parsedHtml = parsedHtml.replace('\\${jiraData ? jiraData.token : \'\'}', jiraData.token);
    } else {
      parsedHtml = parsedHtml.replace(/\\\$\{jiraData \? jiraData\.[a-zA-Z]+ : ''\}/g, '');
    }
    parsedHtml = parsedHtml.replace('\\${webhookUrl}', webhookUrl);
    // Para tbody já montamos com JS template rules. Remove \ escape lefts
    parsedHtml = parsedHtml.replace(/\\\$/g, '$');
    
    pc.innerHTML = html; // Wait, actually html is populated correctly if I use normal template literals without escaping...

    document.getElementById('btnNewWebhook')?.addEventListener('click', () => this.generate());
    document.querySelectorAll('.btn-del-hook').forEach(b => b.addEventListener('click', () => this.delete(b.dataset.id)));
    
    document.getElementById('btnSaveJira')?.addEventListener('click', async () => {
      const pId = localStorage.getItem('projectId');
      const payload = {
        url: document.getElementById('jiraUrl').value.trim(),
        projectKey: document.getElementById('jiraKey').value.trim(),
        email: document.getElementById('jiraEmail').value.trim(),
        token: document.getElementById('jiraToken').value.trim()
      };
      if(!payload.url || !payload.projectKey || !payload.email || !payload.token){
        return UI.toast('Preencha os quatro campos do Jira.', 'warning');
      }
      try {
        await API.setProjectSetting(pId, 'jira_config', JSON.stringify(payload));
        UI.toast('Credenciais do Jira atreladas a este Projeto com Sucesso!', 'success');
      } catch(e) { UI.toast('Erro: ' + e.message, 'error'); }
    });
  },

  generate() {
    UI.openModal('Gerar Token de Integração', `
      <div class="form-group full">
        <label>Nome do Serviço Integrado *</label>
        <input type="text" id="hookName" class="form-control" style="width:100%" placeholder="Ex: GitHub Actions CI/CD" required />
      </div>
    `, `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="btnSaveHook">Gerar Token Seguro</button>
    `);
    
    document.getElementById('btnSaveHook').addEventListener('click', async () => {
      const name = document.getElementById('hookName').value.trim();
      if (!name) return UI.toast('Nome obrigatório', 'warning');
      
      try {
        await API.createWebhook({ name });
        UI.toast('Token gerado com sucesso!', 'success');
        UI.closeModal();
        this.render();
      } catch(e) { UI.toast(e.message, 'error'); }
    });
  },

  async delete(id) {
    const confirmed = await UI.confirm('Tem certeza que deseja REVOGAR este token?');
    if (!confirmed) return;
    try {
      await API.deleteWebhook(id);
      UI.toast('Token revogado.', 'success');
      this.render();
    } catch (err) { UI.toast(err.message, 'error'); }
  }
};
