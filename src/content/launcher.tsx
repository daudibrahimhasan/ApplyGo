export function injectFloatingLauncher(): void {
  if (document.getElementById('grounded-apply-launcher-host')) return;

  const host = document.createElement('div');
  host.id = 'grounded-apply-launcher-host';
  host.style.position = 'fixed';
  host.style.right = '0';
  host.style.top = '40%';
  host.style.zIndex = '2147483647'; // Max z-index
  host.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif';

  // Attach shadow root to isolate styles completely from host page
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .launcher-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid #334155;
      border-right: none;
      padding: 8px 12px 8px 10px;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease, background 0.15s ease;
      user-select: none;
    }
    .launcher-btn:hover {
      background: #1e293b;
      transform: translateX(-3px);
    }
    .launcher-icon {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: #3b82f6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      color: #ffffff;
    }
  `;

  const button = document.createElement('button');
  button.className = 'launcher-btn';
  button.title = 'Open GroundedApply side panel';
  button.innerHTML = `
    <div class="launcher-icon">G</div>
    <span>GroundedApply</span>
  `;

  button.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL_REQUEST' });
    }
  });

  shadow.appendChild(style);
  shadow.appendChild(button);
  document.documentElement.appendChild(host);
}
