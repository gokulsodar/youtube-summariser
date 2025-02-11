// Service worker for extension management
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ groqApiKey: '' });
  });