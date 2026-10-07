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
      gap: 8px;
      background: #edf5f9;
      color: #103f63;
      border: 1px solid #b4d1e1;
      border-right: none;
      padding: 8px 12px 8px 10px;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      min-height: 44px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      transition: background 0.15s ease;
      user-select: none;
    }
    .launcher-btn:hover {
      background: #dcecf5;
    }
    .launcher-btn:focus-visible {
      outline: 2px solid #103f63;
      outline-offset: 2px;
    }
    .launcher-status {
      display: none;
      position: absolute;
      right: 8px;
      top: 100%;
      margin-top: 8px;
      width: 220px;
      padding: 10px;
      background: #edf5f9;
      color: #103f63;
      border: 1px solid #b4d1e1;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.5;
    }
    .launcher-icon {
      width: 22px;
      height: 22px;
      background: transparent;
      padding: 0;
      object-fit: contain;
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
  button.type = 'button';
  button.setAttribute('aria-label', 'Open ApplyGo side panel');
  button.title = 'Open ApplyGo side panel';
  button.innerHTML = `
    <img class="launcher-icon" src="${chrome.runtime.getURL('public/icons/icon48.png')}" alt="" />
  `;

  const status = document.createElement('div');
  status.className = 'launcher-status';
  status.setAttribute('role', 'alert');
  const showFailure = (error: string) => {
    button.dataset.openState = 'failed';
    button.title = error;
    status.textContent = error;
    status.style.display = 'block';
  };
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    status.style.display = 'none';
    button.dataset.openState = 'opening';
    try {
      // Send directly from the click. No asynchronous work before requesting the panel.
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL_REQUEST' }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) showFailure('Reload this page, then try GA again. The extension connection was lost.');
        else if (!response?.success) showFailure(`${response?.error || 'Chrome could not open the panel.'} Click the GA toolbar icon to open it.`);
        else {
          button.dataset.openState = 'opened';
          button.title = 'Open ApplyGo side panel';
        }
      });
    } catch {
      showFailure('Reload this page, then try GA again. The extension was updated or reloaded.');
    }
  });

  shadow.appendChild(style);
  shadow.appendChild(button);
  shadow.appendChild(status);
  document.documentElement.appendChild(host);
}
