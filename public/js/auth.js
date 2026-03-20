// ── AUTH HELPERS ─────────────────────────────────────────────────
const Auth = {
  getToken() {
    return localStorage.getItem('qa_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('qa_user'));
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  logout() {
    localStorage.removeItem('qa_token');
    localStorage.removeItem('qa_user');
    window.location.href = '/login.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },

  // Adiciona o token em todas as requisições fetch
  async fetch(url, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(url, { ...options, headers });

    // Token expirado ou inválido
    if (res.status === 401 || res.status === 403) {
      this.logout();
      return;
    }

    return res;
  }
};

// ── PROTEÇÃO DE PÁGINA ───────────────────────────────────────────
(function () {
  const isLoginPage = window.location.pathname.includes('login.html');

  if (!isLoginPage && !Auth.isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }

  if (!isLoginPage && Auth.isLoggedIn()) {
    // Injeta o header com info do usuário e botão de logout
    const user = Auth.getUser();
    if (user) {
      const topbarRight = document.querySelector('.topbar-right');
      const header = document.createElement('div');
      header.id = 'authHeader';

      if (topbarRight) {
        header.style.cssText = `
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: 12px;
          padding-left: 16px;
          border-left: 1px solid rgba(128, 128, 128, 0.3);
          font-family: inherit;
          font-size: 13px;
        `;
        header.innerHTML = `
          <span>👤 <strong>${user.name}</strong></span>
          <span style="color: #888">|</span>
          <span style="color: #3498db">${user.role === 'admin' ? '⚙️ Admin' : '👁️ Usuário'}</span>
          <button onclick="Auth.logout()" style="
            background: rgba(231,76,60,0.1);
            border: 1px solid rgba(231,76,60,0.3);
            color: #e74c3c;
            padding: 4px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 4px;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(231,76,60,0.2)'"
             onmouseout="this.style.background='rgba(231,76,60,0.1)'">
            Sair
          </button>
        `;
        topbarRight.appendChild(header);
      } else {
        header.style.cssText = `
          position: fixed;
          top: 0; right: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(10px);
          color: #fff;
          padding: 8px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-family: 'Segoe UI', sans-serif;
          font-size: 13px;
          border-bottom-left-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        `;
        header.innerHTML = `
          <span>👤 <strong>${user.name}</strong></span>
          <span style="color:rgba(255,255,255,0.4)">|</span>
          <span style="color:#3498db">${user.role === 'admin' ? '⚙️ Admin' : '👁️ Usuário'}</span>
          <button onclick="Auth.logout()" style="
            background: rgba(231,76,60,0.2);
            border: 1px solid rgba(231,76,60,0.4);
            color: #e74c3c;
            padding: 4px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(231,76,60,0.4)'"
             onmouseout="this.style.background='rgba(231,76,60,0.2)'">
            Sair
          </button>
        `;
        document.body.appendChild(header);
      }
    }
  }
})();