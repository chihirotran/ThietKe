# Nhà mình — thiết kế nội thất 3D

Trình xem tương tác cho phương án cải tạo nhà có gác lửng, dựa trên ảnh/video hiện trạng và ảnh thiết kế do người dùng tạo bằng AI rồi chọn làm mẫu. Bản HTML ban đầu được giữ tại `original/index.html`.

## Ba phương án riêng

- **01 · Theo ảnh mẫu**: giữ phương án đã chọn, gồm gác ngang, lan can trắng, giường xanh nhạt, hệ tủ gỗ dưới gác và bàn hai màn hình. Mở trực tiếp tại http://localhost:5173/?design=reference.
- **02 · Hiện đại**: đề xuất cho một người ở, gác mở rộng, thang chữ L với lan can kính, tủ phẳng không tay nắm, bàn làm việc liền hệ tủ, sofa bọc nệm và TV treo. Bề mặt trần phẳng, gỗ chỉ dùng làm điểm nhấn, ánh sáng dịu và vật liệu trung tính. Mở trực tiếp tại http://localhost:5173/?design=modern. Giữ bếp và phòng tắm/WC riêng ở phía sau; thay vách quanh thang theo bố trí mới.
- **03 · Theo mặt bằng mới**: dựng từ sơ đồ người dùng gửi, với sofa chữ L phía trước, khách–ăn–bếp liên thông, giữ cầu thang sắt hiện có theo video, WC và khu giặt ở cuối nhà. Theo yêu cầu mới nhất, gác rút ngắn 1/3 chiều sâu từ mép phía phòng khách, giữ mép sau, thang và tường cạnh thang. Mặc định gác sâu khoảng 3,71 m thay vì 5,56 m, giường 1,3 × 2 m xoay ngang nhà, phía phòng khách và bàn ăn thông thoáng phía trên. Bàn ăn hai chỗ và góc làm việc hai màn hình dành cho một người. Mở trực tiếp tại http://localhost:5173/?design=proposed. Sơ đồ gốc được giữ trong thẻ **Mặt bằng mới** của hộp tư liệu để đối chiếu.
- Cửa vào được người dùng xác nhận ở **mặt trước, lệch phải**. Bản 02 bố trí sofa bên trái, TV treo phía phải lùi khỏi cửa, giữ khoảng đón và đường đi về khu sau. Bề rộng cửa 0,9 m và khoảng đón 1 m trong mô hình là **ước lượng thiết kế**, chưa có số đo cửa hoặc hướng mở cánh thực tế.
- Nút chọn phương án nằm đầu thanh bên. Kích thước, vật liệu và ánh sáng được nhớ riêng cho từng bản. Lần mở đầu tiên mặc định là bản 03 ở góc phối cảnh; các đường dẫn riêng vẫn mở đúng phương án đã chọn. Bản 02 và 03 dành cho một người ở; bản 01 vẫn có tùy chọn thử hai chỗ làm việc.
- Bản theo ảnh đã được sao lưu đầy đủ tại `saved-designs/01-theo-anh-2026-09-30/`, kèm ảnh xem trước và danh sách kiểm tra tệp `snapshot.json`. Tệp `saved-designs/01-theo-anh-2026-09-30.zip` có thể tải từ nút **Tải bản đã lưu** trên web. Chỉnh sửa trong trình xem không ghi đè bản sao này.
- Diện tích gác hiển thị ở bản 02 đã trừ lỗ thang; phần tăng thêm so với bản 01 được tính trên cùng số đo đang chọn. Các con số là diện tích mô hình ước lượng, chưa phải diện tích nghiệm thu.
- Ngân sách chưa chốt. Giao diện phân biệt phần xây sửa (gác, thang, vách) và phần hoàn thiện nội thất để tiện cân nhắc theo giai đoạn. Phương án mở rộng cần khảo sát kết cấu và số đo thực tế trước khi triển khai; mô hình không phải hồ sơ kết cấu.
- Bản 03 dùng kích thước tổng thể đã biết; sơ đồ không có kích thước phòng, nên ranh giới từng khu và thiết bị còn ước lượng. Theo yêu cầu mới nhất, giữ cầu thang hiện có từ video thay cho thang chữ L mới. Mô hình tái sử dụng vị trí, hướng và kích thước thang ước lượng của bản hiện trạng; gác và đồ đạc điều chỉnh theo thang này. Video cho thấy rõ vế dưới thang sắt hẹp, bậc hở và tay vịn phải và tường kín sát bên trái khi đi lên; tường được giữ trong cả góc phối cảnh mở tường, mặt bằng hiển thị chân tường. Đoạn nối trên bị khuất, chưa xác nhận có bẻ góc hay không. Không coi số bậc hoặc kích thước mô hình là số đo thực tế. Bộ điều chỉnh bản 03 nhận chiều dài từ 9,5–12 m để giữ đủ chỗ cho các khu này; hai bản trước giữ khoảng điều chỉnh cũ.

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

## Số đo và hiện trạng dùng cho bản 01

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

- `src/house.js`, `src/layout.js`: hình học và bố trí của bản theo ảnh, giữ nguyên khi thêm bản hiện đại.
- `src/modern-house.js`, `src/modern-layout.js`: hình học và bố trí mới của bản hiện đại.
- `src/proposed-house.js`, `src/proposed-layout.js`: hình học và bố trí của bản theo mặt bằng mới.
- `src/designs.js`: lựa chọn phương án và dữ liệu lưu riêng.
- `src/main.js`: trình xem, góc nhìn và tương tác.
- `src/dimensions.js`: số đo mặc định và kiểm tra dữ liệu.
- `src/style.css`: giao diện và bố cục cho điện thoại.
- `public/references/`: tư liệu người dùng để đối chiếu.

Sử dụng [Three.js](https://threejs.org/) và [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Phông chữ Be Vietnam Pro được cung cấp theo giấy phép SIL Open Font License.
# ThietKe
