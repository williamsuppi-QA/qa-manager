const App = {
  state: {
    currentPage: 'dashboard',
    theme: localStorage.getItem('theme') || 'light'
  },

  async init() {
    if (!localStorage.getItem('qa_token')) {
      window.location.href = '/login.html';
      return;
    }
    this.applyTheme();
    this.setupNavigation();
    await this.loadProjects();
    this.navigate('dashboard');
  },

  async loadProjects() {
    try {
      const projects = await API.getProjects();
      const select = document.getElementById('globalProjectSelect');
      if (!select) return;
      select.innerHTML = '';
      let savedId = localStorage.getItem('projectId');
      
      if (projects.length > 0) {
        if (!savedId || !projects.find(p => p.id === savedId)) {
          savedId = projects[0].id;
          localStorage.setItem('projectId', savedId);
        }
        projects.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          if (p.id === savedId) opt.selected = true;
          select.appendChild(opt);
        });
      } else {
        localStorage.removeItem('projectId');
      }
    } catch(e) { console.error('Error loading projects', e); }
  },

  applyTheme() {
    document.body.setAttribute('data-theme', this.state.theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
  },

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.state.theme);
    this.applyTheme();
  },

  setupNavigation() {
    document.querySelectorAll('[data-page]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        this.navigate(page);
      });
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    const sidebarToggle = document.getElementById('sidebarToggle');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');

    const toggleSidebar = () => sidebar?.classList.toggle('open');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);

    const select = document.getElementById('globalProjectSelect');
    if (select) {
      select.addEventListener('change', (e) => {
        localStorage.setItem('projectId', e.target.value);
        this.navigate(this.state.currentPage);
      });
    }

    const btnNew = document.getElementById('btnNewProject');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        UI.openModal('Novo Projeto',
          `<div style="margin-bottom:12px">
            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:13px; color:var(--text-color)">Nome do Projeto</label>
            <input type="text" id="newProjName" class="form-control" style="width:100%" placeholder="Ex: App Android V2.0" />
           </div>
           <div>
            <label style="display:block; margin-bottom:4px; font-weight:500; font-size:13px; color:var(--text-color)">Descrição</label>
             <textarea id="newProjDesc" class="form-control" style="width:100%"></textarea>
           </div>`,
          `<button class="btn btn-secondary" id="cancelNewProjBtn">Cancelar</button>
           <button class="btn btn-primary" id="saveNewProjectBtn">Salvar Projeto</button>`
        );
        document.getElementById('cancelNewProjBtn').addEventListener('click', () => UI.closeModal());
        document.getElementById('saveNewProjectBtn').addEventListener('click', async () => {
          const name = document.getElementById('newProjName').value.trim();
          const desc = document.getElementById('newProjDesc').value.trim();
          if(!name) return UI.toast('Nome do projeto é obrigatório', 'warning');
          
          await API.createProject({name, description: desc});
          UI.toast('Projeto criado com sucesso!', 'success');
          UI.closeModal();
          await this.loadProjects();
          this.navigate(this.state.currentPage);
        });
      });
    }
  },

  navigate(page) {
    this.state.currentPage = page;

    document.querySelectorAll('[data-page]').forEach(l => l.classList.remove('active'));
    document.querySelectorAll(`[data-page="${page}"]`).forEach(l => l.classList.add('active'));

    document.getElementById('sidebar')?.classList.remove('open');

    // Route to the specific module render functions
    if (page === 'dashboard' && typeof Dashboard !== 'undefined') Dashboard.render();
    else if (page === 'test-cases' && typeof TestCases !== 'undefined') TestCases.render();
    else if (page === 'bug-reports' && typeof BugReports !== 'undefined') BugReports.render();
    else if (page === 'test-plans' && typeof TestPlans !== 'undefined') TestPlans.render();
    else if (page === 'test-runs' && typeof TestRuns !== 'undefined') TestRuns.render();
    else if (page === 'scripts' && typeof Scripts !== 'undefined') Scripts.render();
    else if (page === 'integrations' && typeof Integrations !== 'undefined') Integrations.render();
    else if (page === 'traceability' && typeof Traceability !== 'undefined') Traceability.render();
    else if (page === 'library' && typeof Library !== 'undefined') Library.render();
    else if (page === 'exports' && typeof Exports !== 'undefined') Exports.render();
    else if (page === 'tutorial' && typeof Tutorial !== 'undefined') Tutorial.render();
    else if (page === 'qa-guide' && typeof QAGuide !== 'undefined') QAGuide.render();
    else {
      document.getElementById('pageContent').innerHTML = `
        <div class="empty-state">
          <h2>Página não encontrada ou módulo indisponível</h2>
        </div>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});