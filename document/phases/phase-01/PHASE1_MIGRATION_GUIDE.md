# Tự nâng cấp từ ZIP cũ → Phase 1 Services

## 1. Copy cấu trúc services

```text
src/services/
├── auth/authService.ts
├── family/familyService.ts
├── media/cloudinaryService.ts
├── profile/profileService.ts
└── firebase/firestorePaths.ts
```

## 2. AuthContext

Thay mọi lệnh Firebase Auth/Google Sign-In trực tiếp bằng `authService`.

Context chỉ giữ:
- user
- authStatus
- profileStatus
- confirmation
- loading

## 3. Profile

Không gọi Firestore từ screen.

```ts
await profileService.create(uid, input)
await profileService.update(uid, data)
const profile = await profileService.get(uid)
```

## 4. Family

Tạo profile mới luôn tạo family + owner membership bằng một batch.

Không được tạo family bằng ID hard-code.

## 5. Media

Screen/hook chỉ gọi:

```ts
cloudinaryService.upload(...)
```

Không để URL/API/retry logic của Cloudinary nằm trong component.

## 6. Rules

Đặt:

```text
firestore.rules
```

ngay tại root repository và giữ trong Git.

Deploy:

```bash
firebase deploy --only firestore:rules
```

## 7. Kiểm tra

```bash
npm install
npm run typecheck
npm run lint
```

Sau đó chạy development build vì project dùng React Native Firebase:

```bash
npx expo run:android
# hoặc
npx expo run:ios
```

## 8. Nguyên tắc cho Phase 2+

Không import Firebase/Cloudinary SDK trực tiếp vào `app/` hoặc `components/`.

Ưu tiên:

```text
Screen → Hook/Context → Service → Provider SDK
```
