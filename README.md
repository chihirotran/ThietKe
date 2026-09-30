# Nhà mình — thiết kế nội thất 3D

Trình xem tương tác cho phương án cải tạo nhà có gác lửng, dựa trên ảnh/video hiện trạng và ảnh thiết kế do người dùng tạo bằng AI rồi chọn làm mẫu. Bản HTML ban đầu được giữ tại `original/index.html`.

## Ba phương án riêng

- **01 · Theo ảnh mẫu**: giữ phong cách đã chọn, gồm gác thu gọn, lan can trắng, giường xanh nhạt, hệ tủ gỗ dưới gác và bàn hai màn hình. Mở trực tiếp tại http://localhost:5173/?design=reference.
- **02 · Hiện đại**: đề xuất cho một người ở, gác thu gọn với lan can kính, giữ thang sắt hiện có, tủ phẳng không tay nắm, bàn làm việc liền hệ tủ, sofa bọc nệm và TV treo. Bề mặt trần phẳng, gỗ chỉ dùng làm điểm nhấn, ánh sáng dịu và vật liệu trung tính. Mở trực tiếp tại http://localhost:5173/?design=modern. Giữ bếp và phòng tắm/WC riêng ở phía sau; giữ tường cạnh thang hiện trạng.
- **03 · Theo mặt bằng mới**: dựng từ sơ đồ người dùng gửi, với sofa chữ L phía trước, khách–ăn–bếp liên thông, tủ bếp chữ L áp tường trái và vách cạnh thang; giữ cầu thang sắt hiện có theo video, WC và khu giặt ở cuối nhà. Theo yêu cầu mới nhất, gác rút ngắn 1/3 chiều sâu từ mép phía phòng khách, giữ mép sau, thang và tường cạnh thang. Mặc định gác sâu khoảng 3,71 m thay vì 5,56 m, giường 1,3 × 2 m xoay ngang nhà, phía phòng khách và bàn ăn thông thoáng phía trên. Bàn ăn hai chỗ và góc làm việc hai màn hình dành cho một người. Mở trực tiếp tại http://localhost:5173/?design=proposed. Sơ đồ gốc được giữ trong thẻ **Mặt bằng mới** của hộp tư liệu để đối chiếu.
- Cửa vào được người dùng xác nhận ở **mặt trước, lệch phải**. Bản 02 bố trí sofa bên trái, TV treo phía phải lùi khỏi cửa, giữ khoảng đón và đường đi về khu sau. Bề rộng cửa 0,9 m và khoảng đón 1 m trong mô hình là **ước lượng thiết kế**, chưa có số đo cửa hoặc hướng mở cánh thực tế.
- Nút chọn phương án nằm đầu thanh bên. Kích thước, vật liệu và ánh sáng được nhớ riêng cho từng bản. Lần mở đầu tiên mặc định là bản 03 ở góc phối cảnh; các đường dẫn riêng vẫn mở đúng phương án đã chọn. Bản 02 và 03 dành cho một người ở; bản 01 vẫn có tùy chọn thử hai chỗ làm việc.
- Bản theo ảnh đã được sao lưu đầy đủ tại `saved-designs/01-theo-anh-2026-09-30/`, kèm ảnh xem trước và danh sách kiểm tra tệp `snapshot.json`. Tệp `saved-designs/01-theo-anh-2026-09-30.zip` có thể tải từ nút **Tải bản đã lưu** trên web. Chỉnh sửa trong trình xem không ghi đè bản sao này.
- Cả ba mẫu hiện dùng cùng hình học thang và gác rút ngắn: chiều sâu mặc định 3,71 m, diện tích dùng được khoảng 12,56 m² sau khi trừ lỗ thang. Các con số là diện tích mô hình ước lượng, chưa phải diện tích nghiệm thu.
- Ngân sách chưa chốt. Mô hình cho phép so sánh bố trí và vật liệu; kích thước chi tiết cần đo lại trước khi triển khai.
- Bản 03 dùng kích thước tổng thể đã biết; sơ đồ không có kích thước phòng, nên ranh giới từng khu và thiết bị còn ước lượng. Cả ba mẫu giữ cầu thang hiện có từ video. Mô hình tái sử dụng vị trí, hướng và kích thước thang ước lượng của bản hiện trạng; gác và đồ đạc điều chỉnh theo thang này. Video cho thấy rõ vế dưới thang sắt hẹp, bậc hở và tay vịn phải và tường kín sát bên trái khi đi lên; tường được giữ trong cả góc phối cảnh mở tường, mặt bằng hiển thị chân tường. Đoạn nối trên bị khuất, chưa xác nhận có bẻ góc hay không. Không coi số bậc hoặc kích thước mô hình là số đo thực tế. Bộ điều chỉnh cả ba mẫu nhận chiều dài từ 9,5–12 m để giữ đủ chỗ cho gác và nội thất.

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

## Deploy web tĩnh từ Git

Kết nối kho Git với dịch vụ hosting và chọn nhánh `main`:

| Thiết lập | Giá trị |
| --- | --- |
| Thư mục gốc | Gốc repository |
| Node.js | 22.12 trở lên |
| Lệnh cài đặt | `npm install` |
| Lệnh build | `npm run build` |
| Thư mục xuất bản | `dist` |
| Biến môi trường | Không cần |

Thư mục `dist/` chứa toàn bộ web tĩnh, gồm ảnh, video, phông chữ và bản thiết kế tải về. Hosting có thể tự build khi nhận commit mới từ Git; không cần máy chủ Node.js sau khi build. `dist/` không được commit vì được tạo lại từ mã nguồn.

Các đường dẫn tài nguyên dùng địa chỉ tương đối, hỗ trợ cả tên miền riêng và thư mục con như `/ThietKe/`.

### GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` tự cài thư viện, chạy kiểm tra, build và xuất bản `dist/` mỗi khi push lên `main`. Không cần đưa `dist/` vào Git.

1. Trong repository, mở **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions**.
2. Mở **Actions → Deploy GitHub Pages → Run workflow** để xuất bản lần đầu. Các lần push sau tự triển khai.
3. Khi workflow hoàn tất, mở https://chihirotran.github.io/ThietKe/.

Không chọn **Deploy from a branch → main / root**, vì đó là mã nguồn Vite chưa build. Mỗi lượt triển khai tạo một artifact `github-pages` chứa bản web tĩnh đã build. Workflow dùng quyền có sẵn của repository, không cần thêm token hoặc secret.

## Số đo và hiện trạng dùng cho bản 01

- Người dùng cung cấp: sàn đến gác **2,5 m**; gác đến mái **2,3 m**.
- Người dùng xác nhận diện tích **tầng trệt 43 m²**, chiều dài **11 m**, chưa tính gác. Chiều ngang suy ra khoảng **3,91 m** theo giả định mặt bằng hình chữ nhật; cần số đo ngang để xác nhận chính xác.
- Đối chiếu video từ **0:10 đến hết**: từ phòng chính qua cửa vào một **khoảng giặt/rửa và lối đi**, rồi qua cửa thứ hai để vào bếp phía trước. Máy giặt nằm ngoài phòng bếp, cạnh khu thang.
- Cầu thang ở **bên trái** lối đi. Video cho thấy thang có vẻ đi ngang về phía trái; hướng này được dùng để dựng sơ bộ, chiều dài và chiếu tới chưa có số đo. Sàn gác có lỗ mở cho thang và khoảng đặt chân ở đầu thang.
- Phòng tắm/WC là phòng riêng **bên trái bếp**. Người dùng xác nhận **cửa WC mở ra khoảng máy giặt/cầu thang**. Vách giữa bếp và WC kín, mỗi phòng có cửa riêng từ khoảng giặt/rửa.
- Gác chạy ngang bề rộng nhà, vươn về phòng chính để che hệ tủ và một phần bàn làm việc. Theo yêu cầu mới nhất, dùng chung gác đã rút ngắn 1/3 với hai mẫu còn lại; chiều sâu mặc định khoảng **3,71 m**.
- Thiết kế mặc định cho **một người** theo ảnh mẫu: một chỗ ngồi với hai màn hình bên trái, hệ tủ gỗ dưới gác, lối đi bên phải, giường nằm ngang trên gác, chăn xanh nhạt, lan can trắng và tủ cao sát phải. Có thể thử phương án hai chỗ làm việc trên cùng mặt bằng.
- Vị trí tương đối theo video và mô tả người dùng. Kích thước từng phòng, vị trí chính xác của cửa, độ dốc thang và chiếu tới vẫn là bố trí sơ bộ để hình dung. Video không cho thấy rõ nội thất WC; thiết bị và nội thất mới là đề xuất thiết kế, chưa phải hồ sơ thi công.
- Hộp kích thước cho phép chỉnh tỷ lệ trong phạm vi phù hợp với bố trí này (ngang 3,2–5,5 m; sâu 9,5–12 m). Dữ liệu được lưu trong trình duyệt. Nhà ngoài phạm vi này cần bố trí lại đồ đạc.

## Cách sử dụng

- **Từ cửa:** góc nhìn mặc định đối chiếu với ảnh mẫu, hiện tường và gác; kéo để xoay, chọn lại nút để trở về góc ban đầu.
- **Phối cảnh:** kéo để xoay, cuộn để phóng to, chuột phải hoặc hai ngón để dịch chuyển.
- **Mặt bằng:** tự ẩn tường và sàn gác, hiển thị tầng trệt từ trên xuống.
- **Bên trong:** giữ **W/A/S/D** để tiến, sang trái, lùi, sang phải theo hướng đang nhìn; kéo để nhìn quanh. Trên điện thoại, bảng **Di chuyển** tự hiện với bốn nút giữ để đi. Nhả phím/nút để dừng. Có thể đi liên tục từ tầng trệt lên cầu thang và vào gác, rồi đi xuống theo đường cũ. Ở đầu thang, sang trái để bước vào gác; độ cao tầm nhìn thay đổi theo thang. Chọn **Cầu thang** khi đang ở Bên trong để bắt đầu ngay trước chân thang. Giới hạn tường, đồ đạc và mép sàn giúp tránh đi xuyên mô hình.
- Chọn khu sinh hoạt, gác ngủ, cầu thang, khoảng giặt/lối đi, phòng bếp hoặc phòng tắm/WC để đến góc nhìn tương ứng.
- Chuyển giữa **Một người · theo ảnh** và **Hai chỗ làm việc** để so sánh phương án. Lựa chọn được lưu trong trình duyệt.
- Bật/tắt gác, tường cắt, chú thích và ánh sáng ấm; đổi gỗ sáng/gỗ tối.
- Khu giặt bố trí máy giặt cửa trên, máy sấy cửa ngang và máy lọc nước cạnh nhau; không đặt thiết bị hoặc mặt bàn lên trên nắp máy giặt. Mẫu 01 và 02 có chậu rửa bếp và vòi nước riêng.
- **Lưu ảnh:** tải ảnh PNG của góc nhìn hiện tại, có chú thích kích thước.
- **Ảnh mẫu & hiện trạng:** xem riêng ảnh mẫu thiết kế, hai ảnh gốc và video. Thẻ **Khu sau · 0:10** chuyển đến đoạn cầu thang, máy giặt và bếp để đối chiếu. Video được chuyển mã H.264 để tương thích trình duyệt; nội dung không thay đổi.
- Khi canvas được chọn, phím mũi tên điều khiển góc nhìn; `+` / `-` phóng to và thu nhỏ.

Ảnh, video và phông chữ được phục vụ cùng web tĩnh. Không cần tài khoản hoặc khóa API để chạy ứng dụng.

## Cấu trúc

- `src/house.js`, `src/layout.js`: hình học và bố trí của bản theo ảnh.
- `src/modern-house.js`, `src/modern-layout.js`: hình học và bố trí mới của bản hiện đại.
- `src/proposed-house.js`, `src/proposed-layout.js`: hình học và bố trí của bản theo mặt bằng mới.
- `src/shared-structure.js`, `src/shared-stair.js`: hình học gác, thang và tường cạnh thang dùng chung cả ba mẫu.
- `src/navigation.js`, `src/walking-world.js`: di chuyển theo hướng nhìn, lên/xuống thang, kiểm tra vật cản theo độ cao và giới hạn mép sàn.
- `src/designs.js`: lựa chọn phương án và dữ liệu lưu riêng.
- `src/main.js`: trình xem, góc nhìn và tương tác.
- `src/dimensions.js`: số đo mặc định và kiểm tra dữ liệu.
- `src/style.css`: giao diện và bố cục cho điện thoại.
- `public/references/`: tư liệu người dùng để đối chiếu.

Sử dụng [Three.js](https://threejs.org/) và [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html). Phông chữ Be Vietnam Pro được cung cấp theo giấy phép SIL Open Font License.
