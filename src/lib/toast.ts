// Small DOM-based toast helper — works without React context so it can be used anywhere quickly
export function toast(message: string, opts?: { type?: 'success' | 'error' | 'info'; duration?: number }) {
  const { type = 'info', duration = 3500 } = opts || {};
  const id = `toast-${Date.now()}`;
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', 'status');
  el.style.position = 'fixed';
  el.style.right = '16px';
  el.style.bottom = location.pathname.startsWith('/admin') ? 'calc(88px + env(safe-area-inset-bottom))' : '16px';
  el.style.zIndex = '9999';
  el.style.padding = '12px 16px';
  el.style.borderRadius = '8px';
  el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  el.style.color = '#fff';
  el.style.fontSize = '14px';
  el.style.maxWidth = 'min(320px, calc(100vw - 32px))';
  el.style.transition = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'transform 240ms ease, opacity 240ms ease';
  el.style.transform = 'translateY(8px)';
  el.style.opacity = '0';

  if (type === 'success') el.style.background = '#166534';
  else if (type === 'error') el.style.background = '#c53030';
  else el.style.background = '#2b6cb0';

  el.textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  });

  setTimeout(() => {
    el.style.transform = 'translateY(8px)';
    el.style.opacity = '0';
    setTimeout(() => {
      try {
        document.body.removeChild(el);
      } catch (error) {
        console.warn('Failed to remove toast element', error);
      }
    }, 300);
  }, duration);
}

export const toastSuccess = (msg: string) => toast(msg, { type: 'success' });
export const toastError = (msg: string) => toast(msg, { type: 'error' });
export const toastInfo = (msg: string) => toast(msg, { type: 'info' });
