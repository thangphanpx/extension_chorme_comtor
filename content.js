// Chờ trang YouTube load xong với retry mechanism
function waitForElement(selector, callback, maxRetries = 20) {
  let retries = 0;
  
  function check() {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
      return true;
    }
    
    retries++;
    if (retries < maxRetries) {
      setTimeout(check, 500);
    } else {
      console.warn('🚨 Element not found after retries:', selector);
      return false;
    }
  }
  
  check();
}

// Khởi tạo extension với multiple selectors
function initializeExtension() {
  console.log('🚀 Khởi tạo Comtor AI Extension...');
  
  // Thử nhiều selectors cho YouTube controls
  const controlSelectors = [
    '.ytp-right-controls',
    '.ytp-chrome-controls .ytp-right-controls', 
    '#movie_player .ytp-right-controls',
    '.html5-video-container .ytp-right-controls'
  ];
  
  let found = false;
  for (const selector of controlSelectors) {
    const controls = document.querySelector(selector);
    if (controls && !found) {
      found = true;
      addTranslationControls(controls);
      break;
    }
  }
  
  if (!found) {
    console.log('⏳ YouTube controls chưa load, thử lại...');
    setTimeout(initializeExtension, 1000);
  }
}

// Biến global để track trạng thái
let isTranslating = false;
let currentAudioElement = null;
let originalVideoVolume = 1;
let transcriptOverlay = null;
let currentTranscript = null;
let highlightInterval = null;

// Thêm nút điều khiển vào video player
function addTranslationControls(controls = null) {
  // Tìm controls container
  if (!controls) {
    const selectors = [
      '.ytp-right-controls',
      '.ytp-chrome-controls .ytp-right-controls', 
      '#movie_player .ytp-right-controls'
    ];
    
    for (const selector of selectors) {
      controls = document.querySelector(selector);
      if (controls) break;
    }
  }
  
  if (!controls) {
    console.warn('🚨 Không tìm thấy YouTube controls');
    return;
  }
  
  // Kiểm tra xem đã thêm nút chưa
  if (document.getElementById('translation-btn')) {
    console.log('🔄 Nút đã tồn tại, bỏ qua');
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'translation-btn';
  button.className = 'ytp-button translation-control';
  button.innerHTML = '🌐';
  button.title = 'Comtor AI - Dịch và lồng tiếng video';
  button.setAttribute('data-tooltip-text', 'Comtor AI Translation');
  
  // Style cho button
  button.style.cssText = `
    background: none !important;
    border: none !important;
    color: white !important;
    font-size: 18px !important;
    cursor: pointer !important;
    padding: 8px !important;
    margin: 0 4px !important;
    opacity: 0.8 !important;
    transition: opacity 0.3s ease !important;
  `;
  
  button.addEventListener('mouseenter', () => {
    button.style.opacity = '1';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.opacity = '0.8';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showTranslationPanel();
  });
  
  // Thêm nút vào đầu controls
  controls.insertBefore(button, controls.firstChild);
  
  console.log('✅ Đã thêm nút Comtor AI vào YouTube player');
}

// Hiển thị panel chọn ngôn ngữ
function showTranslationPanel() {
  // Xóa panel cũ nếu có
  const oldPanel = document.getElementById('translation-panel');
  if (oldPanel) {
    oldPanel.remove();
    return;
  }
  
  const panel = document.createElement('div');
  panel.id = 'translation-panel';
  panel.innerHTML = `
    <div class="translation-header">
        <h3>🇻🇳 Dịch Anh → Việt</h3>
        <button id="close-panel" title="Đóng">✕</button>
      </div>
      <div class="translation-content">
        <div class="language-section">
          <label>Dịch từ tiếng Anh sang tiếng Việt:</label>
          <div style="padding: 12px; background: #f0f8ff; border-radius: 8px; color: #333; font-size: 14px;">
            🇺🇸 English → 🇻🇳 Tiếng Việt
          </div>
      
      <div class="voice-section">
        <label for="voice-type">Loại giọng nói:</label>
        <select id="voice-type">
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
        </select>
      </div>
      
      <div class="quality-section">
        <label for="audio-quality">Chất lượng audio:</label>
        <select id="audio-quality">
          <option value="standard">Chuẩn (Nhanh)</option>
          <option value="premium">Cao cấp (Chậm hơn)</option>
        </select>
      </div>
      
      <div class="actions">
        <button id="start-translation" class="primary-btn">
          ${isTranslating ? '⏸️ Dừng dịch' : '🚀 Bắt đầu dịch'}
        </button>
        <button id="stop-dubbing" class="secondary-btn" ${!currentAudioElement ? 'disabled' : ''}>
          🔇 Tắt lồng tiếng
        </button>
      </div>
      
      <div class="info">
        <small>💡 Extension sẽ tự động dịch phụ đề và tạo audio lồng tiếng</small>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  
  // Load settings từ storage
  chrome.storage.sync.get(['translationService', 'voiceQuality', 'voiceName'], (data) => {
    if (data.translationService) {
      console.log('Using translation service:', data.translationService);
    }
    if (data.voiceQuality) {
      console.log('Voice quality:', data.voiceQuality);
    }
    if (data.voiceName) {
      console.log('Voice name:', data.voiceName);
    }
  });
  
  // Xử lý sự kiện
  document.getElementById('close-panel').addEventListener('click', () => {
    panel.remove();
  });
  
  document.getElementById('start-translation').addEventListener('click', () => {
    if (isTranslating) {
      stopTranslation();
    } else {
      startTranslation(); // Không cần tham số vì cố định Anh->Việt
    }
  });
  
  document.getElementById('stop-dubbing').addEventListener('click', () => {
    stopDubbing();
  });
  
  // Đóng panel khi click bên ngoài
  panel.addEventListener('click', (e) => {
    if (e.target === panel) {
      panel.remove();
    }
  });
}

// Bắt đầu quá trình dịch
function startTranslation() {
  console.log('🚀 Bắt đầu dịch Anh -> Việt');
  
  // Lấy thông tin video
  const videoId = new URLSearchParams(window.location.search).get('v');
  const videoTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent || 'Untitled';
  
  if (!videoId) {
    showNotification('❌ Không thể lấy ID video', 'error');
    return;
  }
  
  isTranslating = true;
  
  // Gửi message đến background script
  chrome.runtime.sendMessage({
    action: 'translate',
    videoId: videoId,
    videoTitle: videoTitle,
    targetLang: 'vi',
    sourceLang: 'en'
  });
}

// Dừng quá trình dịch
function stopTranslation() {
  isTranslating = false;
  hideLoadingOverlay();
  updatePanelButton();
  
  // Gửi message để hủy translation
  chrome.runtime.sendMessage({
    action: 'cancel_translation'
  });
  
  showNotification('⏹️ Đã dừng quá trình dịch', 'info');
}

// Dừng audio dubbing
function stopDubbing() {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement = null;
    
    // Khôi phục âm lượng video gốc
    const video = document.querySelector('video');
    if (video) {
      video.volume = originalVideoVolume;
    }
    
    updatePanelButton();
    showNotification('🔇 Đã tắt lồng tiếng', 'info');
  }
}

// Cập nhật UI button trong panel
function updatePanelButton() {
  const startBtn = document.getElementById('start-translation');
  const stopBtn = document.getElementById('stop-dubbing');
  
  if (startBtn) {
    startBtn.textContent = isTranslating ? '⏸️ Dừng dịch' : '🚀 Bắt đầu dịch';
    startBtn.disabled = false;
  }
  
  if (stopBtn) {
    stopBtn.disabled = !currentAudioElement;
  }
}

// Hiển thị loading overlay
function showLoadingOverlay() {
  // Xóa overlay cũ nếu có
  hideLoadingOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'translation-loading';
  overlay.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <div class="loading-steps">
        <div class="step active" id="step-1">
          <span class="step-icon">📝</span>
          <span class="step-text">Đang lấy phụ đề tiếng Anh...</span>
        </div>
        <div class="step" id="step-2">
          <span class="step-icon">🇻🇳</span>
          <span class="step-text">Đang dịch sang tiếng Việt...</span>
        </div>
        <div class="step" id="step-3">
          <span class="step-icon">✅</span>
          <span class="step-text">Hoàn thành!</span>
        </div>
      </div>
      <button id="cancel-translation" class="cancel-btn">Hủy</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Xử lý nút hủy
  document.getElementById('cancel-translation').addEventListener('click', () => {
    stopTranslation();
  });
}

// Ẩn loading overlay
function hideLoadingOverlay() {
  const overlay = document.getElementById('translation-loading');
  if (overlay) {
    overlay.remove();
  }
}

// Cập nhật bước trong loading
function updateLoadingStep(step) {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`step-${i}`);
    if (stepEl) {
      stepEl.classList.remove('active', 'completed');
      if (i < step) {
        stepEl.classList.add('completed');
      } else if (i === step) {
        stepEl.classList.add('active');
      }
    }
  }
}

// Hiển thị transcript overlay realtime
function showTranscriptOverlay(originalText, translatedText) {
  // Xóa overlay cũ nếu có
  hideTranscriptOverlay();

  const video = document.querySelector('video');
  if (!video) return;

  // Tạo transcript data với timing (giả lập timing đơn giản)
  currentTranscript = createTranscriptWithTiming(originalText, translatedText);

  // Tạo overlay container
  transcriptOverlay = document.createElement('div');
  transcriptOverlay.id = 'transcript-overlay';
  transcriptOverlay.innerHTML = `
    <div class="transcript-container">
      <div class="transcript-header">
        <span class="transcript-title">🎬 Live Transcript</span>
        <div class="transcript-controls">
          <button id="toggle-original" class="active" title="Switch to English (Ctrl+T)">EN</button>
          <button id="toggle-translated" title="Switch to Vietnamese (Ctrl+T)">VI</button>
          <button id="close-transcript" title="Close transcript (ESC)">✕</button>
        </div>
      </div>
      <div class="transcript-content">
        <div id="transcript-text" class="transcript-text-original">
          ${createTranscriptHTML(currentTranscript.original)}
        </div>
      </div>
    </div>
  `;

  // Thêm vào video container
  const videoContainer = video.closest('#movie_player') || video.parentElement;
  videoContainer.appendChild(transcriptOverlay);

  // Setup event listeners
  setupTranscriptControls();

  // Bắt đầu sync với video
  startTranscriptSync();
}

// Tạo transcript data với timing
function createTranscriptWithTiming(originalText, translatedText) {
  const sentences = originalText.split(/[.!?]+/).filter(s => s.trim());
  const translatedSentences = translatedText.split(/[.!?]+/).filter(s => s.trim());
  
  const video = document.querySelector('video');
  const duration = video ? video.duration : 300; // fallback 5 minutes
  const timePerSentence = duration / sentences.length;

  const original = sentences.map((sentence, index) => ({
    id: index,
    text: sentence.trim() + '.',
    startTime: index * timePerSentence,
    endTime: (index + 1) * timePerSentence
  }));

  const translated = translatedSentences.map((sentence, index) => ({
    id: index,
    text: sentence.trim() + '.',
    startTime: index * timePerSentence,
    endTime: (index + 1) * timePerSentence
  }));

  return { original, translated };
}

// Tạo HTML cho transcript
function createTranscriptHTML(transcriptData) {
  return transcriptData.map(item => 
    `<span class="transcript-segment" data-id="${item.id}" data-start="${item.startTime}" data-end="${item.endTime}" onclick="seekToTime(${item.startTime})">
      ${item.text}
    </span>`
  ).join(' ');
}

// Jump tới thời gian khi click transcript
function seekToTime(time) {
  const video = document.querySelector('video');
  if (video) {
    video.currentTime = time;
    if (video.paused) {
      video.play();
    }
  }
}

// Toggle giữa ngôn ngữ gốc và dịch
window.toggleTranscriptLanguage = function() {
  const overlay = document.getElementById('transcript-overlay');
  if (!overlay) return;

  const textElement = overlay.querySelector('#transcript-text');
  if (!textElement) return;

  const isOriginal = textElement.className.includes('transcript-text-original');
  
  if (isOriginal) {
    textElement.className = 'transcript-text-translated';
    textElement.innerHTML = createTranscriptHTML(currentTranscript.translated);
    overlay.querySelector('#toggle-translated').classList.add('active');
    overlay.querySelector('#toggle-original').classList.remove('active');
  } else {
    textElement.className = 'transcript-text-original';
    textElement.innerHTML = createTranscriptHTML(currentTranscript.original);
    overlay.querySelector('#toggle-original').classList.add('active');
    overlay.querySelector('#toggle-translated').classList.remove('active');
  }
};

// Resize transcript overlay
window.resizeTranscriptOverlay = function() {
  const overlay = document.getElementById('transcript-overlay');
  if (!overlay) return;

  const container = overlay.querySelector('.transcript-container');
  if (!container) return;

  if (container.classList.contains('minimized')) {
    container.classList.remove('minimized');
    container.style.height = '120px';
  } else if (container.classList.contains('maximized')) {
    container.classList.remove('maximized');
    container.style.height = '120px';
  } else {
    container.classList.add('minimized');
    container.style.height = '40px';
  }
};

// Setup keyboard shortcuts for transcript
function setupTranscriptKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Chỉ hoạt động khi transcript overlay đang mở
    if (!document.getElementById('transcript-overlay')) return;
    
    // Kiểm tra không phải đang focus vào input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch(e.key.toLowerCase()) {
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          window.toggleTranscriptLanguage();
        }
        break;
      case 'escape':
        e.preventDefault();
        window.closeTranscriptOverlay();
        break;
      case 'm':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          window.resizeTranscriptOverlay();
        }
        break;
    }
  });
}

// Khởi tạo keyboard shortcuts
setupTranscriptKeyboardShortcuts();

// Khởi tạo extension khi trang load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Re-initialize when YouTube navigates to new video (SPA behavior)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 YouTube navigation detected, re-initializing...');
    setTimeout(initializeExtension, 1000);
  }
}).observe(document, { subtree: true, childList: true });

console.log('🎬 Comtor AI Extension content script loaded');

// Debug helper - show current page info
console.log('📍 Current page:', {
  url: window.location.href,
  isYouTube: window.location.hostname.includes('youtube.com'),
  hasVideo: !!document.querySelector('video'),
  hasControls: !!document.querySelector('.ytp-right-controls')
});

// Setup controls cho transcript overlay
function setupTranscriptControls() {
  const originalBtn = document.getElementById('toggle-original');
  const translatedBtn = document.getElementById('toggle-translated');
  const closeBtn = document.getElementById('close-transcript');
  const transcriptText = document.getElementById('transcript-text');

  originalBtn.addEventListener('click', () => {
    originalBtn.classList.add('active');
    translatedBtn.classList.remove('active');
    transcriptText.className = 'transcript-text-original';
    transcriptText.innerHTML = createTranscriptHTML(currentTranscript.original);
  });

  translatedBtn.addEventListener('click', () => {
    translatedBtn.classList.add('active');
    originalBtn.classList.remove('active');
    transcriptText.className = 'transcript-text-translated';
    transcriptText.innerHTML = createTranscriptHTML(currentTranscript.translated);
  });

  closeBtn.addEventListener('click', hideTranscriptOverlay);
}

// Bắt đầu sync transcript với video
function startTranscriptSync() {
  if (highlightInterval) {
    clearInterval(highlightInterval);
  }

  highlightInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (!video || !currentTranscript) return;

    const currentTime = video.currentTime;
    highlightCurrentSegment(currentTime);
  }, 100); // Update mỗi 100ms

  // Cleanup khi video kết thúc hoặc pause
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('ended', hideTranscriptOverlay);
    video.addEventListener('pause', () => {
      if (highlightInterval) {
        clearInterval(highlightInterval);
      }
    });
    video.addEventListener('play', startTranscriptSync);
  }
}

// Highlight segment hiện tại
function highlightCurrentSegment(currentTime) {
  const segments = document.querySelectorAll('.transcript-segment');
  
  segments.forEach(segment => {
    const startTime = parseFloat(segment.dataset.start);
    const endTime = parseFloat(segment.dataset.end);
    
    if (currentTime >= startTime && currentTime <= endTime) {
      segment.classList.add('active');
      
      // Scroll to active segment
      segment.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    } else {
      segment.classList.remove('active');
    }
  });
}

// Ẩn transcript overlay
function hideTranscriptOverlay() {
  if (transcriptOverlay) {
    transcriptOverlay.remove();
    transcriptOverlay = null;
  }
  
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
  
  currentTranscript = null;
}
function showTranslatedSubtitles(translatedText) {
  // Xóa subtitles cũ nếu có
  const oldSubtitles = document.getElementById('translated-subtitles');
  if (oldSubtitles) {
    oldSubtitles.remove();
  }

  const subtitleBox = document.createElement('div');
  subtitleBox.id = 'translated-subtitles';
  subtitleBox.innerHTML = `
    <div class="subtitle-header">
      <h4>🇻🇳 Phụ đề tiếng Việt</h4>
      <button onclick="closeSubtitles()">✕</button>
    </div>
    <div class="subtitle-content">
      ${translatedText.replace(/\n/g, '<br>')}
    </div>
    <div class="subtitle-footer">
      <button onclick="copySubtitles()">📋 Sao chép</button>
    </div>
  `;
  
  document.body.appendChild(subtitleBox);
}

// Đóng subtitle box
function closeSubtitles() {
  const subtitles = document.getElementById('translated-subtitles');
  if (subtitles) {
    subtitles.remove();
  }
}

// Sao chép phụ đề
function copySubtitles() {
  const content = document.querySelector('#translated-subtitles .subtitle-content');
  if (content) {
    const text = content.innerText;
    navigator.clipboard.writeText(text).then(() => {
      showNotification('📋 Đã sao chép phụ đề!', 'success');
    });
  }
}
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `translation-notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto remove sau 3 giây
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Phát audio dubbing
function playDubbedAudio(audioUrl) {
  // Dừng audio cũ nếu có
  stopDubbing();
  
  // Lưu âm lượng video gốc và giảm xuống
  const video = document.querySelector('video');
  if (video) {
    originalVideoVolume = video.volume;
    video.volume = 0.1; // Giảm âm lượng video xuống 10%
  }
  
  // Tạo và phát audio mới
  currentAudioElement = new Audio(audioUrl);
  currentAudioElement.volume = 0.8;
  
  // Sync với video
  if (video) {
    currentAudioElement.currentTime = video.currentTime;
    currentAudioElement.play();
    
    // Sync khi video play/pause
    const syncAudio = () => {
      if (video.paused) {
        currentAudioElement.pause();
      } else {
        currentAudioElement.play();
      }
    };
    
    video.addEventListener('play', syncAudio);
    video.addEventListener('pause', syncAudio);
    
    // Sync thời gian khi seek
    video.addEventListener('seeked', () => {
      if (currentAudioElement) {
        currentAudioElement.currentTime = video.currentTime;
      }
    });
  }
  
  updatePanelButton();
  showNotification('🎵 Đã bật lồng tiếng AI', 'success');
}

// Lắng nghe message từ background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'translationProgress':
      updateLoadingStep(message.step);
      if (message.stepText) {
        const stepEl = document.getElementById(`step-${message.step}`);
        if (stepEl) {
          stepEl.querySelector('.step-text').textContent = message.stepText;
        }
      }
      break;
      
    case 'translationComplete':
      isTranslating = false;
      hideLoadingOverlay();
      updatePanelButton();
      
      if (message.subtitles && message.originalTranscript) {
        showTranslatedSubtitles(message.subtitles);
        showTranscriptOverlay(message.originalTranscript, message.subtitles);
        showNotification('✅ Đã dịch xong phụ đề!', 'success');
      }
      break;
      
    case 'translationError':
      isTranslating = false;
      hideLoadingOverlay();
      updatePanelButton();
      
      const errorMsg = message.error || 'Lỗi không xác định';
      showNotification(`❌ Lỗi: ${errorMsg}`, 'error');
      console.error('Translation error:', message);
      break;
  }
});

// Khởi động khi trang load
if (window.location.hostname === 'www.youtube.com') {
  console.log('🎬 YouTube English->Vietnamese Translation Extension activated');
  
  // Thêm controls ngay lập tức
  addTranslationControls();
  
  // Make functions global for onclick handlers  
  window.closeSubtitles = closeSubtitles;
  window.copySubtitles = copySubtitles;
  
  // Theo dõi navigation trong YouTube SPA
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('🔄 YouTube navigation detected, re-adding controls');
      
      // Delay một chút để đợi DOM update
      setTimeout(() => {
        addTranslationControls();
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
  
  // Cleanup khi rời khỏi trang
  window.addEventListener('beforeunload', () => {
    if (currentAudioElement) {
      currentAudioElement.pause();
    }
    hideTranscriptOverlay();
  });
}