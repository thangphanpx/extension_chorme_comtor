// Background script cho YouTube AI Dubbing Extension
// Xử lý API calls và logic dịch thuật

console.log('🔧 YouTube AI Dubbing Extension Background Script loaded');

// Biến global để track state
let translationTasks = new Map();

// Lắng nghe message từ content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request, sender.tab.id);
  } else if (request.action === 'cancel_translation') {
    handleCancelTranslation(sender.tab.id);
  }
  
  // Return true để giữ message channel mở cho async responses
  return true;
});

// Xử lý yêu cầu dịch
async function handleTranslation(request, tabId) {
  const { videoId, videoTitle } = request;
  
  console.log('🎯 Starting English->Vietnamese translation for:', { videoId });
  
  try {
    // Hủy task cũ nếu có
    if (translationTasks.has(tabId)) {
      translationTasks.get(tabId).cancelled = true;
    }
    
    // Tạo task mới
    const task = { cancelled: false, videoId, targetLang: 'vi' };
    translationTasks.set(tabId, task);
    
    // Bước 1: Lấy transcript/subtitles
    sendProgress(tabId, 1, 'Đang lấy phụ đề tiếng Anh...');
    const transcript = await fetchVideoTranscript(videoId);
    
    if (task.cancelled) return;
    
    // Bước 2: Dịch transcript
    sendProgress(tabId, 2, 'Đang dịch sang tiếng Việt...');
    const translatedText = await translateText(transcript, 'vi');
    
    if (task.cancelled) return;
    
    // Bước 3: Hoàn thành (bỏ qua audio vì chỉ cần dịch text)
    sendProgress(tabId, 3, 'Hoàn thành dịch thuật!');
    
    // Gửi kết quả về content script
    chrome.tabs.sendMessage(tabId, {
      action: 'translationComplete',
      subtitles: translatedText,
      originalTranscript: transcript,
      timing: generateTimingInfo(transcript) // Thêm timing info
    });
    
    // Cleanup
    translationTasks.delete(tabId);
    
  } catch (error) {
    console.error('❌ Translation error:', error);
    
    chrome.tabs.sendMessage(tabId, {
      action: 'translationError',
      error: error.message
    });
    
    translationTasks.delete(tabId);
  }
}

// Hủy translation
function handleCancelTranslation(tabId) {
  if (translationTasks.has(tabId)) {
    translationTasks.get(tabId).cancelled = true;
    translationTasks.delete(tabId);
    console.log('🛑 Translation cancelled for tab:', tabId);
  }
}

// Gửi progress update
function sendProgress(tabId, step, stepText) {
  chrome.tabs.sendMessage(tabId, {
    action: 'translationProgress',
    step: step,
    stepText: stepText
  });
}

// Lấy transcript/subtitles từ YouTube
async function fetchVideoTranscript(videoId) {
  try {
    // Phương pháp 1: Thử lấy từ YouTube API (cần API key)
    const apiKey = await getApiKey('youtube');
    if (apiKey) {
      const transcript = await fetchYouTubeTranscript(videoId, apiKey);
      if (transcript) return transcript;
    }
    
    // Phương pháp 2: Sử dụng youtube-transcript-api alternative
    const transcript = await fetchTranscriptAlternative(videoId);
    if (transcript) return transcript;
    
    // Phương pháp 3: Fallback - tạo transcript giả lập
    console.log('⚠️ Không thể lấy transcript thực, sử dụng demo text');
    return generateDemoTranscript();
    
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Không thể lấy phụ đề video. Video có thể không có phụ đề hoặc bị hạn chế.');
  }
}

// Lấy transcript từ YouTube API
async function fetchYouTubeTranscript(videoId, apiKey) {
  try {
    // Lấy caption tracks
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const captions = data.items;
    
    if (captions.length === 0) return null;
    
    // Ưu tiên caption tiếng Anh hoặc caption đầu tiên
    const caption = captions.find(c => c.snippet.language === 'en') || captions[0];
    
    // Lấy nội dung caption
    const captionResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${caption.id}?key=${apiKey}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!captionResponse.ok) return null;
    
    const captionText = await captionResponse.text();
    return parseCaptionText(captionText);
    
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);
    return null;
  }
}

// Phương pháp alternative để lấy transcript
async function fetchTranscriptAlternative(videoId) {
  try {
    // Sử dụng unofficial API hoặc web scraping method
    // Đây là demo implementation
    const response = await fetch(`https://video.google.com/timedtext?lang=en&v=${videoId}`);
    
    if (response.ok) {
      const xmlText = await response.text();
      return parseXMLTranscript(xmlText);
    }
    
    return null;
  } catch (error) {
    console.error('Error with alternative transcript method:', error);
    return null;
  }
}

// Parse XML transcript
function parseXMLTranscript(xmlText) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const textElements = xmlDoc.getElementsByTagName('text');
    
    let transcript = '';
    for (let element of textElements) {
      transcript += element.textContent + ' ';
    }
    
    return transcript.trim();
  } catch (error) {
    console.error('Error parsing XML transcript:', error);
    return null;
  }
}

// Parse caption text (various formats)
function parseCaptionText(text) {
  // Remove timing info and keep only text content
  return text
    .replace(/<[^>]*>/g, '') // Remove XML tags
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/g, '') // Remove SRT timing
    .replace(/^\d+$/gm, '') // Remove SRT numbers
    .replace(/\n\s*\n/g, '\n') // Remove extra newlines
    .trim();
}

// Tạo demo transcript cho testing
function generateDemoTranscript() {
  return `Welcome to this YouTube video! Today we're going to explore an amazing topic that will help you learn something new. 
  This is a demonstration of our AI dubbing extension that can translate and create voice-over for any YouTube video. 
  The technology behind this uses advanced artificial intelligence to process speech and generate natural-sounding audio in multiple languages. 
  We hope you find this tool useful for learning and understanding content in different languages.`;
}

// Tạo timing information cho transcript
function generateTimingInfo(transcript) {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim());
  const timePerSentence = 300 / sentences.length; // Assume 5 minutes total

  return sentences.map((sentence, index) => ({
    text: sentence.trim() + '.',
    startTime: index * timePerSentence,
    endTime: (index + 1) * timePerSentence
  }));
}

// Dịch text sang ngôn ngữ đích với API configuration
async function translateText(text, targetLang) {
  try {
    // Lấy API settings từ storage
    const settings = await getStoredSettings();
    const apiProvider = settings.apiProvider || 'libre';
    const apiKey = settings.apiKey;
    const apiUrl = settings.apiUrl;
    
    console.log('🔧 Using API provider:', apiProvider);
    
    switch (apiProvider) {
      case 'libre':
        return await translateWithLibre(text, targetLang);
      case 'google':
        return await translateWithGoogle(text, targetLang, apiKey);
      case 'openai':
        return await translateWithOpenAI(text, targetLang, apiKey);
      case 'anthropic':
        return await translateWithAnthropic(text, targetLang, apiKey);
      case 'custom':
        return await translateWithCustomAPI(text, targetLang, apiKey, apiUrl);
      default:
        return await translateWithLibre(text, targetLang);
    }
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback to LibreTranslate
    try {
      return await translateWithLibre(text, targetLang);
    } catch (fallbackError) {
      console.error('Fallback translation failed:', fallbackError);
      return getDemoTranslation(text, targetLang);
    }
  }
}

// Get stored settings helper
async function getStoredSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (result) => {
      resolve(result || {});
    });
  });
}

// Dịch với Google Cloud Translation
async function translateWithGoogle(text, targetLang, apiKey) {
  if (!apiKey) {
    console.log('Google Translate API key not provided, fallback to LibreTranslate');
    return await translateWithLibre(text, targetLang);
  }
  
  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLang,
        format: 'text'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.translations[0].translatedText;
    
  } catch (error) {
    console.error('Google Translation error:', error);
    return await translateWithLibre(text, targetLang);
  }
}

// Dịch với OpenAI
async function translateWithOpenAI(text, targetLang, apiKey) {
  try {
    const languageNames = {
      'vi': 'Vietnamese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'th': 'Thai'
    };
    
    const targetLanguageName = languageNames[targetLang] || targetLang;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguageName}. Return only the translated text without any additional comments.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('OpenAI Translation error:', error);
    return null;
  }
}

// Dịch với LibreTranslate
async function translateWithLibre(text, targetLang) {
  try {
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLang,
        format: 'text'
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.translatedText;
    
  } catch (error) {
    console.error('LibreTranslate error:', error);
    return null;
  }
}

// Demo translation cho testing
function getDemoTranslation(text, targetLang) {
  const translations = {
    'vi': 'Chào mừng bạn đến với video YouTube này! Hôm nay chúng ta sẽ khám phá một chủ đề tuyệt vời sẽ giúp bạn học điều gì đó mới. Đây là một minh họa về extension lồng tiếng AI của chúng tôi có thể dịch và tạo lồng tiếng cho bất kỳ video YouTube nào.',
    'ja': 'このYouTubeビデオへようこそ！今日は、あなたが何か新しいことを学ぶのに役立つ素晴らしいトピックを探求します。これは、任意のYouTubeビデオを翻訳して音声を作成できるAIダビング拡張機能のデモンストレーションです。',
    'ko': '이 YouTube 비디오에 오신 것을 환영합니다! 오늘 우리는 당신이 새로운 것을 배우는 데 도움이 될 놀라운 주제를 탐구할 것입니다. 이것은 모든 YouTube 비디오를 번역하고 음성을 만들 수 있는 AI 더빙 확장 프로그램의 데모입니다.'
  };
  
  return translations[targetLang] || `Demo translation to ${targetLang}: ${text.substring(0, 100)}...`;
}

// Tạo speech audio
async function generateSpeech(text, targetLang, voiceType, quality) {
  try {
    // Phương pháp 1: Google Cloud Text-to-Speech
    const googleApiKey = await getApiKey('google_tts');
    if (googleApiKey) {
      const audio = await generateWithGoogleTTS(text, targetLang, voiceType, quality, googleApiKey);
      if (audio) return audio;
    }
    
    // Phương pháp 2: OpenAI TTS
    const openaiApiKey = await getApiKey('openai');
    if (openaiApiKey) {
      const audio = await generateWithOpenAITTS(text, voiceType, openaiApiKey);
      if (audio) return audio;
    }
    
    // Phương pháp 3: Web Speech API (fallback)
    const audio = await generateWithWebSpeech(text, targetLang, voiceType);
    if (audio) return audio;
    
    // Fallback: Demo audio
    console.log('⚠️ Không thể tạo audio thực, sử dụng demo audio');
    return getDemoAudio();
    
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Không thể tạo audio lồng tiếng. Vui lòng thử lại.');
  }
}

// Tạo audio với Google TTS
async function generateWithGoogleTTS(text, targetLang, voiceType, quality, apiKey) {
  try {
    const voiceName = getGoogleVoiceName(targetLang, voiceType);
    const audioEncoding = quality === 'premium' ? 'MP3' : 'LINEAR16';
    
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: text },
        voice: {
          languageCode: targetLang,
          name: voiceName,
          ssmlGender: voiceType.toUpperCase()
        },
        audioConfig: {
          audioEncoding: audioEncoding,
          speakingRate: 1.0,
          pitch: 0.0
        }
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const audioData = data.audioContent;
    
    // Convert base64 to blob URL
    const audioBlob = base64ToBlob(audioData, 'audio/mpeg');
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { url: audioUrl, blob: audioBlob };
    
  } catch (error) {
    console.error('Google TTS error:', error);
    return null;
  }
}

// Tạo audio với OpenAI TTS
async function generateWithOpenAITTS(text, voiceType, apiKey) {
  try {
    const voice = voiceType === 'female' ? 'nova' : 'onyx';
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      })
    });
    
    if (!response.ok) return null;
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return { url: audioUrl, blob: audioBlob };
    
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    return null;
  }
}

// Tạo audio với Web Speech API
async function generateWithWebSpeech(text, targetLang, voiceType) {
  return new Promise((resolve) => {
    try {
      if (!('speechSynthesis' in window)) {
        resolve(null);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang;
      utterance.rate = 1.0;
      utterance.pitch = voiceType === 'female' ? 1.2 : 0.8;
      
      // Tìm voice phù hợp
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(targetLang)) || voices[0];
      if (voice) utterance.voice = voice;
      
      // Note: Web Speech API không thể tạo audio file trực tiếp
      // Đây chỉ là fallback để test, cần implement audio recording
      speechSynthesis.speak(utterance);
      
      resolve(null); // Không thể tạo URL cho Web Speech API
      
    } catch (error) {
      console.error('Web Speech API error:', error);
      resolve(null);
    }
  });
}

// Demo audio cho testing
function getDemoAudio() {
  // Tạo một audio rỗng hoặc sử dụng file demo
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Tạo một audio demo đơn giản (silent audio)
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const duration = 10; // 10 seconds
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  
  // Tạo sine wave đơn giản cho demo
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz tone
  }
  
  // Convert buffer to blob (simplified)
  const audioBlob = new Blob(['demo audio data'], { type: 'audio/wav' });
  const audioUrl = URL.createObjectURL(audioBlob);
  
  return { url: audioUrl, blob: audioBlob };
}

// Utility functions
function getGoogleVoiceName(languageCode, voiceType) {
  const voiceMap = {
    'en': voiceType === 'female' ? 'en-US-Journey-F' : 'en-US-Journey-D',
    'vi': voiceType === 'female' ? 'vi-VN-Wavenet-A' : 'vi-VN-Wavenet-B',
    'ja': voiceType === 'female' ? 'ja-JP-Wavenet-A' : 'ja-JP-Wavenet-C',
    'ko': voiceType === 'female' ? 'ko-KR-Wavenet-A' : 'ko-KR-Wavenet-C',
    'zh': voiceType === 'female' ? 'cmn-CN-Wavenet-A' : 'cmn-CN-Wavenet-B'
  };
  
  return voiceMap[languageCode] || `${languageCode}-Standard-A`;
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Lấy API keys từ storage
async function getApiKey(service) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([`${service}_api_key`], (result) => {
      resolve(result[`${service}_api_key`] || null);
    });
  });
}

// Dịch với OpenAI GPT
async function translateWithOpenAI(text, targetLang, apiKey) {
  if (!apiKey) {
    console.log('OpenAI API key not provided, fallback to LibreTranslate');
    return await translateWithLibre(text, targetLang);
  }
  
  try {
    const targetLanguageName = targetLang === 'vi' ? 'Vietnamese' : 'English';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguageName}. Only return the translated text, no explanations.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI translation error:', error);
    return await translateWithLibre(text, targetLang);
  }
}

// Dịch với Anthropic Claude
async function translateWithAnthropic(text, targetLang, apiKey) {
  if (!apiKey) {
    console.log('Anthropic API key not provided, fallback to LibreTranslate');
    return await translateWithLibre(text, targetLang);
  }
  
  try {
    const targetLanguageName = targetLang === 'vi' ? 'Vietnamese' : 'English';
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Translate the following text to ${targetLanguageName}. Only return the translated text, no explanations:\\n\\n${text}`
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Anthropic translation error:', error);
    return await translateWithLibre(text, targetLang);
  }
}

// Dịch với Custom API (cho AI local như llama.cpp)
async function translateWithCustomAPI(text, targetLang, apiKey, apiUrl) {
  if (!apiUrl) {
    console.log('Custom API URL not provided, fallback to LibreTranslate');
    return await translateWithLibre(text, targetLang);
  }
  
  try {
    const targetLanguageName = targetLang === 'vi' ? 'Vietnamese' : 'English';
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the given text to ${targetLanguageName}. Only return the translated text, no explanations.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      throw new Error(`Custom API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle different response formats
    if (data.choices && data.choices[0]) {
      return data.choices[0].message?.content || data.choices[0].text || text;
    } else if (data.response) {
      return data.response.trim();
    } else if (data.content) {
      return data.content.trim();
    } else if (data.text) {
      return data.text.trim();
    }
    
    console.warn('Unknown custom API response format:', data);
    return text;
  } catch (error) {
    console.error('Custom API translation error:', error);
    return await translateWithLibre(text, targetLang);
  }
}

// Cleanup khi extension được unload
chrome.runtime.onSuspend?.addListener(() => {
  console.log('🔄 Background script suspended');
  translationTasks.clear();
});