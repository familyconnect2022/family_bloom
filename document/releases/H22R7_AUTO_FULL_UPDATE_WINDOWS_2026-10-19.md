# Family Bloom H22R7 - Cap nhat FULL tu dong tren Windows

## Dieu gi thay doi

Ban FULL H22R7 nay bo sung file goc `Family_Bloom_AUTO_UPDATE_FULL.bat` va bo xu ly trong `scripts/android/maintenance/`. Khong thay doi logic game, khong tang native versionCode chi vi cong cu update.

## Lan dau (sau nay khong phai lam 3 buoc thu cong)

1. DONG Metro, Node server local, VS Code dang ghi source; sao luu du an mot lan neu co dieu chinh quan trong.
2. Giai nen TOAN BO ZIP moi vao mot thu muc rieng, VD `D:\Downloads\FamilyBloom_H22R7_AUTO_FULL`. KHONG giai nen vao thu muc du an cu.
3. Bam doi `Family_Bloom_AUTO_UPDATE_FULL.bat` trong thu muc FULL moi vua giai nen.
4. Neu hoi, dien dung duong dan thu muc Family Bloom cu (VD `D:\FamilyBloom`). He thong se nho duong dan nay sau khi update thanh cong.
5. Kiem tra duong dan OLD/NEW hien tren man hinh, bam **Y** de tiep tuc.
6. Doi thong bao `PASS: Family Bloom FULL source is updated and CLEAN APPLY passed.`
7. Chi sau khi PASS, chay `Family_Bloom_BUILD_APK_TO_SHARE.bat` tai thu muc DU AN cu (nay da cap nhat) neu can build APK.

## Lan cap nhat tiep theo

- Giai nen ZIP FULL moi ra thu muc RIENG moi.
- Chay `Family_Bloom_AUTO_UPDATE_FULL.bat`, kiem tra thu muc muc tieu, bam Y.
- Khong con phai goi lan luot PRE_COPY, copy de, CLEAN_APPLY nua.

## Cac buoc tu dong

1. Kiem tra source + target la **hai thu muc doc lap**, dung project `family-bloom`, source khong phai ban cu hon target, co du cac script bat buoc. Tu choi neu goi tinh lai tren cung thu muc hoac long vao nhau.
2. Sao luu *ma nguon* du an hien tai vao `%LOCALAPPDATA%\FamilyBloom\updater\backups\<timestamp>\project-source`. Loai tru `node_modules`, `.git`, Expo caches, thu muc `android/` va `ios/` phat sinh; **khong phai backup full disk hay native output**. Thong tin duong dan backup ghi vao `last-backup.txt`.
3. Chay `PRE_COPY_CLEAN_OLD_PROJECT` voi tuy chon `--no-pause`. Neu loi, dung ngay.
4. Copy FULL source moi vao du an da co, khong mirror/xoa tat ca file ngoai danh sach cleanup; giu nguyen `.env`, file ky/keystore, `google-services.json` dang ton tai va cache/thu muc native sinh tu prebuild. Doi chieu SHA-256 ma nguon sau khi copy.
5. Chay `Family_Bloom_CLEAN_APPLY_FULL.bat --no-pause`; neu fail, hien thong tin backup, **khong tu dong build**.
6. Chi luu duong dan project de tai su dung sau khi CLEAN APPLY thanh cong.

## Thay doi project target

- Chay tu Command Prompt: `Family_Bloom_AUTO_UPDATE_FULL.bat "E:\FamilyBloomOther"`
- Hoac sua/xoa `%LOCALAPPDATA%\FamilyBloom\updater\last-target.txt` de nhap duong dan moi khi double-click.

## An toan / gioi han

- Tu dong hoa **khong** thay the sao luu toan bo thu muc lan dau; giu ban backup rieng neu co code, signing key hay native thu cong o `android/`.
- Backup co the chua `.env` va thong tin nhay cam; giu trong may, KHONG tai len chat/Drive cong khai.
- Khong tu dong restore neu CLEAN APPLY fail, vi restore khi source dang dang co the gay mat cac sua doi khac. Kiem tra loi va co the khoi phuc thu cong tu thu muc backup.
- Khong build Gradle, khong tao APK, khong deploy Render hay OTA. Sau khi PASS, Build & Share la thao tac rieng.
- Chua duoc chay bang Windows cmd.exe tren may nguoi dung; node-based dry-run va cac check cu phap/contract da PASS. Thu voi backup an toan truoc khi su dung tren source that.
