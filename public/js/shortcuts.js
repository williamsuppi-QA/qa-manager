/**
 * Keyboard Shortcuts - Atalhos globais do QA Manager
 */
const Shortcuts = {
  init() {
    document.addEventListener('keydown', (e) => {
      // Ignorar se estiver digitando em input/textarea/select
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Apenas Escape funciona dentro de campos
        if (e.key === 'Escape') {
          document.activeElement.blur();
          UI.closeModal();
        }
        return;
      }

      // Ignorar se Ctrl/Alt/Meta pressionados (exceto combinações específicas)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      switch(e.key) {
        case 'n':
        case 'N':
          e.preventDefault();
          this._triggerNew();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          this._focusSearch();
          break;
        case 'Escape':
          UI.closeModal();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          App.navigate('dashboard');
          break;
        case '?':
          e.preventDefault();
          this._showHelp();
          break;
      }
    });
  },

  _triggerNew() {
    // Encontra o botão "Novo" ou "+" na página ativa e clica nele
    const newBtn = document.querySelector('#btnNewTC, #btnNewBug, #btnNewPlan, #btnNewRun, #btnNewScript, #btnNewWebhook');
    if (newBtn) newBtn.click();
    else UI.toast('Nenhuma ação "Novo" disponível nesta página', 'info');
  },

  _focusSearch() {
    // Foca no campo de busca da página ou da topbar
    const searchField = document.querySelector('#tcSearch, #bugSearch, #scriptSearch, .search-box input');
    if (searchField) {
      searchField.focus();
      searchField.select();
    }
  },

  _showHelp() {
    UI.openModal('⌨️ Atalhos de Teclado', `
      <div style="display:grid; grid-template-columns:auto 1fr; gap:8px 16px; font-size:13px; align-items:center;">
        <span class="kbd">N</span> <span>Novo item (caso, bug, plano...)</span>
        <span class="kbd">F</span> <span>Focar no campo de busca</span>
        <span class="kbd">D</span> <span>Ir para Dashboard</span>
        <span class="kbd">Esc</span> <span>Fechar modal / sair do campo</span>
        <span class="kbd">?</span> <span>Mostrar esta ajuda</span>
      </div>
    `, '<button class="btn btn-primary" onclick="UI.closeModal()">Entendi!</button>');
  }
};

document.addEventListener('DOMContentLoaded', () => Shortcuts.init());
