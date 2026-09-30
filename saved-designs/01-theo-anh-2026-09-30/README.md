# Nhà mình — thiết kế nội thất 3D

Trình xem tương tác cho phương án cải tạo nhà có gác lửng, dựa trên ảnh/video hiện trạng và ảnh thiết kế do người dùng tạo bằng AI rồi chọn làm mẫu. Bản HTML ban đầu được giữ tại `original/index.html`.

## Chạy trang web

Nếu đã cài các thư viện, chạy `./start.sh`, sau đó mở http://localhost:5173.

Trên máy khác có Node.js 20.19+ hoặc 22.12+:

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
npm test
```

## Số đo và phạm vi

- Người dùng cung cấp: sàn đến gác **2,5 m**; gác đến mái **2,3 m**.
- Người dùng xác nhận diện tích **tầng trệt 43 m²**, chiều dài **11 m**, chưa tính gác. Chiều ngang suy ra khoảng **3,91 m** theo giả định mặt bằng hình chữ nhật; cần số đo ngang để xác nhận chính xác.
- Đối chiếu video từ **0:10 đến hết**: từ phòng chính qua cửa vào một **khoảng giặt/rửa và lối đi**, rồi qua cửa thứ hai để vào bếp phía trước. Máy giặt nằm ngoài phòng bếp, cạnh khu thang.
- Cầu thang ở **bên trái** lối đi. Video cho thấy thang có vẻ đi ngang về phía trái; hướng này được dùng để dựng sơ bộ, chiều dài và chiếu tới chưa có số đo. Sàn gác có lỗ mở cho thang và khoảng đặt chân ở đầu thang.
- Phòng tắm/WC là phòng riêng **bên trái bếp**. Người dùng xác nhận **cửa WC mở ra khoảng máy giặt/cầu thang**. Vách giữa bếp và WC kín, mỗi phòng có cửa riêng từ khoảng giặt/rửa.
- Gác chạy ngang bề rộng nhà, vươn về phòng chính để che hệ tủ và một phần bàn làm việc. Theo mô tả mới của người dùng, chiều sâu gác **gần bằng nửa chiều dài phòng khách**; tỷ lệ phòng và vị trí mép gác vẫn cần đo lại.
- Thiết kế mặc định cho **một người** theo ảnh mẫu: một chỗ ngồi với hai màn hình bên trái, hệ tủ gỗ dưới gác, lối đi bên phải, giường nằm ngang trên gác, chăn xanh nhạt, lan can trắng và tủ cao sát phải. Có thể thử phương án hai chỗ làm việc trên cùng mặt bằng.
- Vị trí tương đối theo video và mô tả người dùng. Kích thước từng phòng, vị trí chính xác của cửa, độ dốc thang và chiếu tới vẫn là bố trí sơ bộ để hình dung. Video không cho thấy rõ nội thất WC; thiết bị và nội thất mới là đề xuất thiết kế, chưa phải hồ sơ thi công.
- Hộp kích thước cho phép chỉnh tỷ lệ trong phạm vi phù hợp với bố trí này (ngang 3,2–5,5 m; sâu 7,5–12 m). Dữ liệu được lưu trong trình duyệt. Nhà ngoài phạm vi này cần bố trí lại đồ đạc.

## Cách sử dụng

- **Từ cửa:** góc nhìn mặc định đối chiếu với ảnh mẫu, hiện tường và gác; kéo để xoay, chọn lại nút để trở về góc ban đầu.
- **Phối cảnh:** kéo để xoay, cuộn để phóng to, chuột phải hoặc hai ngón để dịch chuyển.
- **Mặt bằng:** tự ẩn tường và sàn gác, hiển thị tầng trệt từ trên xuống.
- **Bên trong:** kéo để nhìn quanh tại vị trí đang chọn; chọn khu vực để đổi vị trí.
- Chọn khu sinh hoạt, gác ngủ, cầu thang, khoảng giặt/lối đi, phòng bếp hoặc phòng tắm/WC để đến góc nhìn tương ứng.
- Chuyển giữa **Một người · theo ảnh** và **Hai chỗ làm việc** để so sánh phương án. Lựa chọn được lưu trong trình duyệt.
- Bật/tắt gác, tường cắt, chú thích và ánh sáng ấm; đổi gỗ sáng/gỗ tối.
- **Lưu ảnh:** tải ảnh PNG của góc nhìn hiện tại, có chú thích kích thước.
- **Ảnh mẫu & hiện trạng:** xem riêng ảnh mẫu thiết kế, hai ảnh gốc và video. Thẻ **Khu sau · 0:10** chuyển đến đoạn cầu thang, máy giặt và bếp để đối chiếu. Video được chuyển mã H.264 để tương thích trình duyệt; nội dung không thay đổi.
- Khi canvas được chọn, phím mũi tên điều khiển góc nhìn; `+` / `-` phóng to và thu nhỏ.

Ảnh, video và phông chữ được phục vụ từ máy chạy ứng dụng. Không cần tài khoản, dịch vụ đám mây hoặc khóa API. Ứng dụng chưa được xuất bản lên Internet.

## Cấu trúc

- `src/house.js`: hình học, vật liệu và bố trí nội thất.
- `src/layout.js`: mặt bằng, lỗ thang, cửa, ranh giới phòng và vị trí góc nhìn dùng chung.
- `src/main.js`: trình xem, góc nhìn và tương tác.
- `src/dimensions.js`: số đo mặc định và kiểm tra dữ liệu.
- `src/style.css`: giao diện và bố cục cho điện thoại.
- `public/references/`: tư liệu người dùng để đối chiếu.

Sử dụng [Three.js](https://threejs.org/) và [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Phông chữ Be Vietnam Pro được cung cấp theo giấy phép SIL Open Font License.
