/** Shared presentation rules for Main Tree and Focus View. Source record is NEVER changed. */
export function formatFamilyGraphNodeName(fullName: string, maxChars = 26): string {
  const normalized = String(fullName ?? '').trim().replace(/\s+/gu, ' ');
  if (normalized.length <= maxChars) return normalized;
  const parts = normalized.split(' ');
  // Vietnamese names may include two family surnames and a two-word given name.
  // Only the middle is ever abbreviated; avoid guessing an official surname field.
  if (parts.length < 5) return normalized;
  const leading = parts.slice(0, 2).join(' ');
  const given = parts.slice(-2).join(' ');
  return `${leading} … ${given}`;
}

/** A relationship is relative to the selected person, never a permanent person field. */
export function getFamilyGraphPlateLabel(label: string | null | undefined, isSelf: boolean): string | null {
  if (isSelf) return 'Đang xem';
  const candidate = label?.trim();
  if (!candidate || /^(chưa xác định|không rõ|không có quan hệ)/iu.test(candidate)) return null;
  return candidate;
}
