/**
 * uiUtils.js — Utilidades de UI globales (Toasts y Alertas personalizadas)
 * Reemplaza window.alert / window.confirm nativos con modales elegantes.
 */

// --- TOAST (Notificación flotante no bloqueante) ---
export function showToast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(container);
    }

    const colors = {
        success: { bg: '#22c55e', icon: '✅' },
        error:   { bg: '#ef4444', icon: '❌' },
        warning: { bg: '#f59e0b', icon: '⚠️' },
        info:    { bg: '#3b82f6', icon: 'ℹ️' },
    };
    const { bg, icon } = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${bg}; color: white; padding: 12px 18px; border-radius: 10px;
        font-size: 0.92rem; font-weight: 500; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
        display: flex; align-items: center; gap: 10px; pointer-events: auto;
        transform: translateX(120%); transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
        max-width: 320px;
    `;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    
    // Animación entrada
    requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
    }));

    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// Exponer globalmente para módulos que la llaman vía window.showToast
window.showToast = showToast;

// --- ALERT MODAL (Bloqueante por promesa, no por el navegador) ---
export function showAlert(title, message, type = 'info') {
    return new Promise((resolve) => {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', danger: '⚠️' };
        const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', danger: '#ef4444' };

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99998; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);';
        
        overlay.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 32px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 25px 60px rgba(0,0,0,0.2);">
                <div style="font-size: 3rem; margin-bottom: 16px;">${icons[type] || icons.info}</div>
                <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 1.2rem;">${title}</h3>
                <p style="margin: 0 0 24px; color: #64748b; font-size: 0.95rem; line-height: 1.5;">${message}</p>
                <button id="btn-alert-ok" style="background: ${colors[type] || colors.info}; color: white; border: none; padding: 10px 28px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;">Aceptar</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        overlay.querySelector('#btn-alert-ok').focus();
        overlay.querySelector('#btn-alert-ok').onclick = () => { overlay.remove(); resolve(); };
    });
}
