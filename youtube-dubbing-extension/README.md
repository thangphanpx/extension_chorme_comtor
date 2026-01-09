# �🇳 YouTube English→Vietnamese Translator

Chrome extension đơn giản để dịch phụ đề video YouTube từ tiếng Anh sang tiếng Việt cho mục đích cá nhân.

## ✨ Tính năng chính

- **Dịch tự động** từ tiếng Anh sang tiếng Việt
- **Giao diện đơn giản**, tích hợp trực tiếp vào YouTube
- **Hiển thị phụ đề** đã dịch ngay trên video
- **Sao chép phụ đề** để sử dụng ở nơi khác
- **Dịch vụ miễn phí** LibreTranslate (không cần API key)
- **Chất lượng cao** với Google Translate API (tùy chọn)
- **Chất lượng cao**: Lựa chọn giữa chế độ Chuẩn (nhanh) và Cao cấp (chậm hơn)

### 🎛️ Điều khiển thông minh
- **Tích hợp YouTube**: Nút điều khiển xuất hiện ngay trong video player
- **Sync hoàn hảo**: Audio lồng tiếng tự động sync với video
- **Điều khiển âm lượng**: Tự động giảm âm lượng video gốc khi phát lồng tiếng
- **Dễ sử dụng**: Giao diện đơn giản, trực quan

### 🔧 Cài đặt linh hoạt
- **Nhiều API**: Hỗ trợ OpenAI, Google Cloud, LibreTranslate
- **Tùy chỉnh giọng nói**: Chọn giọng nam/nữ
- **Lưu preferences**: Ghi nhớ các cài đặt ưa thích
- **Thống kê sử dụng**: Theo dõi số video đã dịch và thời gian sử dụng

## 📁 Cấu trúc Project

```
youtube-dubbing-extension/
├── manifest.json           # Cấu hình Chrome extension
├── background.js           # Service worker (xử lý API)
├── content.js             # Script chạy trên YouTube
├── popup.html             # Giao diện popup settings
├── popup.js               # Logic popup
├── styles.css             # Styling cho UI components
├── icons/                 # Icon extension
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── create-icons.ps1   # Script tạo icon
└── README.md              # Documentation
```

## 🚀 Cài đặt và Sử dụng

### Bước 1: Load Extension vào Chrome
1. Mở Chrome và truy cập `chrome://extensions/`
2. Bật "Developer mode" ở góc trên bên phải
3. Click "Load unpacked"
4. Chọn thư mục `youtube-dubbing-extension`

### Bước 2: Cấu hình API Keys (Tùy chọn)
1. Click vào icon extension trong toolbar
2. Nhập API keys (xem phần [API Setup](#-api-setup) bên dưới)
3. Lưu cài đặt

### Bước 3: Sử dụng
1. Mở video YouTube bất kỳ
2. Nhìn thấy icon 🌐 xuất hiện trong video player
3. Click vào icon để chọn ngôn ngữ và bắt đầu dịch
4. Đợi quá trình xử lý hoàn thành
5. Thưởng thức video với lồng tiếng AI!

## 🔑 API Setup

Extension hỗ trợ nhiều API providers. Bạn có thể sử dụng một hoặc nhiều:

### OpenAI (Khuyến nghị)
```
API: https://api.openai.com/v1/
Dịch: GPT-3.5/GPT-4
TTS: OpenAI TTS
Giá: ~$0.002 per 1K tokens (dịch) + $0.015 per 1K chars (TTS)
```

### Google Cloud
```
Translation API: https://cloud.google.com/translate
Text-to-Speech: https://cloud.google.com/text-to-speech
Giá: $20 per 1M chars (translate) + $4-16 per 1M chars (TTS)
```

### YouTube API
```
API: YouTube Data API v3
Dùng để: Lấy transcript/subtitles chính xác
Giá: Free (có quota limit)
```

### Fallback Methods
- **LibreTranslate**: Dịch miễn phí (chất lượng thấp hơn)
- **Web Speech API**: Text-to-Speech của browser
- **Demo Mode**: Cho testing không cần API

## 🎨 UI/UX Features

### Video Player Integration
- Icon 🌐 tự động xuất hiện trong YouTube controls
- Không làm gián đoạn trải nghiệm xem video
- Responsive trên desktop và mobile

### Translation Panel
- Thiết kế modern với gradient background
- Dropdown chọn ngôn ngữ với flag icons
- Real-time preview settings

### Loading Experience
- Progress indicator với các bước cụ thể:
  1. 📝 Đang lấy phụ đề video...
  2. 🌐 Đang dịch nội dung...
  3. 🎵 Đang tạo audio lồng tiếng...
  4. ✅ Hoàn thành!

### Notifications
- Toast notifications cho feedback
- Phân loại theo success/error/info
- Auto-dismiss sau 3 giây

## 🛠️ Development

### Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **APIs**: OpenAI, Google Cloud, YouTube Data API
- **Chrome APIs**: Storage, Runtime, Tabs
- **Architecture**: Content Script + Background Service Worker

### Key Components

#### Content Script (`content.js`)
- Inject UI controls vào YouTube
- Xử lý user interactions
- Sync audio với video playback
- Real-time notifications

#### Background Script (`background.js`)
- API calls đến translation/TTS services
- Xử lý transcript extraction
- Error handling và fallbacks
- Progress tracking

#### Popup Interface (`popup.html/js`)
- Settings management
- API key configuration
- Usage statistics
- Testing tools

### Debugging
```javascript
// Enable debug logging
localStorage.setItem('youtube-dubbing-debug', 'true');

// Check extension status
chrome.runtime.sendMessage({action: 'status'});

// View storage data
chrome.storage.sync.get(null, console.log);
```

## 🌍 Supported Languages

| Code | Language | TTS Support | Quality |
|------|----------|-------------|---------|
| `vi` | Tiếng Việt | ✅ | High |
| `en` | English | ✅ | Excellent |
| `ja` | 日本語 | ✅ | High |
| `ko` | 한국어 | ✅ | High |
| `zh` | 中文 | ✅ | High |
| `es` | Español | ✅ | High |
| `fr` | Français | ✅ | High |
| `de` | Deutsch | ✅ | High |
| `it` | Italiano | ✅ | Good |
| `pt` | Português | ✅ | Good |
| `ru` | Русский | ✅ | Good |
| `ar` | العربية | ✅ | Good |
| `th` | ไทย | ✅ | Good |

## 📊 Performance

### Typical Processing Times
- **Transcript extraction**: 2-5 seconds
- **Translation (OpenAI)**: 3-8 seconds
- **Audio generation**: 10-30 seconds
- **Total for 10min video**: 15-45 seconds

### Resource Usage
- **Memory**: ~50MB during processing
- **Network**: 1-5MB per video (depending on length)
- **Storage**: <1MB for settings and cache

## 🔒 Privacy & Security

### Data Handling
- API keys stored locally in Chrome storage
- No data sent to external servers except AI APIs
- Transcript data processed temporarily, not stored
- No user tracking or analytics

### Permissions
```json
{
  "activeTab": "Access current YouTube tab",
  "storage": "Save user preferences", 
  "host_permissions": [
    "https://www.youtube.com/*",
    "https://api.openai.com/*",
    "https://translate.googleapis.com/*"
  ]
}
```

## 🚨 Limitations

### Current Limitations
- Chỉ hỗ trợ video có sẵn subtitles/closed captions
- Cần API keys cho chất lượng tốt nhất
- Không hỗ trợ live streaming
- Audio dubbing chưa hoàn hảo 100% sync với lip movement

### Known Issues
- Một số video có thể bị hạn chế transcript
- Rate limiting của API providers
- Mobile YouTube app không hỗ trợ

## 🛣️ Roadmap

### Version 1.1
- [ ] Hỗ trợ subtitle overlay
- [ ] Batch processing nhiều video
- [ ] Improved audio sync algorithms
- [ ] Offline translation models

### Version 1.2  
- [ ] Custom voice training
- [ ] Real-time translation
- [ ] Integration với YouTube Shorts
- [ ] Collaborative translations

### Version 2.0
- [ ] Support other video platforms
- [ ] Advanced AI voice cloning
- [ ] Professional dubbing workflows
- [ ] Enterprise features

## 🤝 Contributing

### Development Setup
```bash
git clone <repo-url>
cd youtube-dubbing-extension
# Load into Chrome extensions
```

### Testing
1. Load extension vào Chrome
2. Mở YouTube video bất kỳ
3. Test các tình huống:
   - Video có/không có subtitles
   - Các ngôn ngữ khác nhau
   - API keys hợp lệ/không hợp lệ
   - Network slow/offline

### Code Style
- ES6+ JavaScript
- Semantic HTML
- Mobile-first CSS
- Chrome extension best practices

## 📝 License

MIT License - xem [LICENSE](LICENSE) file cho chi tiết.

## 🙏 Acknowledgments

- Inspired by [YouTube Dubbing Extension](https://chromewebstore.google.com/detail/youtube-dubbing-%E2%80%93-transla/oglffgiaiekgeicdgkdlnlkhliajdlja)
- OpenAI for powerful AI APIs
- Google Cloud for translation services
- YouTube for the platform

## 📞 Support

### FAQ
**Q: Extension không hoạt động?**
A: Kiểm tra video có subtitles, thử reload trang, check API keys

**Q: Chất lượng dịch không tốt?**
A: Thử OpenAI API thay vì free services, hoặc chọn chất lượng Cao cấp

**Q: Audio không sync với video?**
A: Đây là limitation hiện tại, đang được cải thiện trong version tới

### Contact
- GitHub Issues: [Report bugs](https://github.com/your-repo/issues)
- Email: your-email@domain.com

---

Made with ❤️ for YouTube lovers who want to break language barriers!