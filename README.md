# Advanced Anti-Cheat System

Kiến trúc Hệ thống Giám sát thi Full-stack với Express, Prisma, WebSockets và React Vite.

## Cấu trúc dự án
- `/backend`: Node.js, Prisma, REST & WS Transport, Risk Engine in `src/server.ts`
- `/frontend`: React + Vite (Giao diện thi & Bảng giám thị điều khiển)
- `/e2e-tests`: Playwright Smoke tests.

## Cài đặt (Setup)
1. **Khởi chạy CSDL**:
   ```bash
   docker-compose up -d
   ```
2. **Backend**:
   ```bash
   cd backend
   npm i
   npx prisma db push
   npx ts-node prisma/seed.ts
   npm run dev
   ```
3. **Frontend**:
   ```bash
   cd frontend
   npm i
   npm run dev
   ```

## Hạn chế của Trình duyệt (Browser Limitations)
- Khả năng khóa màn hình tuyệt đối (Full lockdown) không khả thi trong môi trường web đơn thuần (cần dùng Safe Exam Browser). JavaScript chỉ có thể phản ứng với các vi phạm thay vì chặn cứng các phím hệ thống (Alt-Tab, Cửa sổ mới).
- SendBeacon chỉ hoạt động kích cỡ Payload nhỏ và không chắc chắn trả về log trong môi trường iOS mờ nhạt.
- Giao diện kết nối màn hình phụ (`window.screen.isExtended`) không được hỗ trợ trên Firefox/Safari mà chỉ chạy trên các dòng nhân Chromium mới.

## Chú ý về Quyền riêng tư (Privacy Notes)
- Toàn bộ log vi phạm chỉ phân tích siêu dữ liệu hành vi (Kinematics metadata) và cấu hình phần cứng cục bộ. Hệ thống không ghi màn hình camera / micro hay thu thập thông tin cá nhân.
- Khay nhớ tạm (Clipboard) bị vô hiệu hóa nhưng hệ thống không đọc dữ liệu hiện có trong Clipboard của thí sinh trước khi điền.
- Tất cả WebSockets Event Logs đều xoay quanh định danh tạm `resumeToken` sinh ngẫu nhiên thay vì truyền trực tiếp PII (Giao thức SSL/TLS là bắt buộc ở Production).
