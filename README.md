# Binance Market Outlook

Web app tiếng Việt theo dõi độ rộng thị trường Binance Spot với các cặp USDT.

## Các chỉ số

- Giá hiện tại > EMA200 ngày.
- Giá hiện tại > MA200 ngày.
- MACD tuần > 0.
- MACD tháng > 0.
- MA50 ngày > MA200 ngày.
- Giá hiện tại > giá cao nhất của tuần trước đã đóng.

Mỗi chỉ số hiển thị số lượng và tỷ lệ trên các coin đủ dữ liệu. Có lựa chọn tất cả coin, top 100/top 50 theo khối lượng, loại stablecoin, tìm kiếm và bộ lọc chi tiết.

## Chạy trên máy

Không cần cài thư viện. Từ thư mục dự án, chạy:

```sh
python3 -m http.server 8000 --directory dist
```

Mở http://localhost:8000 và bấm **Cập nhật dữ liệu**. Cần Internet để truy cập API công khai Binance; không cần API key.

## Phương pháp

MA50 và MA200 dùng 50/200 giá đóng cửa ngày đã đóng theo UTC. EMA200 được khởi tạo bằng SMA200 và cập nhật trên tối đa 1.000 nến ngày. MACD là EMA12 − EMA26, không phải histogram; mỗi EMA khởi tạo bằng SMA tương ứng. Nến tuần/tháng mặc định đã đóng, có thể chọn gồm nến đang chạy. Đỉnh tuần trước luôn lấy High của nến tuần gần nhất đã đóng. Coin thiếu lịch sử hoặc lỗi tải được hiển thị riêng.

Dữ liệu giá và nến được lấy trong một lượt quét, tại các thời điểm khác nhau. Binance có thể giới hạn tốc độ hoặc truy cập theo khu vực.

## Cấu trúc

- `dist/index.html`: giao diện.
- `dist/style.css`: bố cục responsive.
- `dist/app.js`: tải dữ liệu, thống kê và bộ lọc.
- `dist/indicators.mjs`: tính chỉ số.
- `.openai/hosting.json`: cấu hình triển khai Sites hiện tại.

Nguồn: https://developers.binance.com/en/docs/products/spot/rest-api

## Gửi báo cáo lên Telegram

Sau khi quét hoàn tất, nhập Bot Token và Channel ID (`@ten_channel` hoặc `-100…`) trên giao diện, xem trước nội dung rồi bấm **Gửi kết quả lên Telegram**. Bot phải là quản trị viên channel với quyền đăng bài. Token chỉ dùng trong lần gửi, không lưu vào trình duyệt hay repository; được xóa khỏi ô nhập sau khi gửi thành công.

Frontend nguồn nằm trong `public/`. `worker/handler.mjs` chuyển tiếp yêu cầu gửi đến Telegram, không ghi log token và không tự thử lại để tránh gửi trùng. Backend này được bảo vệ bởi quyền truy cập Sites hiện tại. Không công khai backend mà chưa bổ sung kiểm soát truy cập tương ứng.

Build bản triển khai: `node scripts/build.mjs`. Kiểm tra backend với yêu cầu giả lập (không gửi tin thật): `node scripts/test-telegram.mjs`.

Chạy `python3 -m http.server 8000 --directory public` để xem giao diện cục bộ; chức năng gửi Telegram cần backend Worker được triển khai trên Sites.
