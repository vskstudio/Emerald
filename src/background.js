// Emerald — injection à la demande (clic sur l'icône) via activeTab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url || '')) return;
  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['src/overlay.css'] });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/strategy.js', 'src/content.js'],
    });
    await chrome.tabs.sendMessage(tab.id, { type: 'emerald-toggle' });
  } catch (e) {
    console.error('Emerald injection failed:', e);
  }
});
