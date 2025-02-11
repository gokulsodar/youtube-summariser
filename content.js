let summaryPanel = null;
let summaryContent = null;

// Inject button into YouTube UI
function injectButton() {
  const buttonsContainer = document.querySelector('#actions #top-level-buttons-computed');
  const existingSummaryBtn = document.getElementById('groq-summary-btn');
  
  if (buttonsContainer && !existingSummaryBtn) {
    const summaryBtn = document.createElement('button');
    summaryBtn.id = 'groq-summary-btn';
    summaryBtn.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m';
    summaryBtn.innerHTML = `
      <span class="yt-spec-button-shape-next__button-text-content">Summarize</span>
    `;
    summaryBtn.addEventListener('click', toggleSummaryPanel);
    buttonsContainer.appendChild(summaryBtn);
  }
}

// ... (previous code remains same until injectButton)

// Create summary panel integrated with YouTube layout
function createSummaryPanel() {
  const mainContainer = document.querySelector('#secondary');
  const secondaryContainer = document.querySelector('#secondary-inner');
  
  if (!mainContainer || !secondaryContainer) return;

  summaryPanel = document.createElement('div');
  summaryPanel.id = 'groq-summary-panel';
  summaryPanel.className = 'ytd-watch-flexy';
  summaryPanel.innerHTML = `
    <div class="summary-header">
      <h2 class="ytd-video-secondary-info-renderer">AI Summary</h2>
      <div class="summary-controls">
        <button id="copy-summary" class="yt-spec-button-shape-next yt-spec-button-shape-next--text">
          <span class="yt-spec-button-shape-next__button-text-content">📋</span>
        </button>
        <button id="regenerate-summary" class="yt-spec-button-shape-next yt-spec-button-shape-next--text">
          <span class="yt-spec-button-shape-next__button-text-content">🔄</span>
        </button>
      </div>
    </div>
    <div class="summary-content"></div>
  `;

  mainContainer.insertBefore(summaryPanel, secondaryContainer);
  
  // Add event listeners for the summary panel controls
  document.getElementById('copy-summary').addEventListener('click', copySummary);
  document.getElementById('regenerate-summary').addEventListener('click', () => generateSummary(true));
}

// ... (rest of the previous content.js remains same)

// Toggle panel visibility
function toggleSummaryPanel() {
  if (!summaryPanel) createSummaryPanel();
  summaryPanel.classList.toggle('visible');
  if (summaryPanel.classList.contains('visible') && !summaryContent) {
    generateSummary();
  }
}

// Get video context
async function getVideoContext() {
  let text = '';
  
  // Try to get captions
  const captions = Array.from(document.querySelectorAll('.captions-text span'))
    .map(span => span.textContent)
    .join(' ');
  
  if (captions.length > 50) {
    text = captions;
  } else {
    // Fallback to title and description
    const title = document.querySelector('h1.ytd-watch-metadata')?.textContent || '';
    const description = document.querySelector('#description')?.textContent || '';
    text = `${title}\n\n${description}`;
  }
  
  return text.slice(0, 12000); // Truncate to token limit
}

// Generate summary
async function generateSummary(regenerate = false) {
  try {
    const contentDiv = document.querySelector('.summary-content');
    contentDiv.innerHTML = '<div class="loading">Generating summary...</div>';
    
    const apiKey = await chrome.storage.sync.get('groqApiKey').then(data => data.groqApiKey);
    if (!apiKey) {
      contentDiv.innerHTML = '<div class="error">API key not set. Please configure in extension options.</div>';
      return;
    }

    const text = await getVideoContext();
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [{
          role: 'user',
          content: `Summarize this video in concise paragraphs. Focus on key points and main ideas:\n\n${text}`
        }],
        temperature: 0.5
      })
    });

    const data = await response.json();
    if (data.error) throw data.error;
    
    const summary = data.choices[0].message.content;
    summaryContent = summary;
    contentDiv.innerHTML = summary;
  } catch (error) {
    console.error('Summary error:', error);
    contentDiv.innerHTML = `<div class="error">Error generating summary: ${error.message}</div>`;
  }
}

// Copy summary to clipboard
function copySummary() {
  navigator.clipboard.writeText(summaryContent)
    .then(() => alert('Summary copied!'))
    .catch(err => console.error('Copy failed:', err));
}

// **NEW CODE: Hide the summary panel on new video navigation**
// Listen for YouTube's SPA navigation event and remove the summary panel.
document.addEventListener('yt-navigate-start', () => {
  if (summaryPanel) {
    summaryPanel.remove();
    summaryPanel = null;
    summaryContent = null;
  }
});

// Initialize the extension by watching for DOM changes
const observer = new MutationObserver(injectButton);
observer.observe(document.body, { childList: true, subtree: true });
injectButton();
