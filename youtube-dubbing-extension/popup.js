// Popup script cho Comtor AI Extension với UI mới
console.log('🎛️ Comtor AI Extension Popup loaded');

// DOM Elements
const elements = {
  sourceLang: document.getElementById('source-lang'),
  targetLang: document.getElementById('target-lang'),
  translationService: document.getElementById('translation-service'),
  voiceQuality: document.getElementById('voice-quality'),
  voiceName: document.getElementById('voice-name'),
  volumeBalance: document.getElementById('volume-balance'),
  bgmToggle: document.getElementById('bgm-toggle'),
  floatingBallToggle: document.getElementById('floating-ball-toggle'),
  subtitlesToggle: document.getElementById('subtitles-toggle'),
  subtitleSize: document.getElementById('subtitle-size'),
  addSpeaker: document.getElementById('add-speaker'),
  speakersList: document.getElementById('speakers-list'),
  saveButton: document.getElementById('save-settings'),
  status: document.getElementById('status'),
  // API Configuration
  apiProvider: document.getElementById('api-provider'),
  apiKey: document.getElementById('api-key'),
  apiUrl: document.getElementById('api-url'),
  toggleApiKey: document.getElementById('toggle-api-key'),
  apiKeyGroup: document.getElementById('api-key-group'),
  apiUrlGroup: document.getElementById('api-url-group')
};

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
  updateApiFieldsVisibility();
});

// Load settings từ Chrome storage
function loadSettings() {
  const defaultSettings = {
    sourceLang: 'en',
    targetLang: 'vi',
    translationService: 'libre',
    voiceQuality: 'free',
    voiceName: 'hoai-my',
    volumeBalance: 70,
    bgmEnabled: false,
    floatingBallEnabled: false,
    subtitlesEnabled: true,
    subtitleSize: 3,
    speakers: [
      { id: 1, name: 'nam-minh' }
    ],
    // API Configuration
    apiProvider: 'libre',
    apiKey: '',
    apiUrl: ''
  };

  chrome.storage.sync.get(Object.keys(defaultSettings), (data) => {
    const settings = { ...defaultSettings, ...data };
    
    // Apply settings to UI
    elements.sourceLang.value = settings.sourceLang;
    elements.targetLang.value = settings.targetLang;
    elements.translationService.value = settings.translationService;
    elements.voiceQuality.value = settings.voiceQuality;
    elements.voiceName.value = settings.voiceName;
    elements.volumeBalance.value = settings.volumeBalance;
    
    // Set toggles
    setToggleState(elements.bgmToggle, settings.bgmEnabled);
    setToggleState(elements.floatingBallToggle, settings.floatingBallEnabled);
    setToggleState(elements.subtitlesToggle, settings.subtitlesEnabled);
    
    elements.subtitleSize.value = settings.subtitleSize;
    
    // API Configuration
    if (elements.apiProvider) elements.apiProvider.value = settings.apiProvider;
    if (elements.apiKey) elements.apiKey.value = settings.apiKey;
    if (elements.apiUrl) elements.apiUrl.value = settings.apiUrl;
    
    // Load speakers
    loadSpeakers(settings.speakers);
    
    console.log('⚙️ Settings loaded:', settings);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Save button
  elements.saveButton.addEventListener('click', saveSettings);
  
  // Toggle handlers
  elements.bgmToggle.addEventListener('click', () => toggleState(elements.bgmToggle));
  elements.floatingBallToggle.addEventListener('click', () => toggleState(elements.floatingBallToggle));
  elements.subtitlesToggle.addEventListener('click', () => toggleState(elements.subtitlesToggle));
  
  // Add speaker button
  elements.addSpeaker.addEventListener('click', addSpeaker);
  
  // Auto-save on change
  const autoSaveInputs = [
    elements.sourceLang,
    elements.targetLang, 
    elements.translationService,
    elements.voiceQuality,
    elements.voiceName,
    elements.volumeBalance,
    elements.subtitleSize
  ];
  
  autoSaveInputs.forEach(input => {
    if (input) input.addEventListener('change', autoSave);
  });
  
  // API Configuration event listeners
  if (elements.apiProvider) {
    elements.apiProvider.addEventListener('change', () => {
      updateApiFieldsVisibility();
      autoSave();
    });
  }
  
  if (elements.apiKey) {
    elements.apiKey.addEventListener('input', autoSave);
  }
  
  if (elements.apiUrl) {
    elements.apiUrl.addEventListener('input', autoSave);
  }
  
  if (elements.toggleApiKey) {
    elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  }
  
  elements.volumeBalance.addEventListener('input', autoSave);
  elements.subtitleSize.addEventListener('input', autoSave);
}

// Toggle state management
function setToggleState(toggle, isActive) {
  if (isActive) {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

function toggleState(toggle) {
  toggle.classList.toggle('active');
  autoSave();
}

function getToggleState(toggle) {
  return toggle.classList.contains('active');
}

// Load speakers
function loadSpeakers(speakers) {
  elements.speakersList.innerHTML = '';
  
  speakers.forEach((speaker, index) => {
    addSpeakerItem(speaker.id, speaker.name, index === 0);
  });
}

// Add speaker item
function addSpeakerItem(id, selectedName, isFirst = false) {
  const speakerItem = document.createElement('div');
  speakerItem.className = 'speaker-item';
  speakerItem.innerHTML = `
    <div class="speaker-number">${id}</div>
    <select class="speaker-name" data-speaker-id="${id}">
      <option value="nam-minh" ${selectedName === 'nam-minh' ? 'selected' : ''}>Nam Minh</option>
      <option value="hoai-my" ${selectedName === 'hoai-my' ? 'selected' : ''}>Hoài My</option>
      <option value="thu-minh" ${selectedName === 'thu-minh' ? 'selected' : ''}>Thu Minh</option>
    </select>
    <button class="remove-speaker" ${isFirst ? 'style="visibility: hidden;"' : ''}>×</button>
  `;
  
  // Add event listeners
  const selectElement = speakerItem.querySelector('.speaker-name');
  selectElement.addEventListener('change', autoSave);
  
  const removeButton = speakerItem.querySelector('.remove-speaker');
  if (!isFirst) {
    removeButton.addEventListener('click', () => {
      speakerItem.remove();
      reorderSpeakers();
      autoSave();
    });
  }
  
  elements.speakersList.appendChild(speakerItem);
}

// Add speaker
function addSpeaker() {
  const currentSpeakers = elements.speakersList.querySelectorAll('.speaker-item');
  const nextId = currentSpeakers.length + 1;
  
  if (nextId > 5) {
    showStatus('⚠️ Maximum 5 speakers allowed', 'error');
    return;
  }
  
  addSpeakerItem(nextId, 'hoai-my');
  autoSave();
}

// Reorder speakers after removal
function reorderSpeakers() {
  const speakerItems = elements.speakersList.querySelectorAll('.speaker-item');
  speakerItems.forEach((item, index) => {
    const numberElement = item.querySelector('.speaker-number');
    const selectElement = item.querySelector('.speaker-name');
    const newId = index + 1;
    
    numberElement.textContent = newId;
    selectElement.setAttribute('data-speaker-id', newId);
    
    // Hide remove button for first speaker
    const removeButton = item.querySelector('.remove-speaker');
    if (index === 0) {
      removeButton.style.visibility = 'hidden';
    } else {
      removeButton.style.visibility = 'visible';
    }
  });
}

// Save settings
function saveSettings() {
  const speakerItems = elements.speakersList.querySelectorAll('.speaker-item');
  const speakers = Array.from(speakerItems).map((item, index) => {
    const selectElement = item.querySelector('.speaker-name');
    return {
      id: index + 1,
      name: selectElement.value
    };
  });

  const settings = {
    sourceLang: elements.sourceLang.value,
    targetLang: elements.targetLang.value,
    translationService: elements.translationService.value,
    voiceQuality: elements.voiceQuality.value,
    voiceName: elements.voiceName.value,
    volumeBalance: parseInt(elements.volumeBalance.value),
    bgmEnabled: getToggleState(elements.bgmToggle),
    floatingBallEnabled: getToggleState(elements.floatingBallToggle),
    subtitlesEnabled: getToggleState(elements.subtitlesToggle),
    subtitleSize: parseInt(elements.subtitleSize.value),
    speakers: speakers,
    // API Configuration
    apiProvider: elements.apiProvider ? elements.apiProvider.value : 'libre',
    apiKey: elements.apiKey ? elements.apiKey.value : '',
    apiUrl: elements.apiUrl ? elements.apiUrl.value : ''
  };

  // Show loading
  elements.saveButton.innerHTML = 'Saving...';
  elements.saveButton.disabled = true;

  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Error saving settings: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('✅ Settings saved successfully!', 'success');
      console.log('💾 Settings saved:', settings);
    }
    
    // Restore button
    elements.saveButton.innerHTML = 'Save Settings';
    elements.saveButton.disabled = false;
  });
}

// Auto save (without showing status)
function autoSave() {
  const speakerItems = elements.speakersList.querySelectorAll('.speaker-item');
  const speakers = Array.from(speakerItems).map((item, index) => {
    const selectElement = item.querySelector('.speaker-name');
    return {
      id: index + 1,
      name: selectElement.value
    };
  });

  const settings = {
    sourceLang: elements.sourceLang.value,
    targetLang: elements.targetLang.value,
    translationService: elements.translationService.value,
    voiceQuality: elements.voiceQuality.value,
    voiceName: elements.voiceName.value,
    volumeBalance: parseInt(elements.volumeBalance.value),
    bgmEnabled: getToggleState(elements.bgmToggle),
    floatingBallEnabled: getToggleState(elements.floatingBallToggle),
    subtitlesEnabled: getToggleState(elements.subtitlesToggle),
    subtitleSize: parseInt(elements.subtitleSize.value),
    speakers: speakers
  };

  chrome.storage.sync.set(settings, () => {
    if (!chrome.runtime.lastError) {
      console.log('🔄 Settings auto-saved');
    }
  });
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

// Listen for messages from content/background scripts
chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStats') {
    // Handle stats update if needed
    console.log('Stats update:', message.data);
  }
});

// API Configuration functions
function updateApiFieldsVisibility() {
  if (!elements.apiProvider || !elements.apiKeyGroup || !elements.apiUrlGroup) return;
  
  const provider = elements.apiProvider.value;
  
  if (provider === 'libre') {
    elements.apiKeyGroup.style.display = 'none';
    elements.apiUrlGroup.style.display = 'none';
  } else if (provider === 'custom') {
    elements.apiKeyGroup.style.display = 'block';
    elements.apiUrlGroup.style.display = 'block';
  } else {
    elements.apiKeyGroup.style.display = 'block';
    elements.apiUrlGroup.style.display = 'none';
  }
}

function toggleApiKeyVisibility() {
  if (!elements.apiKey || !elements.toggleApiKey) return;
  
  if (elements.apiKey.type === 'password') {
    elements.apiKey.type = 'text';
    elements.toggleApiKey.textContent = '🙈';
  } else {
    elements.apiKey.type = 'password';
    elements.toggleApiKey.textContent = '👁️';
  }
}

// Initialize
console.log('✅ Comtor AI Extension Popup initialized');