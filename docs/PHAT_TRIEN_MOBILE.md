# Phát triển Ứng dụng Mobile

## Phần LaTeX cho báo cáo

```latex
\subsection{Phát triển Ứng dụng Mobile}
Phần này tóm tắt quá trình phát triển phần ứng dụng di động cho hệ thống Smart Home, bao gồm kiến trúc, công nghệ, các challenges gặp phải, và các giải pháp đã áp dụng.

\subsubsection{Lựa chọn Công nghệ và Stack}
Ứng dụng mobile được xây dựng bằng React Native với framework Expo để tối ưu hóa time-to-market và cross-platform compatibility.
\begin{itemize}[noitemsep]
  \item \textbf{React Native + Expo}: Cho phép phát triển single codebase chạy trên iOS và Android mà không cần viết native code riêng.
  \item \textbf{JavaScript/ES6+}: Ngôn ngữ chính cho logic component; TypeScript support (tsconfig.json) sẵn sàng.
  \item \textbf{Expo Managed Workflow}: Simplifies build process; no need to manage Android Studio / Xcode configurations.
  \item \textbf{Axios}: HTTP client để gọi REST API từ backend Flask.
  \item \textbf{Socket.IO Client}: Real-time communication để nhận notifications và updates tức thì.
  \item \textbf{Context API}: State management cho authentication và app-wide data (thay vì Redux để giữ lightweight).
\end{itemize}

\subsubsection{Kiến trúc Thư mục và Cấu trúc Dự án}
Codebase được tổ chức theo model Component-based Architecture với clear separation of concerns:

\begin{verbatim}
mobile/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js         # Trang chủ
│   │   ├── LoginScreen.js        # Đăng nhập
│   │   ├── SignupScreen.js       # Đăng ký
│   │   ├── HousesScreen.js       # Danh sách nhà
│   │   ├── FloorsScreen.js       # Danh sách tầng
│   │   ├── RoomsScreen.js        # Danh sách phòng
│   │   ├── DevicesScreen.js      # Danh sách thiết bị
│   │   ├── DashboardScreen.js    # Dashboard chính
│   │   ├── AutomationRulesScreen.js # Quản lý automation
│   │   ├── DeviceActivityLogsScreen.js # Lịch sử hoạt động
│   │   ├── DeviceSchedulingScreen.js # Lên lịch thiết bị
│   │   ├── SensorsScreen.js      # Danh sách cảm biến
│   │   ├── NotificationCenter.js # Trung tâm thông báo
│   │   ├── DemoTestScreen.js     # Testing screen
│   │   └── admin/                # Admin screens
│   │       ├── UserManagement.js
│   │       ├── SystemStats.js
│   │       ├── ActivityLogs.js
│   │       └── HouseSharing.js
│   ├── services/
│   │   ├── api.js                # Axios instance (base URL, headers)
│   │   ├── auth.js               # Authentication logic
│   │   ├── realtime.js           # Socket.IO setup
│   │   ├── notification_socket.js # Notification handler
│   │   └── adafruit.js           # Adafruit integration
│   ├── context/
│   │   └── AuthContext.js        # Auth state (login, token, user)
│   ├── components/
│   │   └── CustomSlider.js       # Reusable slider for device level
│   ├── styles/
│   │   └── theme.js              # Color, spacing, typography
│   └── App.js                    # Root component
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
\end{verbatim}

\subsubsection{Luồng Dữ liệu (Data Flow) và Tương tác Backend}
Ứng dụng sử dụng mô hình Request-Response + Event-driven (via Socket.IO):
\begin{itemize}[noitemsep]
  \item \textbf{Authentication}: Người dùng login → backend trả JWT token → app lưu token vào state (AuthContext) → mọi request sau đó gồm header `Authorization: Bearer <token>`.
  \item \textbf{Data Fetching}: khi vào screen (ví dụ DevicesScreen), component gọi `GET /api/rooms/<id>/devices` via \texttt{api.js} → backend trả danh sách → app render list.
  \item \textbf{Mutations}: Khi user toggle device, gọi `POST /api/device-status` → server xử lý → server phản hồi thành công → client reload data.
  \item \textbf{Real-time Updates}: Server emit Socket.IO events (ví dụ `device_status_changed`) → client listen và update UI ngay lập tức (không cần polling).
  \item \textbf{Error Handling}: Tất cả requests catch lỗi, display toast/alert cho user, retry nếu cần.
\end{itemize}

\subsubsection{Các Screens Chính và Tính năng}
\paragraph{Authentication Screens}
`LoginScreen.js` và `SignupScreen.js` cung cấp giao diện đơn giản để người dùng đăng nhập/đăng ký với email và mật khẩu. Tokens được lưu trong `AuthContext` và tự động thêm vào mọi request sau đó.

\paragraph{Navigation Hierarchy}
\begin{itemize}[noitemsep]
  \item \textbf{HomeScreen}: Landing page — hiển thị welcome message, quick links tới Houses/Dashboard.
  \item \textbf{HousesScreen}: Danh sách nhà của user — tap để xem floors, long-press để manage.
  \item \textbf{FloorsScreen}: Tầng trong 1 nhà — hiển thị rooms.
  \item \textbf{RoomsScreen}: Phòng trong 1 tầng — hiển thị devices + sensors.
  \item \textbf{DevicesScreen}: Danh sách thiết bị trong room — toggle on/off, adjust level, view history.
  \item \textbf{SensorsScreen}: Danh sách cảm biến — view current readings, historical data (chart).
\end{itemize}

\paragraph{Automation \& Scheduling}
`AutomationRulesScreen.js` cho phép CRUD automation rules:
\begin{itemize}[noitemsep]
  \item \textbf{List View}: Hiển thị tất cả rules cho room — status (enabled/disabled), conditions, action.
  \item \textbf{Create Mode}: Form rỗng để nhập rule name, conditions (cảm biến + threshold), action device + action status.
  \item \textbf{Edit Mode}: Khi chọn rule, form pre-fill existing values — user có thể sửa và submit.
  \item \textbf{Delete}: Swipe-to-delete hoặc delete button — confirm trước xóa.
\end{itemize}

`DeviceSchedulingScreen.js` cho phép tạo schedules:
\begin{itemize}[noitemsep]
  \item \textbf{Time Picker}: Giao diện chọn thời gian (hour, minute).
  \item \textbf{Recurring}: Checkbox cho các ngày trong tuần để lặp lại hàng tuần.
  \item \textbf{Display}: Hiển thị dạng text rõ ràng: "Bật Đèn phòng khách vào 19:00 Thứ 2-5".
\end{itemize}

\paragraph{Dashboard \& Analytics}
`DashboardScreen.js` là màn hình chính:
\begin{itemize}[noitemsep]
  \item \textbf{KPI Cards}: Hiển thị metrics như "On/Off count", "Automation runs today", "Top device".
  \item \textbf{Activity Timeline}: Danh sách events gần đây (last 24 hours) — khi nào, cái gì, bởi ai (user/automation).
  \item \textbf{Real-time}: Khi có event mới, timeline tự động update + notification xuất hiện.
  \item \textbf{Timestamp}: Sử dụng helper \texttt{parseISOToDate()} để hiển thị relative time ("5 phút trước") đúng.
\end{itemize}

\paragraph{Notifications}
`NotificationCenter.js`:
\begin{itemize}[noitemsep]
  \item \textbf{List}: Danh sách tất cả notifications — mark as read, delete.
  \item \textbf{Real-time Badge}: App icon + screen header badge hiển thị số unread notifications.
  \item \textbf{Clear All}: Nút để clear tất cả notifications một lần.
\end{itemize}

\subsubsection{Xử lý State \& Side Effects}
\paragraph{AuthContext}
Lưu trữ authentication state (user, token, isLoggedIn) và cung cấp methods: `login()`, `signup()`, `logout()`. Các screen khác access via `useContext(AuthContext)`.

\paragraph{useFocusEffect}
Khi screen được focus (hiển thị), trigger reload dữ liệu — đảm bảo data luôn fresh (ví dụ DevicesScreen reload devices khi quay lại từ detail screen).

\paragraph{useEffect}
Setup Socket.IO listeners khi app mount, cleanup khi unmount. Subscribe vào events như `device_status_changed` để cập nhật UI tức thì.

\subsubsection{Styling \& Theme System}
`mobile/src/styles/theme.js` định nghĩa:
\begin{itemize}[noitemsep]
  \item \textbf{Colors}: primary (xanh lục), secondary (cam), background (trắng), text (đen/gray).
  \item \textbf{Spacing}: base unit (8px) — padding/margin là multiples (8, 16, 24, 32).
  \item \textbf{Typography}: font family (System), sizes (12, 14, 16, 18, 20), weights (normal, bold).
  \item \textbf{Components}: button, card, input styles sử dụng theme variables.
\end{itemize}

Mọi screens import và dùng \texttt{theme} từ context/props để giữ UI consistent.

\subsubsection{Common Challenges \& Solutions}
\paragraph{Render-loop Bug (AutomationRulesScreen)}
\textbf{Problem}: setState được call mỗi render → infinite loop → "Too many re-renders" error.

\textbf{Solution}: 
\begin{itemize}[noitemsep]
  \item Move setState calls vào event handlers (onClick, onChange) thay vì top-level component body.
  \item Use \texttt{useCallback} để memoize handlers, tránh re-create.
  \item Ensure dependency arrays trong \texttt{useEffect} chính xác.
\end{itemize}

\paragraph{Device Toggle Revert}
\textbf{Problem}: User toggle device → UI updates → lạ automation overwrites → state revert.

\textbf{Solution}:
\begin{itemize}[noitemsep]
  \item Backend: automation engine ghi \texttt{DeviceActivityLog} khi execute → easy to distinguish user vs automation.
  \item Client: reload devices list sau toggle thành công → UI sync với server state.
  \item Real-time: Socket.IO emit \texttt{device_status_changed} event → clients update ngay.
\end{itemize}

\paragraph{Timestamp Timezone Issues}
\textbf{Problem}: Server ở UTC+0, client ở UTC+7 → timestamp display sai (hiển thị "7h ago" cho event vừa xảy ra).

\textbf{Solution}:
\begin{itemize}[noitemsep]
  \item Client helper: \texttt{parseISOToDate(isoString)} — if timestamp has no 'Z', assume UTC; convert to local.
  \item Consistent format: Backend return ISO 8601 format (e.g., "2026-05-14T10:30:00Z").
  \item Display relative time: Use library (ví dụ \texttt{date-fns} hoặc custom formatter) để hiển thị "5m ago" thay vì timestamp tuyệt đối.
\end{itemize}

\paragraph{Missing action\_device\_id on PUT}
\textbf{Problem}: Khi edit automation rule, `action_device_id` không được gửi lên server.

\textbf{Solution}: Ensure form state captures `action_device_id` khi user chọn device từ dropdown; include trong payload khi call `PUT /api/automation-rules/<id>`.

\subsubsection{Testing \& Demo}
`DemoTestScreen.js` cung cấp UI để:
\begin{itemize}[noitemsep]
  \item Trigger mock API calls (simulate device toggle, automation trigger).
  \item View logs/debug info.
  \item Test edge cases (network error, timeout, invalid data).
\end{itemize}

Backend scripts (`setup_database.py`, `check_data.py`, `seed_database.py`) hỗ trợ local testing với dữ liệu mẫu.

\subsubsection{Best Practices \& Lessons Learned}
\begin{enumerate}[noitemsep]
  \item \textbf{Optimistic Updates}: Update UI immediately khi user tương tác (toggle device), sau đó verify với server; improve perceived performance.
  \item \textbf{Real-time Over Polling}: Use Socket.IO thay vì setInterval polling — giảm network traffic, data luôn fresh.
  \item \textbf{Error Boundaries}: Wrap components với error boundary để gracefully handle render errors, không crash toàn app.
  \item \textbf{Consistent Headers}: Standardize appearance (header, spacing, colors) trên tất cả screens — improve UX, reduce cognitive load.
  \item \textbf{Async/Await}: Prefer async/await over .then() cho cleaner error handling.
  \item \textbf{Minimal State}: Lưu minimal data trong state; derive computed values trong component (avoid stale state).
\end{enumerate}

\subsubsection{Tương lai \& Đề xuất Cải tiến}
\begin{itemize}[noitemsep]
  \item Thêm TypeScript strictly (convert JS → TS) để type safety.
  \item Unit tests cho components + services (React Testing Library, Jest).
  \item E2E tests (Detox hoặc Appium) để test entire user workflows.
  \item Offline-first: Cache dữ liệu locally, sync khi online (AsyncStorage + WatermelonDB).
  \item Push Notifications: FCM (Firebase Cloud Messaging) thay vì in-app notifications.
  \item Performance: Profile và optimize rendering (React Profiler), images (lazy load), bundle size.
  \item Dark Mode: Extend theme system để support light/dark modes.
\end{itemize}

\subsection{Cài đặt các tính năng đặc trưng}
Phần này mô tả các tính năng đặc trưng đã được cài đặt trong dự án Smart Home, tập trung vào các chức năng người dùng có thể sử dụng trực tiếp trên ứng dụng.

\subsubsection{Quản lý người dùng và phân quyền}
\begin{itemize}[noitemsep]
  \item Đăng ký/đăng nhập bằng tài khoản cá nhân với JWT authentication.
  \item Phân quyền theo vai trò USER/ADMIN.
  \item Hỗ trợ chia sẻ nhà cho người dùng khác theo mức quyền owner/manager/viewer.
\end{itemize}

\subsubsection{Quản lý cấu trúc nhà thông minh}
\begin{itemize}[noitemsep]
  \item Tổ chức dữ liệu theo cây: House \textrightarrow{} Floor \textrightarrow{} Room.
  \item Quản lý nhiều nhà trên cùng một tài khoản.
  \item Điều hướng trực quan qua các màn hình `HousesScreen`, `FloorsScreen`, `RoomsScreen`.
\end{itemize}

\subsubsection{Điều khiển thiết bị theo thời gian thực}
\begin{itemize}[noitemsep]
  \item Bật/tắt thiết bị trực tiếp từ `DevicesScreen` và `DashboardScreen`.
  \item Điều chỉnh mức hoạt động (level 0-100) với thiết bị hỗ trợ dimming.
  \item Trạng thái thiết bị được đồng bộ lại từ server sau mỗi thao tác để đảm bảo chính xác.
\end{itemize}

\subsubsection{Quản lý cảm biến và theo dõi dữ liệu}
\begin{itemize}[noitemsep]
  \item Hỗ trợ nhiều loại cảm biến: nhiệt độ, độ ẩm, ánh sáng, chuyển động, CO2, áp suất.
  \item Hiển thị dữ liệu hiện tại và lịch sử trên `SensorsScreen`.
  \item Tích hợp ánh xạ feed Adafruit IO để thu thập dữ liệu theo thiết bị/sensor.
\end{itemize}

\subsubsection{Automation Rules (tự động hóa theo điều kiện)}
\begin{itemize}[noitemsep]
  \item Tạo/sửa/xóa rule tự động theo điều kiện cảm biến.
  \item Chọn thiết bị đích (`action\_device\_id`), trạng thái hành động và mức độ hành động.
  \item Hỗ trợ bật/tắt rule và chỉnh sửa rule với form pre-fill.
\end{itemize}

\subsubsection{Lập lịch hoạt động thiết bị}
\begin{itemize}[noitemsep]
  \item Cài đặt lịch bật/tắt thiết bị theo giờ cố định.
  \item Hỗ trợ lịch lặp theo ngày trong tuần.
  \item Quản lý danh sách lịch trên `DeviceSchedulingScreen` và `DeviceSchedulesScreen`.
\end{itemize}

\subsubsection{Nhật ký hoạt động và truy vết sự kiện}
\begin{itemize}[noitemsep]
  \item Ghi nhận đầy đủ hành động từ người dùng và automation vào `DeviceActivityLog`.
  \item Hiển thị timeline hoạt động trên Dashboard và `DeviceActivityLogsScreen`.
  \item Phân biệt nguồn kích hoạt: thao tác thủ công, automation rule hoặc lịch biểu.
\end{itemize}

\subsubsection{Dashboard phân tích và KPI}
\begin{itemize}[noitemsep]
  \item Tổng hợp chỉ số sử dụng thiết bị theo khoảng thời gian.
  \item Tách riêng thống kê hành động thủ công và hành động tự động.
  \item Hiển thị mốc thời gian dạng relative-time với xử lý timezone nhất quán.
\end{itemize}

\subsubsection{Thông báo và cảnh báo thông minh}
\begin{itemize}[noitemsep]
  \item Nhận thông báo khi có sự kiện quan trọng: automation chạy, vượt ngưỡng sensor, thay đổi trạng thái thiết bị.
  \item Quản lý thông báo trên `NotificationCenter` (đánh dấu đã đọc/xóa).
  \item Cập nhật thông báo realtime qua Socket.IO.
\end{itemize}

\subsubsection{Quản trị hệ thống (Admin Panel)}
\begin{itemize}[noitemsep]
  \item Quản lý người dùng và trạng thái tài khoản trong `admin/UserManagement.js`.
  \item Theo dõi thống kê hệ thống qua `admin/SystemStats.js`.
  \item Theo dõi lịch sử hoạt động và cấu hình chia sẻ nhà trong các màn `admin/ActivityLogs.js`, `admin/HouseSharing.js`.
\end{itemize}

\subsubsection{Đồng bộ giao diện và trải nghiệm sử dụng}
\begin{itemize}[noitemsep]
  \item Chuẩn hóa giao diện bằng `theme.js` (màu sắc, spacing, typography).
  \item Tối ưu cập nhật dữ liệu bằng `useFocusEffect` và realtime events thay cho polling liên tục.
  \item Cải thiện UX với phản hồi nhanh, thông báo lỗi rõ ràng và luồng thao tác nhất quán trên toàn ứng dụng.
\end{itemize}

\vspace{4pt}
Tổng thể, các tính năng đặc trưng đã được cài đặt theo hướng vừa đầy đủ nghiệp vụ Smart Home, vừa đảm bảo khả năng vận hành thực tế và trải nghiệm người dùng trên thiết bị di động.
```

Phần LaTeX trên đã được tạo sẵn tại: [docs/PHAT_TRIEN_MOBILE.md](docs/PHAT_TRIEN_MOBILE.md)

Bạn có thể copy-paste phần LaTeX này vào `docs/main.tex` trước phần "Cài đặt các tính năng đặc trưng" hoặc sau phần "5.3 Các bước tiếp theo và đề xuất", tùy theo vị trí mong muốn trong báo cáo.