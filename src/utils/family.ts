/**
 * Tạo mã gia đình dễ nhớ từ tên nhà + 4 chữ số.
 * Mã này là alias duy nhất để thành viên dùng thay cho Firestore familyId dài.
 */
export const normalizeFamilyName = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);

export const createFamilyCodeCandidate = (familyName: string): string => {
  const base = normalizeFamilyName(familyName) || "gia-dinh";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${base}-${suffix}`;
};
