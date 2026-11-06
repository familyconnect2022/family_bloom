# Phase 1 — Services Refactor Changelog

## So với ZIP Phase 1 trước

### 1. Service layer
- Thêm `src/services/auth/authService.ts`
- Thêm `src/services/profile/profileService.ts`
- Thêm `src/services/family/familyService.ts`
- Thêm `src/services/media/cloudinaryService.ts`
- Thêm `src/services/firebase/firestorePaths.ts`
- Thêm barrel exports `src/services/index.ts`

### 2. AuthContext
Trước:
- Context trực tiếp gọi Firebase Auth và Google Sign-In.

Sau:
- Context chỉ quản lý auth/profile state.
- SDK calls chuyển sang `authService`.
- Phone normalization nằm trong service.

### 3. Profile
Trước:
- `useUserProfile` gọi repository functions.

Sau:
- `useUserProfile` là adapter mỏng cho `profileService`.
- Business/data access logic nằm trong service.

### 4. Family creation
- `familyService.createFamilyWithOwner()` tạo family + user profile + owner membership bằng Firestore batch.
- Không còn `DEFAULT_FAMILY_ID`.

### 5. Media
Trước:
- Hook chứa toàn bộ Cloudinary HTTP/retry logic.

Sau:
- `cloudinaryService` chứa upload/retry.
- Hook chỉ quản lý React queue/progress state.

### 6. Types
- Thêm `media.ts` và `profile.ts`.
- `types/index.ts` là barrel.
- Giữ `UserProfile`, `Family`, `FamilyMember` trong `user.ts`.

### 7. Security Rules
- Source-of-truth: `/firestore.rules`.
- `firebase.json` trỏ tới file này.
- Không có family ID hard-code.
- User update không được đổi `uid`, `familyId`, `createdAt`.
- Family owner không thể bị thay đổi qua update.
- Member create yêu cầu authenticated user chính là uid và family owner khớp trong cùng atomic batch.

## Không làm trong Phase 1

- Chat
- Moments
- Planner
- Family tree UI
- Push notification
- Firebase Storage
- Backend/serverless API
- Full E2E suite

Đây là chủ ý: Phase 1 xây foundation, không mở rộng domain trước khi Auth/Profile/Family core ổn định.
