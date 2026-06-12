"# meeting" 
╔══════════════════════════════════════════╗
║         SPEECH TRANSLATOR v1.0           ║
║      Hướng dẫn cài đặt & sử dụng        ║
╚══════════════════════════════════════════╝

CÀI ĐẶT (chỉ làm 1 lần):
  1. Giải nén file ZIP ra Desktop
  2. Vào folder SpeechTranslator
  3. Click đúp vào file "start.bat"
  4. Nếu Windows hỏi "Run anyway" → bấm chấp nhận
  5. Trình duyệt tự mở → dùng ngay!

SỬ DỤNG:
  - Lần đầu: Nhập Gemini API Key vào ô Admin (góc trái)
  - Lấy key miễn phí tại: https://aistudio.google.com
  - Chọn ngôn ngữ nguồn và ngôn ngữ đích
  - Nhấn nút ghi âm và bắt đầu nói!

TẮT APP:
  - Đóng cửa sổ đen (terminal) hoặc
  - Click đúp file "stop.bat"

LƯU Ý:
  - App chạy hoàn toàn trên máy tính của bạn
  - Edge TTS (giọng đọc) hoạt động offline, không cần internet
  - Chỉ cần internet khi dùng tính năng dịch thuật (Gemini API)

GẶP LỖI? Liên hệ: support@speaklink.local



Now root dev mode runs:

npm start

That starts:

npm --prefix server run dev
npm --prefix client run dev

Server changes will restart through nodemon, and client changes will hot reload through Vite.

Production-style start is still available:

npm run build
npm run start:prod