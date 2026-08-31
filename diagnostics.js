/**
 * J.A.R.V.I.S. Diagnostics Engine v6.0
 * Módulo de captura global de exceções e auditoria de UI.
 */

class SiteDiagnostics {
  constructor(options = {}) {
    this.errors = [];
    this.maxLogs = options.maxLogs || 50;
    this.isMinimized = true;
    this.uiCreated = false;

    this.init();
  }

  init() {
    this.catchErrors();
    if (document.body) {
      this.createDiagnosticUI();
    } else {
      window.addEventListener('DOMContentLoaded', () => this.createDiagnosticUI());
    }
  }

  catchErrors() {
    window.addEventListener('error', (event) => {
      this.addError({
        type: 'Runtime Error',
        message: event.message || 'Erro ao carregar recurso',
        source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : (event.target?.src || event.target?.href || 'Desconhecido'),
        stack: event.error?.stack || 'Sem stack trace disponível',
        time: new Date().toLocaleTimeString()
      });
    }, true);

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
    // Alterado para posicionar no topo direito e liberar a área de input/botão inferior
    container.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      width: 360px;
      max-height: 450px;
      background: #0a0a10;
      color: #00ffff;
      font-family: monospace;
      font-size: 12px;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.25);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #00ffff;
    `;

    container.innerHTML = `
      <div id="diag-header" style="background: #11111b; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid #00ffff;">
        <span style="font-weight: bold; color: #ff5555;">🚨 Diagnóstico J.A.R.V.I.S. (<span id="diag-count">0</span>)</span>
        <div>
          <button id="diag-clear" style="background: #222; color: #00ffff; border: 1px solid #00ffff; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 10px;">Limpar</button>
          <button id="diag-toggle" style="background: none; color: #00ffff; border: none; cursor: pointer;">▼</button>
        </div>
      </div>
      <div id="diag-body" style="padding: 10px; overflow-y: auto; display: none; flex-direction: column; gap: 8px; max-height: 350px;">
        <div style="color: #8b949e; text-align: center;">Nenhum erro detectado no momento.</div>
      </div>
    `;

    document.body.appendChild(container);
    this.uiCreated = true;

    document.getElementById('diag-header').addEventListener('click', (e) => {
      if (e.target.id === 'diag-clear') return;
      this.togglePanel();
    });

    document.getElementById('diag-clear').addEventListener('click', () => {
      this.errors = [];
      this.render();
    });

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
      bodyEl.innerHTML = '<div style="color: #8b949e; text-align: center;">Nenhum erro detectado no momento.</div>';
      return;
    }

    bodyEl.innerHTML = this.errors.map(err => `
      <div style="background: #161b22; border-left: 4px solid #ff5555; padding: 8px; border-radius: 4px; border: 1px solid #30363d;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <strong style="color: #ff5555;">${this.escapeHTML(err.type)}</strong>
          <span style="color: #8b949e;">${this.escapeHTML(err.time)}</span>
        </div>
        <div style="color: #e6edf3; margin-bottom: 4px; word-break: break-word;">${this.escapeHTML(err.message)}</div>
        <div style="color: #8b949e; font-size: 10px; word-break: break-all;"><strong>Origem:</strong> ${this.escapeHTML(err.source)}</div>
        <details style="margin-top: 4px; color: #00ffff; cursor: pointer;">
          <summary>Stack Trace</summary>
          <pre style="margin: 4px 0 0 0; white-space: pre-wrap; font-size: 10px; color: #8b949e; background: #0d1117; padding: 6px; border-radius: 4px; border: 1px solid #30363d;">${this.escapeHTML(err.stack)}</pre>
        </details>
      </div>
    `).join('');
  }
}

window.siteDiagnostics = new SiteDiagnostics();
