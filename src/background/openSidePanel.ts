export function openSidePanelFromLauncher(
  sender: chrome.runtime.MessageSender,
  reply: (response: { success: boolean; error?: string }) => void
): boolean {
  if (!chrome.sidePanel?.open || sender.tab?.id === undefined) {
    reply({ success: false, error: 'Side panel is unavailable. Use the GA icon in the Chrome toolbar.' });
    return false;
  }
  try {
    // Call immediately: awaiting settings or tab queries first can lose the click gesture.
    chrome.sidePanel.open({ tabId: sender.tab.id }).then(
      () => reply({ success: true }),
      (error: unknown) => reply({ success: false, error: error instanceof Error ? error.message : String(error) })
    );
    return true;
  } catch (error) {
    reply({ success: false, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
