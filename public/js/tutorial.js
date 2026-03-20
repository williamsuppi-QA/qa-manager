const Tutorial = {
  render() {
    UI.setTitle('Tutorial do Sistema');
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="guide-hero">
        <h1>📖 Tutorial do QA Manager</h1>
        <p>Aprenda a utilizar cada módulo do sistema, entenda o fluxo ideal de trabalho e descubra quais áreas dependem umas das outras.</p>
      </div>

      <div class="guide-section">
        <h2>🗺️ Fluxo Geral do Sistema</h2>
        <p>O QA Manager segue um fluxo lógico que reflete o dia-a-dia real de um QA profissional:</p>
        <div style="background:var(--bg-primary); padding:20px; border-radius:var(--radius); margin:12px 0; text-align:center; font-size:13px; line-height:2.2;">
          <strong style="color:var(--accent);">Projeto</strong> → 
          <strong style="color:var(--accent);">Casos de Teste</strong> → 
          <strong style="color:var(--accent);">Plano de Teste</strong> → 
          <strong style="color:var(--accent);">Execução</strong> → 
          <strong style="color:var(--danger);">Bug Reports</strong> → 
          <strong style="color:var(--success);">Rastreabilidade</strong> → 
          <strong style="color:var(--purple);">Integrações</strong>
        </div>
        <div class="guide-tip">💡 Comece sempre criando um <strong>Projeto</strong> (seletor no topo). Todo o conteúdo está vinculado ao projeto selecionado.</div>
      </div>

      <div class="guide-section">
        <h2>📊 1. Dashboard</h2>
        <p>Visão geral com métricas consolidadas do projeto ativo: total de casos, bugs abertos, últimas atividades e gráficos de distribuição.</p>
        <h3>Depende de:</h3>
        <span class="guide-dep">Projeto selecionado</span>
        <span class="guide-dep">Dados de Casos, Bugs e Execuções</span>
        <div class="guide-tip">💡 O Dashboard atualiza automaticamente conforme você alimenta o sistema com dados.</div>
      </div>

      <div class="guide-section">
        <h2>✅ 2. Casos de Teste</h2>
        <p>Onde tudo começa! Cada caso descreve <strong>o que testar</strong>, os <strong>passos de execução</strong>, o <strong>resultado esperado</strong> e metadados (prioridade, severidade, tags).</p>
        <h3>Funcionalidades:</h3>
        <ul>
          <li>Criar, editar, visualizar e excluir casos de teste</li>
          <li>Auto-complete BDD (Gherkin) nos passos: digite "Dado", "Quando" ou "Então" e o sistema sugere frases prontas</li>
          <li>Marcar como <strong>Global</strong> para disponibilizar na Biblioteca de Suítes</li>
          <li>Filtros por status, prioridade e busca textual</li>
        </ul>
        <h3>Depende de:</h3>
        <span class="guide-dep">Projeto selecionado</span>
        <div class="guide-tip">💡 Use o formato BDD (Dado/Quando/Então) para padronizar a escrita da equipe!</div>
      </div>

      <div class="guide-section">
        <h2>📋 3. Planos de Teste</h2>
        <p>Agrupa Casos de Teste em conjuntos lógicos (ex: "Regressão Sprint 12", "Smoke Test Produção"). Define escopo, objetivo e os casos vinculados.</p>
        <h3>Depende de:</h3>
        <span class="guide-dep">Casos de Teste criados</span>
        <div class="guide-tip">💡 Crie o Plano DEPOIS de cadastrar os Casos. Ao criar um Plano, você seleciona quais Casos fazem parte dele.</div>
      </div>

      <div class="guide-section">
        <h2>▶️ 4. Execuções de Teste</h2>
        <p>Onde você realmente <strong>executa</strong> os testes! Para cada execução, o sistema lista todos os casos do plano e você marca o resultado (Passou/Falhou/Bloqueado) um a um.</p>
        <h3>Depende de:</h3>
        <span class="guide-dep">Plano de Teste criado</span>
        <span class="guide-dep">Casos vinculados ao Plano</span>
        <div class="guide-tip">💡 Crie uma Execução por ciclo de teste. Mesmo plano pode ter múltiplas execuções (ex: re-teste após correção).</div>
      </div>

      <div class="guide-section">
        <h2>🐛 5. Bug Reports</h2>
        <p>Registre defeitos encontrados com passos de reprodução, evidências (upload de screenshots), severidade, responsável e status.</p>
        <h3>Funcionalidades extras:</h3>
        <ul>
          <li><strong>🚀 Enviar p/ Jira:</strong> No modal de visualização, exporte o bug direto para o Jira (requer configuração em Integrações)</li>
          <li><strong>Upload de evidências:</strong> Anexe screenshots e vídeos diretamente</li>
        </ul>
        <h3>Depende de:</h3>
        <span class="guide-dep">Projeto selecionado</span>
        <span class="guide-dep">Jira configurado (para exportação)</span>
      </div>

      <div class="guide-section">
        <h2>📊 6. Rastreabilidade</h2>
        <p>Gera uma <strong>Matriz de Rastreabilidade</strong> cruzando Planos de Teste com os resultados de cada execução. Ideal para comprovar cobertura de testes numa release.</p>
        <h3>Funcionalidades:</h3>
        <ul>
          <li>Métricas executivas: Cobertura %, Taxa de Aprovação %</li>
          <li><strong>Certificado de Release PDF:</strong> Documento profissional com selo automático de aprovação</li>
        </ul>
        <h3>Depende de:</h3>
        <span class="guide-dep">Plano de Teste</span>
        <span class="guide-dep">Execuções realizadas</span>
        <div class="guide-tip">💡 Este é o módulo para apresentar ao PO ou Gerente na review da Sprint!</div>
      </div>

      <div class="guide-section">
        <h2>📚 7. Biblioteca Global</h2>
        <p>Repositório central de Casos de Teste marcados como "Global". Permite clonar suítes completas entre projetos com um clique.</p>
        <h3>Como usar:</h3>
        <ol>
          <li>Ao criar/editar um Caso de Teste, marque o checkbox "Disponível na Biblioteca Global"</li>
          <li>Acesse a aba Biblioteca — os casos aparecem agrupados por categoria</li>
          <li>Selecione e clique em "Clonar para o Projeto Atual"</li>
        </ol>
        <h3>Depende de:</h3>
        <span class="guide-dep">Casos marcados como Global</span>
      </div>

      <div class="guide-section">
        <h2>🔗 8. Integrações</h2>
        <p>Centro de configuração de todas as conexões externas do sistema.</p>
        <div class="guide-grid">
          <div>
            <h3>📸 Quick Capture</h3>
            <p>Bookmarklet que abre um popup de captura rápida de bugs em qualquer site. Arraste para a barra de favoritos!</p>
          </div>
          <div>
            <h3>🚀 Jira Outbound</h3>
            <p>Configure URL, email e token do Jira para habilitar a exportação de bugs com 1 clique.</p>
          </div>
          <div>
            <h3>📡 Webhooks Inbound</h3>
            <p>Gere tokens para que ferramentas CI/CD (Cypress, Jenkins) abram bugs automaticamente.</p>
          </div>
          <div>
            <h3>🔑 Tokens de Acesso</h3>
            <p>Gerencie e revogue tokens de integração para controle de segurança.</p>
          </div>
        </div>
      </div>

      <div class="guide-section">
        <h2>📤 9. Exportar Dados</h2>
        <p>Exporte Casos de Teste, Bug Reports, Planos e Scripts em formato <strong>CSV</strong> ou <strong>JSON</strong> para backups ou análise externa.</p>
        <h3>Depende de:</h3>
        <span class="guide-dep">Dados cadastrados no projeto</span>
      </div>

      <div class="guide-section" style="border-left:3px solid var(--accent);">
        <h2>🔄 Mapa de Dependências</h2>
        <p>Resumo de qual módulo depende de qual:</p>
        <div style="background:var(--bg-primary); padding:16px; border-radius:var(--radius); font-size:13px; line-height:2;">
          <strong>Planos de Teste</strong> ← precisam de <strong>Casos de Teste</strong><br/>
          <strong>Execuções</strong> ← precisam de <strong>Planos de Teste</strong> (e seus Casos)<br/>
          <strong>Rastreabilidade</strong> ← precisa de <strong>Plano</strong> + <strong>Execuções realizadas</strong><br/>
          <strong>Exportação Jira</strong> ← precisa de <strong>Credenciais Jira configuradas</strong><br/>
          <strong>Quick Capture</strong> ← precisa de <strong>Token gerado em Integrações</strong><br/>
          <strong>Biblioteca</strong> ← precisa de <strong>Casos marcados como Global</strong><br/>
          <strong>Dashboard / Bugs / Scripts</strong> ← funcionam <strong>independentemente</strong>
        </div>
      </div>
    `;
  }
};
