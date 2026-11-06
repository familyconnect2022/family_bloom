# Family Bloom — Phase 1 Services Architecture

## Mục tiêu

Phase 1 được tổ chức theo **service layer** để UI/hooks không phụ thuộc trực tiếp vào SDK của Firebase hoặc Cloudinary.

```text
Screen
  ↓
Hook / Context
  ↓
Service
  ↓
SDK / Provider

AuthContext → authService → Firebase Auth / Google Sign-In
Profile     → profileService → Firestore
Family      → familyService → Firestore batch
Media       → cloudinaryService → Cloudinary HTTP API
```

## Cấu trúc

```text
src/services/
├── auth/
│   └── authService.ts
├── family/
│   └── familyService.ts
├── media/
│   └── cloudinaryService.ts
├── profile/
│   └── profileService.ts
├── firebase/
│   └── firestorePaths.ts
└── index.ts
```

## Vì sao chọn service layer?

- Có thể thay Firebase Auth bằng provider khác mà không sửa UI.
- Có thể thay Cloudinary bằng Firebase Storage/S3 sau này.
- Có thể mock service khi test.
- Context chỉ quản lý state, không quản lý chi tiết SDK.
- Hooks chỉ là adapter cho React component.

## Quy tắc dependency

```text
components → hooks/context → services → SDK
```

Không tạo dependency ngược:

```text
services ✗→ components
services ✗→ React hooks
services ✗→ navigation
```

## Firebase Rules

Rules nằm tại:

```text
/firestore.rules
```

Được khai báo trong:

```text
/firebase.json
```

Deploy:

```bash
firebase deploy --only firestore:rules
```

> Rules không được bundle vào app. Firebase lưu rules sau khi deploy lên Firestore. File `firestore.rules` trong repository là source-of-truth để version control.

## Cách nâng cấp provider sau này

Ví dụ thay Cloudinary:

```text
cloudinaryService.ts
        ↓
mediaService.ts (contract)
        ↓
cloudinaryProvider.ts
firebaseStorageProvider.ts
s3Provider.ts
```

Tương tự cho Firebase:

```text
profileService
      ↓
ProfileRepository contract
      ↓
Firestore adapter
REST adapter
Mock adapter
```

Phase 1 chưa cần over-engineer bằng dependency injection container; service module + interface là đủ.
