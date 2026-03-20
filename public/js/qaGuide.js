const QAGuide = {
  render() {
    UI.setTitle('Guia para QA Junior');
    const pc = document.getElementById('pageContent');
    pc.innerHTML = `
      <div class="guide-hero">
        <h1>🎓 Guia para QA Junior</h1>
        <p>Tudo que você precisa saber para começar na área de Qualidade de Software. Conceitos, boas práticas e dicas do dia-a-dia.</p>
      </div>

      <div class="guide-section" style="border-left:3px solid var(--accent);">
        <h2>🤔 O que faz um QA?</h2>
        <p>O QA (Quality Assurance) é o profissional responsável por garantir que o software funcione conforme esperado antes de chegar ao usuário final. Não é "apenas testar" — é <strong>prevenir defeitos, validar requisitos e garantir qualidade</strong> em todo o ciclo de desenvolvimento.</p>
        <div class="guide-tip">💡 Um bom QA não apenas encontra bugs — ele ajuda a <strong>evitá-los</strong> desde o início do projeto.</div>
      </div>

      <div class="guide-section">
        <h2>📚 Conceitos Essenciais</h2>
        <div class="guide-grid">
          <div>
            <h3>🧪 Caso de Teste</h3>
            <p>Documento que descreve <strong>o que</strong> testar, <strong>como</strong> testar (passos), e <strong>qual o resultado esperado</strong>. É a unidade básica do trabalho de QA.</p>
          </div>
          <div>
            <h3>📋 Plano de Teste</h3>
            <p>Conjunto organizado de Casos de Teste com um objetivo (ex: "Validar checkout da Sprint 5"). Define o escopo do que será testado.</p>
          </div>
          <div>
            <h3>▶️ Execução de Teste</h3>
            <p>O ato de <strong>executar</strong> os casos do plano, marcando cada um como Passou, Falhou ou Bloqueado. Gera evidências para rastreabilidade.</p>
          </div>
          <div>
            <h3>🐛 Bug Report</h3>
            <p>Relatório detalhado de um defeito encontrado. Deve conter: título claro, passos de reprodução, resultado esperado vs. atual, e evidências.</p>
          </div>
          <div>
            <h3>📊 Rastreabilidade</h3>
            <p>Capacidade de provar que cada requisito foi testado. A Matriz de Rastreabilidade cruza casos com resultados de execução.</p>
          </div>
          <div>
            <h3>🥒 BDD (Behavior Driven Development)</h3>
            <p>Formato de escrita de testes usando linguagem natural: <code>Dado que</code> (pré-condição), <code>Quando</code> (ação), <code>Então</code> (resultado esperado).</p>
          </div>
        </div>
      </div>

      <div class="guide-section">
        <h2>📝 Como Escrever um Bom Caso de Teste</h2>
        <ol>
          <li><strong>Título claro e objetivo:</strong> "Verificar login com credenciais válidas" é melhor que "Teste de login"</li>
          <li><strong>Pré-condições:</strong> O que precisa estar configurado antes? (ex: "Usuário cadastrado no sistema")</li>
          <li><strong>Passos numerados e específicos:</strong> Evite "Faça o login". Prefira: "1. Acesse /login. 2. Preencha email. 3. Preencha senha. 4. Clique em Entrar."</li>
          <li><strong>Resultado Esperado explícito:</strong> "O sistema redireciona para a Dashboard e exibe o nome do usuário na topbar"</li>
          <li><strong>Um teste = uma validação:</strong> Não teste 5 coisas num único caso. Quebre em casos menores e focados.</li>
        </ol>
        <div class="guide-tip">💡 Use o formato <strong>Dado/Quando/Então</strong> nos passos deste sistema — o auto-complete sugere frases prontas!</div>
      </div>

      <div class="guide-section">
        <h2>🐛 Como Reportar um Bug Eficiente</h2>
        <p>Um bug report bem escrito acelera a correção. Siga esta estrutura:</p>
        <div style="background:var(--bg-primary); padding:16px; border-radius:var(--radius); font-size:13px; line-height:1.8; margin:10px 0;">
          <strong>Título:</strong> [Tela/Módulo] + Problema objetivo<br/>
          <em>Ex: "[Checkout] Botão 'Finalizar Compra' não responde no Safari mobile"</em><br/><br/>
          <strong>Passos para Reproduzir:</strong><br/>
          1. Acessar /checkout com carrinho de 2+ itens<br/>
          2. Selecionar "Cartão de Crédito" como método de pagamento<br/>
          3. Preencher dados fictícios e clicar em "Finalizar Compra"<br/><br/>
          <strong>Resultado Esperado:</strong> Sistema processa o pagamento e exibe confirmação<br/>
          <strong>Resultado Atual:</strong> Botão fica com loading infinito, nenhuma requisição é enviada<br/><br/>
          <strong>Evidência:</strong> Screenshot/vídeo anexado<br/>
          <strong>Ambiente:</strong> Safari 17.2 / iOS 17.1 / iPhone 15 Pro
        </div>
        <div class="guide-tip">💡 Sempre preencha o <strong>navegador, SO e versão</strong>. Muitos bugs são específicos de plataforma.</div>
      </div>

      <div class="guide-section">
        <h2>⚡ Severidade vs. Prioridade</h2>
        <p>São conceitos diferentes! Entenda a diferença:</p>
        <div class="guide-grid">
          <div style="background:var(--bg-primary); padding:14px; border-radius:var(--radius);">
            <h3 style="margin-top:0;">🔴 Severidade</h3>
            <p><strong>Impacto técnico</strong> do defeito no sistema:</p>
            <ul>
              <li><strong>Crítica:</strong> Sistema inoperante, perda de dados</li>
              <li><strong>Alta:</strong> Funcionalidade principal comprometida</li>
              <li><strong>Média:</strong> Funcionalidade secundária com problema</li>
              <li><strong>Baixa:</strong> Estético, texto errado, alinhamento</li>
            </ul>
          </div>
          <div style="background:var(--bg-primary); padding:14px; border-radius:var(--radius);">
            <h3 style="margin-top:0;">⚡ Prioridade</h3>
            <p><strong>Urgência de negócio</strong> para correção:</p>
            <ul>
              <li><strong>Alta:</strong> Precisa ser corrigido AGORA</li>
              <li><strong>Média:</strong> Pode ir na próxima sprint</li>
              <li><strong>Baixa:</strong> Backlog, quando houver tempo</li>
            </ul>
            <p style="margin-top:8px;"><em>Ex: Um erro de ortografia na home pode ter severidade BAIXA mas prioridade ALTA se impacta a marca.</em></p>
          </div>
        </div>
      </div>

      <div class="guide-section">
        <h2>🧰 Tipos de Teste que Você Vai Fazer</h2>
        <div class="guide-grid">
          <div>
            <h3>🔍 Teste Funcional</h3>
            <p>Verifica se cada funcionalidade faz o que deveria. Ex: "Usuário consegue realizar cadastro".</p>
          </div>
          <div>
            <h3>🔄 Teste de Regressão</h3>
            <p>Retestar funcionalidades antigas após mudanças no código. Garante que nada "quebrou".</p>
          </div>
          <div>
            <h3>💨 Smoke Test</h3>
            <p>Teste rápido e superficial. Valida se as funcionalidades mais críticas funcionam no básico. Feito logo após deploy.</p>
          </div>
          <div>
            <h3>🔀 Teste Exploratório</h3>
            <p>Sem roteiro fixo. O QA "explora" o sistema criativamente tentando quebrá-lo. Experiência ajuda muito aqui.</p>
          </div>
          <div>
            <h3>📱 Teste de Compatibilidade</h3>
            <p>Testar em diferentes navegadores (Chrome, Safari, Firefox) e dispositivos (desktop, tablet, mobile).</p>
          </div>
          <div>
            <h3>🧩 Teste de Integração</h3>
            <p>Verifica se módulos diferentes funcionam corretamente juntos. Ex: "Carrinho + Pagamento + Email de confirmação".</p>
          </div>
        </div>
      </div>

      <div class="guide-section">
        <h2>🚀 Dicas para o Dia-a-Dia</h2>
        <ol>
          <li><strong>Leia os requisitos ANTES de testar.</strong> Sem entender o que o sistema deveria fazer, como saber se está certo?</li>
          <li><strong>Participe das reuniões de refinamento.</strong> Quanto mais contexto você tiver, melhores serão seus testes.</li>
          <li><strong>Teste os cenários negativos.</strong> O que acontece se o campo ficar vazio? Se colar um texto enorme? Se clicar 10x seguidas?</li>
          <li><strong>Automatize o que for repetitivo.</strong> Se você testa a mesma coisa toda sprint, considere automatizar com Cypress ou Playwright.</li>
          <li><strong>Comunique-se com os devs.</strong> Um bug report claro economiza horas de investigação. Vocês são aliados, não adversários.</li>
          <li><strong>Documente tudo.</strong> Screenshots, vídeos, logs do console — quanto mais evidência, mais rápido o dev corrige.</li>
          <li><strong>Use a Biblioteca Global deste sistema!</strong> Crie suítes reutilizáveis para smoke tests e regressão. Não reescreva a roda toda sprint.</li>
        </ol>
      </div>

      <div class="guide-section" style="border-left:3px solid var(--purple);">
        <h2>📌 Glossário Rápido</h2>
        <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 16px; font-size:13px; line-height:1.8;">
          <strong>QA</strong> <span>Quality Assurance — Garantia de Qualidade</span>
          <strong>TC</strong> <span>Test Case — Caso de Teste</span>
          <strong>TP</strong> <span>Test Plan — Plano de Teste</span>
          <strong>BDD</strong> <span>Behavior Driven Development — Desenvolvimento Guiado por Comportamento</span>
          <strong>CI/CD</strong> <span>Continuous Integration / Delivery — Integração e Entrega Contínua</span>
          <strong>Sprint</strong> <span>Ciclo de desenvolvimento ágil (geralmente 2 semanas)</span>
          <strong>Regressão</strong> <span>Re-teste de funcionalidades existentes após mudanças</span>
          <strong>Smoke Test</strong> <span>Teste rápido e superficial para validar build</span>
          <strong>Edge Case</strong> <span>Cenário extremo ou incomum que pode revelar bugs</span>
          <strong>Flaky Test</strong> <span>Teste instável que às vezes passa, às vezes falha sem motivo aparente</span>
        </div>
      </div>
    `;
  }
};
