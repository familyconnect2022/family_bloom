import { COLORS } from "@/constants/theme";

export const getInitials = (name: string) => {
  const cleanName = name.trim();
  if (!cleanName) return "??";

  const parts = cleanName.split(/\s+/);

  // Nếu chỉ có 1 chữ (vd: "Nhân"), lấy 2 chữ cái đầu
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  // Nếu có nhiều chữ (vd: "Huỳnh Thanh Nhân"), lấy chữ đầu của từ đầu và từ cuối
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
export function getColorByName(text: string) {
  const colors = [
    "#090D16", // 1. Nền chính siêu tối (Đen xanh đêm muộn) - Đạt tỷ lệ tương phản hoàn hảo với chữ trắng
    "#131B2E", // 2. Nền thẻ/Card (Xanh Navy đậm) - Tạo chiều sâu phân tầng UI
    "#1E293B", // 3. Nền các khối nội dung (Xám Slate tối)
    "#2E3A4E", // 4. Nền các ô nhập liệu / Input Field khi chưa focus
    "#0F3D4C", // 5. Nền khối Highlight xanh biển sâu (Vẫn giữ chữ trắng dễ đọc)
    "#4A1525", // 6. Nền khối Cảnh báo/Thông báo quan trọng (Đỏ Burgundy trầm)
    "#063223", // 7. Nền khối Thành công/Trạng thái (Xanh lục bảo đậm)
    "#5C3E0A", // 8. Nền khối Chú ý/Lưu ý (Vàng hổ phách tối)
    "#3E1F47", // 9. Nền khối Tính năng đặc biệt (Tím sẫm quý phái)
    "#242B35", // 10. Nền các thanh TabBar / Navigation mỏng ở đáy ứng dụng
  ];
  const name = text.trim();
  if (!name) return COLORS.secondaryText;

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }

  return colors[Math.abs(hash) % colors.length];
}
