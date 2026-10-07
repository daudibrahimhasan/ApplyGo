import { afterEach, describe, expect, it, vi } from 'vitest';
import { openSidePanelFromLauncher } from '../../src/background/openSidePanel';

afterEach(() => vi.unstubAllGlobals());
describe('launcher side panel opening', () => {
  it('opens synchronously against the sender tab, and replies after confirmation', async () => {
    let resolve!: () => void;
    const open = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    vi.stubGlobal('chrome', { sidePanel: { open } });
    const reply = vi.fn();
    expect(openSidePanelFromLauncher({ tab: { id: 12 } } as chrome.runtime.MessageSender, reply)).toBe(true);
    expect(open).toHaveBeenCalledWith({ tabId: 12 });
    expect(reply).not.toHaveBeenCalled();
    resolve();
    await Promise.resolve();
    expect(reply).toHaveBeenCalledWith({ success: true });
  });
  it('reports Chrome rejection instead of falsely returning success', async () => {
    vi.stubGlobal('chrome', { sidePanel: { open: vi.fn().mockRejectedValue(new Error('User gesture required')) } });
    const reply = vi.fn();
    openSidePanelFromLauncher({ tab: { id: 12 } } as chrome.runtime.MessageSender, reply);
    await Promise.resolve();
    expect(reply).toHaveBeenCalledWith({ success: false, error: 'User gesture required' });
  });
  it('reports an unavailable panel API', () => {
    vi.stubGlobal('chrome', {});
    const reply = vi.fn();
    expect(openSidePanelFromLauncher({}, reply)).toBe(false);
    expect(reply.mock.calls[0][0].success).toBe(false);
  });
});
