// GitHub repository information
const GITHUB_REPO = 'Alberto02003/PcMonitor-Dockers';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Elements
let currentVersionElement;
let downloadBtn;
let downloadBtn2;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  currentVersionElement = document.getElementById('current-version');
  downloadBtn = document.getElementById('download-btn');
  downloadBtn2 = document.getElementById('download-btn-2');
  
  // Fetch latest release info
  fetchLatestRelease();
  
  // Add click event listeners to download buttons
  if (downloadBtn) {
    downloadBtn.addEventListener('click', handleDownload);
  }
  
  if (downloadBtn2) {
    downloadBtn2.addEventListener('click', handleDownload);
  }
});

/**
 * Fetch latest release information from GitHub
 */
async function fetchLatestRelease() {
  try {
    const response = await fetch(GITHUB_API_URL);
    
    if (!response.ok) {
      throw new Error('Failed to fetch release info');
    }
    
    const data = await response.json();
    
    // Update version display
    if (currentVersionElement) {
      currentVersionElement.textContent = data.tag_name || 'v0.1.3';
    }
    
    // Find the NSIS installer (.exe) in the assets
    const nsisAsset = data.assets.find(asset => 
      asset.name.endsWith('-setup.exe') || asset.name.endsWith('.exe')
    );
    
    // Store download URL globally
    if (nsisAsset) {
      window.latestDownloadUrl = nsisAsset.browser_download_url;
      window.latestFileName = nsisAsset.name;
      window.latestFileSize = formatFileSize(nsisAsset.size);
      
      // Update button text with file size
      updateDownloadButtons();
    } else {
      console.warn('No .exe installer found in latest release');
    }
    
  } catch (error) {
    console.error('Error fetching latest release:', error);
    
    // Fallback to default version
    if (currentVersionElement) {
      currentVersionElement.textContent = 'v0.1.3';
    }
    
    // Fallback to manual download URL
    window.latestDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;
  }
}

/**
 * Handle download button click
 */
function handleDownload() {
  if (window.latestDownloadUrl) {
    // Track download (optional analytics)
    if (typeof gtag === 'function') {
      gtag('event', 'download', {
        'event_category': 'installer',
        'event_label': window.latestFileName || 'unknown'
      });
    }
    
    // Open download URL
    window.open(window.latestDownloadUrl, '_blank');
    
    // Show feedback
    showDownloadFeedback();
  } else {
    // Fallback to releases page
    window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, '_blank');
  }
}

/**
 * Update download buttons with file size info
 */
function updateDownloadButtons() {
  if (window.latestFileSize) {
    const sizeText = ` (${window.latestFileSize})`;
    
    if (downloadBtn) {
      const originalText = 'Descargar para Windows';
      downloadBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        ${originalText} <small>${sizeText}</small>
      `;
    }
  }
}

/**
 * Show download feedback to user
 */
function showDownloadFeedback() {
  // Create temporary notification
  const notification = document.createElement('div');
  notification.textContent = '¡Descarga iniciada! ✓';
  notification.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: linear-gradient(135deg, #4ce3a0 0%, #3bc98f 100%);
    color: #0a0e27;
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 8px 24px rgba(76, 227, 160, 0.3);
    z-index: 9999;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Add CSS animations for notification
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
