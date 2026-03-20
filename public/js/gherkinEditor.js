/**
 * GherkinEditor - Motor de Auto-Complete BDD para campos de passos de teste.
 * Oferece sugestões inteligentes baseadas em palavras-chave Gherkin (Dado/Quando/Então)
 * e frases previamente utilizadas no projeto.
 */
const GherkinEditor = {
  // Palavras-chave BDD em Português e Inglês
  keywords: [
    { keyword: 'Dado que ', desc: 'Pré-condição do cenário' },
    { keyword: 'Quando ', desc: 'Ação executada pelo usuário' },
    { keyword: 'Então ', desc: 'Resultado esperado' },
    { keyword: 'E ', desc: 'Condição adicional' },
    { keyword: 'Mas ', desc: 'Exceção ao resultado' },
    { keyword: 'Given ', desc: 'Scenario precondition' },
    { keyword: 'When ', desc: 'User action' },
    { keyword: 'Then ', desc: 'Expected result' },
    { keyword: 'And ', desc: 'Additional condition' },
  ],

  // Frases comuns pré-definidas que aceleram a digitação
  commonPhrases: [
    'Dado que o usuário está logado no sistema',
    'Dado que o usuário está na tela de login',
    'Dado que o banco de dados contém registros de teste',
    'Dado que a API está disponível e respondendo',
    'Dado que o usuário possui permissão de administrador',
    'Quando o usuário clica no botão de login',
    'Quando o usuário preenche o campo de email',
    'Quando o usuário preenche o campo de senha',
    'Quando o usuário submete o formulário',
    'Quando o usuário navega para a página principal',
    'Quando o usuário seleciona a opção no menu',
    'Quando a página é carregada completamente',
    'Então o sistema deve exibir a mensagem de sucesso',
    'Então o sistema deve redirecionar para a home',
    'Então o sistema deve exibir mensagem de erro',
    'Então o campo deve estar destacado em vermelho',
    'Então o registro deve ser salvo no banco de dados',
    'Então o botão deve estar desabilitado',
    'E o usuário deve visualizar a confirmação',
    'E o sistema deve enviar um email de notificação',
    'Mas o sistema não deve permitir acesso sem autenticação',
  ],

  // Cache de frases customizadas do projeto (alimentado pelas steps salvas anteriormente)
  projectPhrases: [],

  /**
   * Inicializa o autocomplete em todos os inputs de step visíveis.
   * Deve ser chamado após montar o DOM dos passos.
   */
  init() {
    this._loadProjectPhrases();
    this._attachToAll();
  },

  _loadProjectPhrases() {
    try {
      const saved = localStorage.getItem('gherkin_phrases');
      if (saved) this.projectPhrases = JSON.parse(saved);
    } catch(e) { /* silencioso */ }
  },

  /**
   * Salva uma nova frase no banco local para futuras sugestões.
   */
  learnPhrase(phrase) {
    if (!phrase || phrase.length < 10) return;
    const clean = phrase.trim();
    if (this.projectPhrases.includes(clean)) return;
    this.projectPhrases.push(clean);
    // Limita a 200 frases no cache
    if (this.projectPhrases.length > 200) this.projectPhrases.shift();
    try {
      localStorage.setItem('gherkin_phrases', JSON.stringify(this.projectPhrases));
    } catch(e) { /* silencioso */ }
  },

  /**
   * Anexa o listener de autocomplete em todos os `.step-input`.
   */
  _attachToAll() {
    document.querySelectorAll('.step-input').forEach(input => {
      if (input.dataset.gherkinBound) return; // Já vinculado
      input.dataset.gherkinBound = 'true';
      this._attachTo(input);
    });
  },

  /**
   * Anexa evento de autocomplete a um input específico.
   */
  _attachTo(input) {
    let dropdown = null;

    const showDropdown = (suggestions) => {
      this._removeDropdown(input);
      if (suggestions.length === 0) return;

      dropdown = document.createElement('div');
      dropdown.className = 'gherkin-dropdown';
      dropdown.style.cssText = `
        position:absolute; z-index:9999; background:var(--bg-primary); 
        border:1px solid var(--border); border-radius:8px; 
        box-shadow:0 8px 24px rgba(0,0,0,0.15); max-height:220px; 
        overflow-y:auto; width:${input.offsetWidth}px;
      `;

      suggestions.slice(0, 8).forEach((s, i) => {
        const item = document.createElement('div');
        item.className = 'gherkin-item';
        item.style.cssText = `
          padding:10px 14px; cursor:pointer; font-size:13px; 
          border-bottom:1px solid var(--border); display:flex; 
          align-items:center; gap:8px; transition:background 0.15s;
        `;
        
        // Highlight de keyword na sugestão
        let displayText = s.text;
        const kwMatch = this.keywords.find(k => s.text.startsWith(k.keyword));
        if (kwMatch) {
          displayText = `<span style="color:var(--primary); font-weight:600;">${kwMatch.keyword}</span>${s.text.slice(kwMatch.keyword.length)}`;
        }
        
        item.innerHTML = `
          <span style="font-size:14px;">${s.icon || '💡'}</span>
          <span style="flex:1;">${displayText}</span>
          ${s.tag ? `<span style="font-size:10px; background:var(--bg-secondary); padding:2px 6px; border-radius:4px; color:var(--text-muted);">${s.tag}</span>` : ''}
        `;
        
        item.addEventListener('mouseenter', () => item.style.background = 'var(--bg-secondary)');
        item.addEventListener('mouseleave', () => item.style.background = 'transparent');
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = s.text;
          this._removeDropdown(input);
          this._highlightInput(input);
          // Focar no próximo passo se existir
          const nextStep = input.closest('.step-item')?.nextElementSibling?.querySelector('.step-input');
          if (nextStep) setTimeout(() => nextStep.focus(), 100);
        });
        
        dropdown.appendChild(item);
      });

      // Posicionar
      const rect = input.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = (rect.bottom + 4) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = rect.width + 'px';
      document.body.appendChild(dropdown);
    };

    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      this._highlightInput(input);
      
      if (val.length < 1) {
        // Mostrar keywords BDD como sugestão inicial
        const kwSuggestions = this.keywords.map(k => ({
          text: k.keyword,
          icon: k.keyword.startsWith('Dado') || k.keyword.startsWith('Given') ? '📋' :
                k.keyword.startsWith('Quando') || k.keyword.startsWith('When') ? '👆' :
                k.keyword.startsWith('Então') || k.keyword.startsWith('Then') ? '✅' : '➕',
          tag: k.desc
        }));
        showDropdown(kwSuggestions);
        return;
      }

      const suggestions = [];

      // 1. Keywords que dão match
      this.keywords.forEach(k => {
        if (k.keyword.toLowerCase().startsWith(val)) {
          suggestions.push({ text: k.keyword, icon: '🏷️', tag: k.desc });
        }
      });

      // 2. Frases comuns que dão match
      this.commonPhrases.forEach(p => {
        if (p.toLowerCase().includes(val) && !suggestions.find(s => s.text === p)) {
          suggestions.push({ text: p, icon: '📝', tag: 'sugestão' });
        }
      });

      // 3. Frases salvas do projeto
      this.projectPhrases.forEach(p => {
        if (p.toLowerCase().includes(val) && !suggestions.find(s => s.text === p)) {
          suggestions.push({ text: p, icon: '🔄', tag: 'seu projeto' });
        }
      });

      showDropdown(suggestions);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length < 1) {
        // Ao focar num campo vazio, mostra keywords BDD
        const kwSuggestions = this.keywords.map(k => ({
          text: k.keyword,
          icon: k.keyword.startsWith('Dado') || k.keyword.startsWith('Given') ? '📋' :
                k.keyword.startsWith('Quando') || k.keyword.startsWith('When') ? '👆' :
                k.keyword.startsWith('Então') || k.keyword.startsWith('Then') ? '✅' : '➕',
          tag: k.desc
        }));
        showDropdown(kwSuggestions);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => this._removeDropdown(input), 200);
      // Aprender a frase ao sair do campo
      if (input.value.trim().length >= 10) {
        this.learnPhrase(input.value.trim());
      }
    });

    // Suporte a navegação por teclado
    input.addEventListener('keydown', (e) => {
      const dd = document.querySelector('.gherkin-dropdown');
      if (!dd) return;
      const items = dd.querySelectorAll('.gherkin-item');
      const active = dd.querySelector('.gherkin-item-active');
      let idx = Array.from(items).indexOf(active);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (active) active.classList.remove('gherkin-item-active');
        idx = (idx + 1) % items.length;
        items[idx].classList.add('gherkin-item-active');
        items[idx].style.background = 'var(--bg-secondary)';
        if (active) active.style.background = 'transparent';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (active) active.classList.remove('gherkin-item-active');
        idx = idx <= 0 ? items.length - 1 : idx - 1;
        items[idx].classList.add('gherkin-item-active');
        items[idx].style.background = 'var(--bg-secondary)';
        if (active) active.style.background = 'transparent';
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (active) {
          e.preventDefault();
          active.dispatchEvent(new MouseEvent('mousedown'));
        } else if (items.length > 0 && e.key === 'Tab') {
          e.preventDefault();
          items[0].dispatchEvent(new MouseEvent('mousedown'));
        }
      } else if (e.key === 'Escape') {
        this._removeDropdown(input);
      }
    });
  },

  /**
   * Aplica coloração inline baseada na keyword BDD detectada.
   */
  _highlightInput(input) {
    const val = input.value.trim();
    let color = 'var(--text-color)';
    
    if (/^(Dado que|Given)\s/i.test(val)) color = '#2196F3';
    else if (/^(Quando|When)\s/i.test(val)) color = '#FF9800';
    else if (/^(Então|Then)\s/i.test(val)) color = '#4CAF50';
    else if (/^(E|And|Mas|But)\s/i.test(val)) color = '#9C27B0';

    input.style.color = color;
    input.style.fontWeight = color !== 'var(--text-color)' ? '500' : 'normal';
  },

  /**
   * Remove dropdown atual.
   */
  _removeDropdown() {
    document.querySelectorAll('.gherkin-dropdown').forEach(d => d.remove());
  },

  /**
   * Revincula a novos inputs após adição dinâmica de passos.
   */
  rebind() {
    this._attachToAll();
  }
};
