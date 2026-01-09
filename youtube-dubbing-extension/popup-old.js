// Popup script cho YouTube AI Dubbing Extension
console.log('🎛️ Popup script loaded');

// DOM Elements
const elements = {
  defaultLang: document.getElementById('default-lang'),
  voiceType: document.getElementById('voice-type'),
  audioQuality: document.getElementById('audio-quality'),
  openaiKey: document.getElementById('openai-key'),
  googleKey: document.getElementById('google-key'),
  youtubeKey: document.getElementById('youtube-key'),
  autoStart: document.getElementById('auto-start'),
  showSubtitles: document.getElementById('show-subtitles'),
  volumeRatio: document.getElementById('volume-ratio'),
  saveBtn: document.getElementById('save-settings'),
  testBtn: document.getElementById('test-api'),
  resetBtn: document.getElementById('reset-settings'),
  status: document.getElementById('status'),
  totalTranslations: document.getElementById('total-translations'),
  totalDuration: document.getElementById('total-duration')
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadStatistics();
  setupEventListeners();
});

// Load settings từ Chrome storage
function loadSettings() {
  const defaultSettings = {
    defaultLang: 'vi',
    voiceType: 'female',
    audioQuality: 'standard',
    openai_api_key: '',
    google_translate_api_key: '',
    google_tts_api_key: '',
    youtube_api_key: '',
    autoStart: false,
    showSubtitles: true,
    volumeRatio: '0.1:0.8'
  };

  chrome.storage.sync.get(Object.keys(defaultSettings), (data) => {
    // Merge with defaults
    const settings = { ...defaultSettings, ...data };
    
    // Apply settings to UI
    elements.defaultLang.value = settings.defaultLang;
    elements.voiceType.value = settings.voiceType;
    elements.audioQuality.value = settings.audioQuality;
    elements.openaiKey.value = settings.openai_api_key;
    elements.googleKey.value = settings.google_translate_api_key || settings.google_tts_api_key;
    elements.youtubeKey.value = settings.youtube_api_key;
    elements.autoStart.checked = settings.autoStart;
    elements.showSubtitles.checked = settings.showSubtitles;
    elements.volumeRatio.value = settings.volumeRatio;
    
    console.log('⚙️ Settings loaded:', settings);
  });
}

// Load statistics
function loadStatistics() {
  const defaultStats = {
    totalTranslations: 0,
    totalDuration: 0,
    lastUsed: null
  };

  chrome.storage.local.get(Object.keys(defaultStats), (data) => {
    const stats = { ...defaultStats, ...data };
    
    elements.totalTranslations.textContent = stats.totalTranslations;
    elements.totalDuration.textContent = Math.round(stats.totalDuration);
    
    console.log('📊 Statistics loaded:', stats);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Save settings button
  elements.saveBtn.addEventListener('click', saveSettings);
  
  // Test API button
  elements.testBtn.addEventListener('click', testApiKeys);
  
  // Reset settings button
  elements.resetBtn.addEventListener('click', resetSettings);
  
  // Auto-save on input change
  const inputs = [
    elements.defaultLang,
    elements.voiceType,
    elements.audioQuality,
    elements.autoStart,
    elements.showSubtitles,
    elements.volumeRatio
  ];
  
  inputs.forEach(input => {
    input.addEventListener('change', autoSave);
  });
  
  // API key inputs với delay để tránh save quá nhiều
  const apiInputs = [elements.openaiKey, elements.googleKey, elements.youtubeKey];
  apiInputs.forEach(input => {
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(autoSave, 1000); // Save after 1 second of no typing
    });
  });
}

// Save settings
function saveSettings() {
  const settings = {
    defaultLang: elements.defaultLang.value,
    voiceType: elements.voiceType.value,
    audioQuality: elements.audioQuality.value,
    openai_api_key: elements.openaiKey.value.trim(),
    google_translate_api_key: elements.googleKey.value.trim(),
    google_tts_api_key: elements.googleKey.value.trim(), // Same key for both services
    youtube_api_key: elements.youtubeKey.value.trim(),
    autoStart: elements.autoStart.checked,
    showSubtitles: elements.showSubtitles.checked,
    volumeRatio: elements.volumeRatio.value
  };

  // Show loading
  elements.saveBtn.innerHTML = '<span class="loading"></span> Đang lưu...';
  elements.saveBtn.disabled = true;

  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Lỗi khi lưu cài đặt: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('✅ Đã lưu cài đặt thành công!', 'success');
      console.log('💾 Settings saved:', settings);
      
      // Update statistics
      updateStatistics('settings_updated');
    }
    
    // Restore button
    elements.saveBtn.innerHTML = '💾 Lưu cài đặt';
    elements.saveBtn.disabled = false;
  });
}

// Auto save (without showing status)
function autoSave() {
  const settings = {
    defaultLang: elements.defaultLang.value,
    voiceType: elements.voiceType.value,
    audioQuality: elements.audioQuality.value,
    openai_api_key: elements.openaiKey.value.trim(),
    google_translate_api_key: elements.googleKey.value.trim(),
    google_tts_api_key: elements.googleKey.value.trim(),
    youtube_api_key: elements.youtubeKey.value.trim(),
    autoStart: elements.autoStart.checked,
    showSubtitles: elements.showSubtitles.checked,
    volumeRatio: elements.volumeRatio.value
  };

  chrome.storage.sync.set(settings, () => {
    if (!chrome.runtime.lastError) {
      console.log('🔄 Settings auto-saved');
    }
  });
}

// Test API keys
async function testApiKeys() {
  elements.testBtn.innerHTML = '<span class="loading"></span> Đang test...';
  elements.testBtn.disabled = true;

  const results = {
    openai: false,
    google: false,
    youtube: false
  };

  try {
    // Test OpenAI API
    if (elements.openaiKey.value.trim()) {
      results.openai = await testOpenAI(elements.openaiKey.value.trim());
    }

    // Test Google API
    if (elements.googleKey.value.trim()) {
      results.google = await testGoogle(elements.googleKey.value.trim());
    }

    // Test YouTube API
    if (elements.youtubeKey.value.trim()) {
      results.youtube = await testYouTube(elements.youtubeKey.value.trim());
    }

    // Show results
    const workingApis = Object.values(results).filter(Boolean).length;
    const totalApis = Object.keys(results).filter(key => 
      elements[key === 'openai' ? 'openaiKey' : key === 'google' ? 'googleKey' : 'youtubeKey'].value.trim()
    ).length;

    if (totalApis === 0) {
      showStatus('⚠️ Chưa có API key nào để test', 'error');
    } else if (workingApis === totalApis) {
      showStatus(`✅ Tất cả ${workingApis} API đều hoạt động tốt!`, 'success');
    } else {
      showStatus(`⚠️ Chỉ có ${workingApis}/${totalApis} API hoạt động. Kiểm tra lại các key.`, 'error');
    }

    console.log('🧪 API test results:', results);

  } catch (error) {
    showStatus('❌ Lỗi khi test API: ' + error.message, 'error');
    console.error('Test API error:', error);
  }

  // Restore button
  elements.testBtn.innerHTML = '🧪 Test API';
  elements.testBtn.disabled = false;
}

// Test OpenAI API
async function testOpenAI(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('OpenAI test failed:', error);
    return false;
  }
}

// Test Google API
async function testGoogle(apiKey) {
  try {
    // Test with a simple translation request
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}`);
    return response.ok;
  } catch (error) {
    console.error('Google test failed:', error);
    return false;
  }
}

// Test YouTube API
async function testYouTube(apiKey) {
  try {
    // Test with a simple API call
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=${apiKey}`);
    return response.ok;
  } catch (error) {
    console.error('YouTube test failed:', error);
    return false;
  }
}

// Reset settings
function resetSettings() {
  if (confirm('🔄 Bạn có chắc muốn khôi phục tất cả cài đặt về mặc định?')) {
    // Clear storage
    chrome.storage.sync.clear(() => {
      chrome.storage.local.clear(() => {
        showStatus('🔄 Đã khôi phục cài đặt mặc định', 'success');
        
        // Reload settings
        setTimeout(() => {
          loadSettings();
          loadStatistics();
        }, 500);
      });
    });
  }
}

// Show status message
function showStatus(message, type = 'success') {
  elements.status.textContent = message;
  elements.status.className = `status ${type} show`;
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    elements.status.classList.remove('show');
  }, 3000);
}

// Toggle API key visibility
function toggleKeyVisibility(inputId) {
  const input = document.getElementById(inputId);
  const button = input.nextElementSibling;
  
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁️';
  }
}

// Update statistics
function updateStatistics(action, data = {}) {
  chrome.storage.local.get(['totalTranslations', 'totalDuration', 'lastUsed'], (current) => {
    const updates = {
      lastUsed: new Date().toISOString()
    };

    switch (action) {
      case 'translation_completed':
        updates.totalTranslations = (current.totalTranslations || 0) + 1;
        updates.totalDuration = (current.totalDuration || 0) + (data.duration || 0);
        break;
      
      case 'settings_updated':
        // Just update lastUsed
        break;
    }

    chrome.storage.local.set(updates, () => {
      if (action === 'translation_completed') {
        loadStatistics(); // Refresh display
      }
    });
  });
}

// Listen for messages from content/background scripts
chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStats') {
    updateStatistics('translation_completed', message.data);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveSettings();
  }
  
  // Ctrl+T or Cmd+T to test APIs
  if ((e.ctrlKey || e.metaKey) && e.key === 't') {
    e.preventDefault();
    testApiKeys();
  }
});

// Make toggle function global for onclick handlers
window.toggleKeyVisibility = toggleKeyVisibility;

console.log('✅ Popup script initialized');