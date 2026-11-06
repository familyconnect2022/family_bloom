/** Case-sensitive family introduction name. NFC preserves accents and capitalization.
 * Prefix + URI encoding ensures even slashes and symbols are safe Firestore document IDs.
 * No locale lowercasing, accent removal or approximate matching is allowed.
 */
export const FAMILY_INTRO_MAX = 20;
export function familyIntroCharacters(value: string): number {
  const text = String(value || '').normalize('NFC');
  // Intl.Segmenter is not guaranteed in every Hermes runtime.
  const segmenter = (Intl as unknown as { Segmenter?: new (locale: string, options: { granularity: string }) => { segment: (text: string) => Iterable<unknown> } }).Segmenter;
  if (segmenter) return Array.from(new segmenter('vi', { granularity: 'grapheme' }).segment(text)).length;
  let count = 0, afterJoiner = false, regionals = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp === 0x200d) { afterJoiner = true; continue; }
    if (/\p{Mark}/u.test(char) || cp === 0xfe0f || (cp >= 0x1f3fb && cp <= 0x1f3ff)) continue;
    if (cp >= 0x1f1e6 && cp <= 0x1f1ff) { if (regionals % 2 === 0) count++; regionals++; continue; }
    regionals = 0;
    if (!afterJoiner) count++;
    afterJoiner = false;
  }
  return count;
}
export function normalizedFamilyIntroName(value: string): string {
  return String(value ?? '').normalize('NFC').trim();
}
export function validateFamilyIntroName(input: string): string {
  const name = normalizedFamilyIntroName(input);
  if (!name || familyIntroCharacters(name) > FAMILY_INTRO_MAX || /[\u0000-\u001f\u007f]/u.test(name)) {
    throw new Error('Tên giới thiệu phải có 1–20 ký tự, không chứa ký tự điều khiển.');
  }
  return name;
}
export function familyIntroDocId(name: string): string {
  return `v1_${encodeURIComponent(name.normalize('NFC'))}`;
}
