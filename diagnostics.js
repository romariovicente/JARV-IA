class SiteDiagnostics {
  constructor(options = {}) {
    this.errors = [];
    this.maxLogs = options.maxLogs || 50;
    this.isMinimized = true;
    this.uiCreated = false;

    this.init();
  }

  init() {
    // Captura os erros imediatamente no carregamento inicial
    this.catchErrors();

    // Aguarda o body existir para criar a interface visual
    if (document.body) {
      this.createDiagnosticUI();
    } else {
      window.addEventListener('DOMContentLoaded', () => this.createDiagnosticUI());
    }
  }

  catchErrors() {
    // Erros de execução JS e carregamento de recursos (imagens, scripts, CSS)
    window.addEventListener('error', (event) => {
      this.addError({
        type: 'Runtime Error',
        message: event.message || 'Erro ao carregar recurso',
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : (event.target?.src || event.target?.href || 'Desconhecido'),
        stack: event.error?.stack || 'Sem stack trace disponível',
        time: new Date().toLocaleTimeString()
      });
    }, true);

    // Promises não tratadas (Falhas de Fetch, APIs e código Async)
    window.addEventListener('unhandledrejection', (event) => {
      this.addError({
        type: 'Unhandled Rejection',
        message: event.reason?.message || String(event.reason),
        source: window.location.pathname,
        stack: event.reason?.stack || 'Sem stack trace disponível',
        time: new Date().toLocaleTimeString()
      });
    });
  }

  addError(errorData) {
    this.errors.unshift(errorData);
    if (this.errors.length > this.maxLogs) this.errors.pop();
    if (this.uiCreated) this.render();
  }

  togglePanel() {
    if (!this.uiCreated) this.createDiagnosticUI();
    this.isMinimized = !this.isMinimized;
    const bodyEl = document.getElementById('diag-body');
    const toggleEl = document.getElementById('diag-toggle');
    if (bodyEl) bodyEl.style.display = this.isMinimized ? 'none' : 'flex';
    if (toggleEl) toggleEl.innerText = this.isMinimized ? '▼' : '▲';
  }

  createDiagnosticUI() {
    if (this.uiCreated || !document.body) return;

    const container = document.createElement('div');
    container.id = 'site-diagnostics-panel';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      max-height: 500px;
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: monospace;
      font-size: 12px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #45475a;
    `;

    container.innerHTML = `
      <div id="diag-header" style="background: #181825; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid #313244;">
        <span style="font-weight: bold; color: #f38ba8;">🚨 Diagnóstico (<span id="diag-count">0</span>)</span>
        <div>
          <button id="diag-clear" style="background: #313244; color: #cdd6f4; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; margin-right: 5px;">Limpar</button>
          <button id="diag-toggle" style="background: none; color: #cdd6f4; border: none; cursor: pointer;">▼</button>
        </div>
      </div>
      <div id="diag-body" style="padding: 10px; overflow-y: auto; display: none; flex-direction: column; gap: 8px;">
        <div style="color: #a6adc8; text-align: center;">Nenhum erro detectado no momento.</div>
      </div>
    `;

    document.body.appendChild(container);
    this.uiCreated = true;

    // Eventos do Painel
    document.getElementById('diag-header').addEventListener('click', (e) => {
      if (e.target.id === 'diag-clear') return;
      this.togglePanel();
    });

    document.getElementById('diag-clear').addEventListener('click', () => {
      this.errors = [];
      this.render();
    });

    // Renderiza erros ocorridos antes do DOM terminar de carregar
    this.render();
  }

  escapeHTML(str) {
    return String(str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  render() {
    if (!this.uiCreated) return;

    const countEl = document.getElementById('diag-count');
    const bodyEl = document.getElementById('diag-body');

    if (countEl) countEl.innerText = this.errors.length;
    if (!bodyEl) return;

    if (this.errors.length === 0) {
      bodyEl.innerHTML = '<div style="color: #a6adc8; text-align: center;">Nenhum erro detectado no momento.</div>';
      return;
    }

    bodyEl.innerHTML = this.errors.map(err => `
      <div style="background: #313244; border-left: 4px solid #f38ba8; padding: 8px; border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong style="color: #f38ba8;">${this.escapeHTML(err.type)}</strong>
          <span style="color: #6c7086;">${this.escapeHTML(err.time)}</span>
        </div>
        <div style="color: #cdd6f4; margin-bottom: 4px; word-break: break-word;">${this.escapeHTML(err.message)}</div>
        <div style="color: #a6adc8; font-size: 10px; word-break: break-all;"><strong>Origem:</strong> ${this.escapeHTML(err.source)}</div>
        <details style="margin-top: 4px; color: #89b4fa; cursor: pointer;">
          <summary>Stack Trace</summary>
          <pre style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 10px; color: #bac2de; background: #181825; padding: 6px; border-radius: 4px;">${this.escapeHTML(err.stack)}</pre>
        </details>
      </div>
    `).join('');
  }
}

// Inicialização síncrona imediata no <head>
window.siteDiagnostics = new SiteDiagnostics();
