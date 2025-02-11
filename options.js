document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');

  // Load saved API key
  chrome.storage.sync.get('groqApiKey', data => {
    apiKeyInput.value = data.groqApiKey || '';
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showStatus('Please enter a valid API key', 'error');
      return;
    }

    chrome.storage.sync.set({ groqApiKey: apiKey }, () => {
      showStatus('Settings saved successfully!', 'success');
      setTimeout(() => statusDiv.style.display = 'none', 2000);
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }
});