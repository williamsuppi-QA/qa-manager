const UI = {
  // TOAST
  toast(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // MODAL
  openModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('active');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('modalBody').innerHTML = '';
    document.getElementById('modalFooter').innerHTML = '';
  },

  // CONFIRM
  confirm(message) {
    return new Promise((resolve) => {
      document.getElementById('confirmMessage').textContent = message;
      document.getElementById('confirmOverlay').classList.add('active');

      const ok     = document.getElementById('confirmOk');
      const cancel = document.getElementById('confirmCancel');

      const cleanup = (result) => {
        document.getElementById('confirmOverlay').classList.remove('active');
        ok.replaceWith(ok.cloneNode(true));
        cancel.replaceWith(cancel.cloneNode(true));
        resolve(result);
      };

      document.getElementById('confirmOk').addEventListener('click',     () => cleanup(true));
      document.getElementById('confirmCancel').addEventListener('click', () => cleanup(false));
    });
  },

  // LOADING
  loading(container = '#pageContent') {
    document.querySelector(container).innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Carregando...</span>
      </div>`;
  },

  // BADGE
  badge(value, extraClass = '') {
    const map = {
      passed:      'Aprovado',
      failed:      'Reprovado',
      pending:     'Pendente',
      blocked:     'Bloqueado',
      skipped:     'Ignorado',
      open:        'Aberto',
      in_progress: 'Em Andamento',
      resolved:    'Resolvido',
      closed:      'Fechado',
      critical:    'Crítico',
      high:        'Alto',
      medium:      'Médio',
      low:         'Baixo',
      draft:       'Rascunho',
      active:      'Ativo',
      completed:   'Concluído',
      archived:    'Arquivado'
    };
    const label = map[value] || value;
    return `<span class="badge badge-${value} ${extraClass}">${label}</span>`;
  },

  // TAGS
  tags(arr) {
    if (!Array.isArray(arr) || arr.length === 0)
      return '<span style="color:var(--text-muted)">—</span>';
    return arr.map(t => `<span class="tag">${t}</span>`).join('');
  },

  // FORMAT DATE
  date(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  // TRUNCATE
  truncate(str, len = 60) {
    if (!str) return '—';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  // SET PAGE TITLE
  setTitle(title) {
    document.getElementById('pageTitle').textContent = title;
  },

  // STEPS FORM BUILDER
  buildStepsInput(steps = []) {
    const stepsArr = Array.isArray(steps) ? steps : [];
    return `
      <div class="steps-container" id="stepsContainer">
        ${stepsArr.length > 0
          ? stepsArr.map((s, i) => UI._stepRow(i + 1, s)).join('')
          : UI._stepRow(1, '')}
      </div>
      <button type="button" class="btn btn-secondary btn-sm" id="addStepBtn" style="margin-top:8px">
        + Adicionar Passo
      </button>`;
  },

  _stepRow(num, value = '') {
    return `
      <div class="step-item">
        <span class="step-num">${num}</span>
        <input type="text" class="step-input"
          placeholder="Descreva o passo ${num}..."
          value="${String(value).replace(/"/g, '&quot;')}">
        <button type="button" class="btn-remove-step" title="Remover">✕</button>
      </div>`;
  },

  initStepsInput() {
    const container = document.getElementById('stepsContainer');
    const addBtn    = document.getElementById('addStepBtn');
    if (!container || !addBtn) return;

    const updateNums = () => {
      container.querySelectorAll('.step-item').forEach((item, i) => {
        item.querySelector('.step-num').textContent       = i + 1;
        item.querySelector('.step-input').placeholder    = `Descreva o passo ${i + 1}...`;
      });
    };

    addBtn.addEventListener('click', () => {
      const count = container.querySelectorAll('.step-item').length + 1;
      container.insertAdjacentHTML('beforeend', UI._stepRow(count, ''));
      updateNums();
      if (typeof GherkinEditor !== 'undefined') GherkinEditor.rebind();
    });

    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-remove-step')) {
        const items = container.querySelectorAll('.step-item');
        if (items.length > 1) {
          e.target.closest('.step-item').remove();
          updateNums();
        }
      }
    });

    // Inicializar Gherkin Auto-Complete nos inputs de steps
    if (typeof GherkinEditor !== 'undefined') GherkinEditor.init();
  },

  getSteps() {
    return Array.from(document.querySelectorAll('.step-input'))
      .map(i => i.value.trim())
      .filter(Boolean);
  },

  // EMPTY STATE
  emptyState(icon, title, subtitle = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h3>${title}</h3>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modalClose')?.addEventListener('click', () => UI.closeModal());
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') UI.closeModal();
  });
});