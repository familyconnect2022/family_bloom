export type VietnameseMusicBucket = "calm" | "happy" | "chill" | "trending" | "recent";

export type VietnameseMusicSignal = {
  kind:
    | "nct_top50_vi"
    | "nct_new_week"
    | "nct_acoustic_vi"
    | "nct_happy_vi"
    | "nct_top100_nhac_tre"
    | "nct_home_top50_vi"
    | "nct_home_trending"
    | "nct_home_single_new"
    | "zing_editorial_crosscheck";
  rank?: number;
};

export type VietnameseMusicSeed = {
  id: string;
  title: string;
  artists: string[];
  language: "vi";
  buckets: VietnameseMusicBucket[];
  signals: VietnameseMusicSignal[];
  aliases?: string[];
};

/**
 * Phase 14K source snapshot, curated 2026-09-30.
 *
 * This is a discovery/catalog signal only. Family Bloom never streams audio from
 * NhacCuaTui or Zing MP3. Runtime playback still uses the configured MusicProvider.
 * Every entry below is explicitly curated as Vietnamese-language content; the app
 * must never infer language from accents, artist nationality, or title alone.
 *
 * NCT is the machine-readable primary signal for V1. Zing remains a secondary
 * editorial cross-check because its public chart pages currently require a JS app
 * shell and are not used as a runtime dependency.
 */
export const VIETNAMESE_MUSIC_CATALOG_VERSION = "vi1-2026-09-30" as const;

export const VIETNAMESE_MUSIC_SEEDS: VietnameseMusicSeed[] = [
  // Current Vietnamese chart / trending signals.
  { id: "tim-em-hngle-bao-anh", title: "Tìm Em", artists: ["Hngle", "Bảo Anh"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 2 }] },
  { id: "thien-duong-voi-nguoi-thuong", title: "Thiên Đường Với Người Thương", artists: ["Phương Mỹ Chi", "DTAP"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 4 }] },
  { id: "the-gioi-cua-anh", title: "Thế Giới Của Anh", artists: ["TINH HÀ SAY HI", "Dương Domic", "WEAN", "CONGB", "buitruonglinh"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 5 }] },
  { id: "xuong-rong-intro", title: "xương rồng", artists: ["Dangrangto", "Donal", "Smiley Panda"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 6 }], aliases: ["xương rồng (intro)"] },
  { id: "khong-buong", title: "Không Buông", artists: ["Hngle", "Ari"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 7 }] },
  { id: "ke-say-tinh-2", title: "Kẻ Say Tình 2", artists: ["Quốc Thiên"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 8 }] },
  { id: "nguoi-im-lang-gap-nguoi-hay-noi", title: "Người Im Lặng Gặp Người Hay Nói", artists: ["HIEUTHUHAI"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 9 }] },
  { id: "50-cuoc-goi-nho", title: "50 Cuộc Gọi Nhỡ", artists: ["TINH HÀ SAY HI", "CoolKid", "Quang Hùng MasterD", "Jaysonlei", "CODYNAMVO"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 11 }] },
  { id: "du-bao-thoi-tiet-hom-nay-mua", title: "dự báo thời tiết hôm nay mưa", artists: ["GREY D"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 12 }] },
  { id: "ngay-roi-chuyen-bay", title: "Ngày Rời Chuyến Bay", artists: ["Minh Huy", "Pinny"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 13 }] },
  { id: "mot-nguoi-nhu-the", title: "một người như thế", artists: ["TINH HÀ SAY HI", "WEAN", "Pháp Kiều", "CoolKid", "HURRYKNG"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 14 }] },
  { id: "em-binz-soobin", title: "Em", artists: ["Binz", "SOOBIN"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 15 }], aliases: ["Em (feat. SOOBIN)"] },
  { id: "vet-thuong-fishy", title: "vết thương", artists: ["Fishy"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 16 }] },
  { id: "gai-tay-goc-viet", title: "Gái Tây Gốc Việt", artists: ["Nicole Nguyễn", "Tommy Tèo", "BILLY100"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 17 }] },
  { id: "hon-le-cua-em", title: "Hôn Lễ Của Em", artists: ["Trọng Nhân", "Tiểu Mỹ"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 18 }] },
  { id: "mong-duyen", title: "Mộng Duyên", artists: ["TINH HÀ SAY HI", "Quang Hùng MasterD", "Song Luân", "JSOL", "Sơn.K"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 19 }] },
  { id: "im-doi-nguoi-anh-thuong", title: "Im Đợi Người Anh Thương", artists: ["TINH HÀ SAY HI", "Wren Evans", "IVAN", "CAPTAIN BOY", "Thể Thiên"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 20 }], aliases: ["IDNAT", "IDNAT (IM ĐỢI NGƯỜI ANH THƯƠNG)"] },
  { id: "moi-duyen-vang", title: "Mối Duyên Vàng", artists: ["Tuấn Cry", "Võ Thu Hà"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 21 }] },
  { id: "tet-tinh", title: "tết tình", artists: ["TINH HÀ SAY HI", "Jaysonlei", "Sơn.K", "DILLAN", "Đặng Hồng Hải"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 23 }] },
  { id: "xin-dung-roi-xa-anh", title: "Xin Đừng Rời Xa Anh", artists: ["Lê Gia Bảo", "Trịnh Thiên Ân"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 24 }] },
  { id: "noi-nay-co-anh", title: "Nơi Này Có Anh", artists: ["Sơn Tùng M-TP"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 25 }, { kind: "nct_top100_nhac_tre" }] },
  { id: "anh-da-khong-biet-cach-yeu-em", title: "Anh Đã Không Biết Cách Yêu Em", artists: ["Quang Đăng Trần"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 26 }] },
  { id: "neu-nhu-ta-chang-con", title: "Nếu Như Ta Chẳng Còn", artists: ["RPT MCK"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 29 }], aliases: ["Nếu Như Ta Chẳng Còn (feat. A$AP Ướt Mi)"] },
  { id: "binh-yen-vu-binz", title: "Bình Yên", artists: ["Vũ.", "Binz"], language: "vi", buckets: ["trending", "calm", "chill"], signals: [{ kind: "nct_top50_vi", rank: 30 }] },
  { id: "vay-cuoi", title: "Váy Cưới", artists: ["ERIK", "Kai Đinh"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 31 }] },
  { id: "gio-thi", title: "Giờ Thì", artists: ["buitruonglinh"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 32 }] },
  { id: "mat-la-ban", title: "Mất La Bàn", artists: ["TINH HÀ SAY HI", "Pháp Kiều", "Thể Thiên", "Đặng Hồng Hải", "VƯƠNG BÌNH"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 35 }] },
  { id: "mat-ket-noi", title: "Mất Kết Nối", artists: ["Dương Domic"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 36 }] },
  { id: "hoa-ra", title: "hoá ra…", artists: ["GREY D"], language: "vi", buckets: ["trending", "calm", "chill"], signals: [{ kind: "nct_top50_vi", rank: 37 }], aliases: ["hoá ra", "hóa ra"] },
  { id: "co-don-anh-cung-vui", title: "Cô Đơn Anh Cũng Vui", artists: ["TINH HÀ SAY HI", "WEAN", "KIMLONG", "Xuân Định K.Y", "DILLAN"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 38 }] },
  { id: "am-tham-ben-em", title: "Âm Thầm Bên Em", artists: ["Sơn Tùng M-TP"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 39 }] },
  { id: "kho-bau", title: "Kho Báu", artists: ["(S)TRONG", "Rhymastic"], language: "vi", buckets: ["trending", "chill", "calm"], signals: [{ kind: "nct_top50_vi", rank: 40 }, { kind: "nct_acoustic_vi", rank: 1 }] },
  { id: "xoay-vong", title: "XOAY VÒNG", artists: ["TINH HÀ SAY HI", "HURRYKNG", "CONGB", "JSOL", "VƯƠNG BÌNH"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 41 }] },
  { id: "don-dau-vo-cung", title: "Đớn Đau Vô Cùng", artists: ["DatKaa"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 42 }] },
  { id: "chang-phai-tinh-dau-sao-dau-den-the", title: "chẳng phải tình đầu sao đau đến thế", artists: ["MIN", "Dangrangto", "antransax"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 43 }] },
  { id: "ben-ay-em-co-ai-roi", title: "Bên Ấy Em Có Ai Rồi", artists: ["Châu Khải Phong", "TVk"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 44 }] },
  { id: "gui-em-nguoi-bat-tu", title: "Gửi em, người bất tử", artists: ["Ân ngờ", "Mỹ Mỹ"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 45 }] },
  { id: "dao-gan-day-anh-thay-anh-khong-bang-ai-het", title: "Dạo Gần Đây Anh Thấy Anh Không Bằng Ai Hết", artists: ["HIEUTHUHAI"], language: "vi", buckets: ["trending"], signals: [{ kind: "nct_top50_vi", rank: 46 }] },
  { id: "ai-ngoai-anh", title: "Ai Ngoài Anh", artists: ["VSTRA", "Tyronee"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 47 }] },
  { id: "co-gi-dau-ma-cay", title: "Có Gì Đâu Mà Cay", artists: ["TINH HÀ SAY HI", "CAPTAIN BOY", "CoolKid", "IVAN", "Xuân Định K.Y"], language: "vi", buckets: ["trending", "happy"], signals: [{ kind: "nct_top50_vi", rank: 48 }] },
  { id: "trang-thai-mong-mo", title: "Trạng Thái Mộng Mơ", artists: ["Đỗ Hoàng Long"], language: "vi", buckets: ["trending", "chill"], signals: [{ kind: "nct_top50_vi", rank: 49 }] },
  { id: "ngay-nay-nam-ay", title: "Ngày Này Năm Ấy", artists: ["Việt Anh"], language: "vi", buckets: ["trending", "calm"], signals: [{ kind: "nct_top50_vi", rank: 50 }] },

  // New-release signals.
  { id: "tinh-yeu-lon", title: "Tình Yêu Lớn", artists: ["Emcee L", "Muộii"], language: "vi", buckets: ["recent", "calm"], signals: [{ kind: "nct_new_week", rank: 2 }] },
  { id: "ngoai-truyen", title: "Ngoại Truyện", artists: ["502 Ocean", "Minh Tốc & Lam", "Sloth"], language: "vi", buckets: ["recent", "chill"], signals: [{ kind: "nct_new_week", rank: 3 }] },
  { id: "vet-thuong-light", title: "Vết Thương", artists: ["lighT"], language: "vi", buckets: ["recent", "calm"], signals: [{ kind: "nct_new_week", rank: 4 }] },
  { id: "dieu-tan-nhan-nhat", title: "Điều Tàn Nhẫn Nhất", artists: ["Bozitt"], language: "vi", buckets: ["recent", "calm"], signals: [{ kind: "nct_new_week", rank: 5 }] },
  { id: "bo-vo-hoai-lam", title: "Bơ Vơ", artists: ["Hoài Lâm"], language: "vi", buckets: ["recent", "calm"], signals: [{ kind: "nct_new_week", rank: 7 }] },
  { id: "vo-tu-de", title: "Vô Tư Đê", artists: ["Jaysonlei", "RemT"], language: "vi", buckets: ["recent", "happy"], signals: [{ kind: "nct_new_week", rank: 10 }] },
  { id: "dieu-can-den", title: "Điều Cần Đến", artists: ["Quỳnh Anh Shyn"], language: "vi", buckets: ["recent", "happy"], signals: [{ kind: "nct_new_week" }] },
  { id: "rac-roi", title: "Rắc Rối", artists: ["Hồ Đông Quan"], language: "vi", buckets: ["recent", "happy"], signals: [{ kind: "nct_new_week" }] },
  { id: "ke-lay-di-noi-buon", title: "Kẻ Lấy Đi Nỗi Buồn", artists: ["Hoàng Duyên", "JSOL"], language: "vi", buckets: ["recent", "calm"], signals: [{ kind: "nct_new_week" }] },
  { id: "tuy-em", title: "Tùy Em", artists: ["Phạm Quỳnh Anh"], language: "vi", buckets: ["recent", "calm"], signals: [{ kind: "nct_new_week" }] },
  { id: "tieng-ru-then", title: "Tiếng Ru Then", artists: ["52Hz", "Cao Bá Hưng"], language: "vi", buckets: ["recent", "calm", "chill"], signals: [{ kind: "nct_new_week" }] },
  { id: "nam-lay-tay-toi", title: "Nắm Lấy Tay Tôi", artists: ["Hoaprox", "Nguyên Hà"], language: "vi", buckets: ["recent", "happy"], signals: [{ kind: "nct_new_week" }] },
  { id: "som-nhu-vay", title: "Sớm Như Vậy", artists: ["buitruonglinh"], language: "vi", buckets: ["recent", "chill"], signals: [{ kind: "nct_new_week" }] },
  { id: "bot-xinh-yeu", title: "BỚT XINH YÊU", artists: ["TINH HÀ SAY HI", "Pháp Kiều"], language: "vi", buckets: ["recent", "happy"], signals: [{ kind: "nct_new_week" }] },
  { id: "tre-gio-com", title: "TRỄ GIỜ CƠM", artists: ["TINH HÀ SAY HI", "Quang Hùng MasterD", "Xuân Định K.Y", "WEAN", "Sơn.K"], language: "vi", buckets: ["recent", "happy"], signals: [{ kind: "nct_new_week" }] },
  { id: "mot-ke-dang-thuong-mot-nguoi-dang-trach", title: "1 Kẻ Đáng Thương 1 Người Đáng Trách", artists: ["TINH HÀ SAY HI", "CoolKid", "Ánh Sáng AZA"], language: "vi", buckets: ["recent"], signals: [{ kind: "nct_new_week" }] },

  // Curated mood signals for the stable 60% of the 3-day mix.
  { id: "de-toi-om-em-bang-giai-dieu-nay", title: "để tôi ôm em bằng giai điệu này", artists: ["Kai Đinh", "MIN", "GREY D"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 3 }] },
  { id: "dung-lam-trai-tim-anh-dau", title: "Đừng Làm Trái Tim Anh Đau", artists: ["Sơn Tùng M-TP"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 4 }] },
  { id: "hoang-hon-nho", title: "Hoàng Hôn Nhớ", artists: ["Anh Tú"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 5 }] },
  { id: "nhung-loi-hua-bo-quen", title: "Những Lời Hứa Bỏ Quên", artists: ["Vũ.", "Dear Jane"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 6 }] },
  { id: "vi-em-chua-bao-gio-khoc", title: "Vì Em Chưa Bao Giờ Khóc", artists: ["Hà Nhi", "A.C Xuân Tài"], language: "vi", buckets: ["calm"], signals: [{ kind: "nct_acoustic_vi", rank: 7 }] },
  { id: "khuoc-tu", title: "Khước Từ", artists: ["Hà Nhi", "Anh Tú"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 8 }] },
  { id: "loi-yeu-em", title: "Lời Yêu Em", artists: ["Vũ."], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi" }] },
  { id: "pho-khong-em", title: "Phố Không Em", artists: ["Thái Đinh"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi" }] },
  { id: "co-chang-trai-viet-len-cay", title: "Có Chàng Trai Viết Lên Cây", artists: ["Phan Mạnh Quỳnh", "Thế Phương VBK"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 1 }] },
  { id: "uoc-gi", title: "Ước Gì", artists: ["JayKii"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 3 }] },
  { id: "rieng-minh-em", title: "Riêng Mình Em", artists: ["Miu Lê"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 4 }] },
  { id: "mot-thoi-da-xa", title: "Một Thời Đã Xa", artists: ["Thuỳ Chi"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 1 }] },
  { id: "nhu-ngay-hom-qua", title: "Như Ngày Hôm Qua", artists: ["Sơn Tùng M-TP"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 3 }] },
  { id: "ong-ba-anh", title: "Ông Bà Anh", artists: ["Lê Thiện Hiếu"], language: "vi", buckets: ["happy"], signals: [{ kind: "nct_happy_vi", rank: 3 }] },
  { id: "bac-tai-oi", title: "Bác Tài Ơi", artists: ["Lê Thiện Hiếu"], language: "vi", buckets: ["happy"], signals: [{ kind: "nct_happy_vi", rank: 4 }] },
  { id: "lieu-gio", title: "Liệu Giờ", artists: ["2T", "Venn"], language: "vi", buckets: ["happy"], signals: [{ kind: "nct_happy_vi", rank: 2 }] },
  { id: "bay-thu-minh", title: "Bay", artists: ["Thu Minh"], language: "vi", buckets: ["happy"], signals: [{ kind: "nct_happy_vi", rank: 1 }] },
  { id: "bua-yeu", title: "Bùa Yêu", artists: ["Bích Phương"], language: "vi", buckets: ["happy"], signals: [{ kind: "nct_happy_vi", rank: 6 }] },
  { id: "lam-nhung-gi-minh-thich", title: "Làm Những Gì Mình Thích", artists: ["Hồ Quang Hiếu"], language: "vi", buckets: ["happy"], signals: [{ kind: "nct_acoustic_vi", rank: 1 }] },
  { id: "ngay-ngo", title: "Ngây Ngô", artists: ["Hoàng Yến Chibi"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_acoustic_vi", rank: 4 }] },
  { id: "roi-ta-se-ngam-phao-hoa-cung-nhau", title: "Rồi Ta Sẽ Ngắm Pháo Hoa Cùng Nhau", artists: ["Olew", "JUUN D"], language: "vi", buckets: ["happy", "calm"], signals: [{ kind: "nct_top100_nhac_tre" }] },
  { id: "bong-thien-dieu", title: "Bông Thiên Điểu", artists: ["MTV Band", "Hoàng Dũng"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_top100_nhac_tre" }] },
  { id: "chay-khoi-the-gioi-nay", title: "Chạy Khỏi Thế Giới Này", artists: ["Da LAB", "Phương Ly"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_top100_nhac_tre" }] },
  { id: "nang-tho", title: "Nàng Thơ", artists: ["Hoàng Dũng"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_top100_nhac_tre", rank: 6 }] },
  { id: "ben-tren-tang-lau", title: "Bên Trên Tầng Lầu", artists: ["Tăng Duy Tân"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_top100_nhac_tre", rank: 1 }] },
  { id: "tren-tinh-ban-duoi-tinh-yeu", title: "Trên Tình Bạn Dưới Tình Yêu", artists: ["MIN"], language: "vi", buckets: ["happy", "chill"], signals: [{ kind: "nct_top100_nhac_tre", rank: 2 }] },
  { id: "tung-yeu", title: "Từng Yêu", artists: ["Phan Duy Anh"], language: "vi", buckets: ["calm"], signals: [{ kind: "nct_top100_nhac_tre" }] },
  { id: "thuan-theo-y-troi", title: "Thuận Theo Ý Trời", artists: ["Bùi Anh Tuấn"], language: "vi", buckets: ["calm"], signals: [{ kind: "nct_top100_nhac_tre", rank: 1 }] },
  { id: "con-thuong-thi-khong-de-em-khoc", title: "Còn Thương Thì Không Để Em Khóc", artists: ["Miu Lê"], language: "vi", buckets: ["calm"], signals: [{ kind: "nct_top100_nhac_tre", rank: 2 }] },
  { id: "tu-tam", title: "Tự Tâm", artists: ["Nguyễn Trần Trung Quân"], language: "vi", buckets: ["calm", "chill"], signals: [{ kind: "nct_top100_nhac_tre" }] },
];

export const vietnameseSeedsForBucket = (bucket: VietnameseMusicBucket) =>
  VIETNAMESE_MUSIC_SEEDS.filter(seed => seed.buckets.includes(bucket));
