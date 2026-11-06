/** Pure cold-start proof for Appearance 3.0. No Firebase, storage, timers or React. */
export type ColdStartMarker = Readonly<{
  palette: string; mode: string; font: string; scale: number;
  session?: string; testVersion?: 2; testMode?: 'live';
}>;
export type ColdStartCurrent = Readonly<{ palette: string; mode: string; font: string; scale: number }>;
export type ColdStartHydration = Readonly<{
  bound: boolean; phase: string; source: string;
}>;
export type ColdStartResultKey =
  'no-marker'|'legacy-marker'|'same-session'|'pending'|'fail-mismatch'|'fail-cache-source'|'pass';
export function evaluateColdStart(marker: ColdStartMarker | null, sessionId: string,
  current: ColdStartCurrent, hydration: ColdStartHydration): Readonly<{ key: ColdStartResultKey; label: string }> {
  if (!marker) return {key:'no-marker',label:'Chưa lưu mốc kiểm tra'};
  if (marker.testVersion !== 2 || marker.testMode !== 'live' || !marker.session)
    return {key:'legacy-marker',label:'Mốc cũ không phân biệt sandbox; hãy lưu lại mốc ở chế độ theme thật'};
  if (marker.session === sessionId)
    return {key:'same-session',label:'Chưa đóng/mở lại ứng dụng; đây vẫn là phiên JS đã lưu mốc'};
  if (!hydration.bound || !['ready-local','ready-cloud','ready-default','offline-default'].includes(hydration.phase))
    return {key:'pending',label:'Đang đọc Appearance của UID; chưa so sánh'};
  if (marker.palette !== current.palette || marker.mode !== current.mode ||
      marker.font !== current.font || marker.scale !== current.scale)
    return {key:'fail-mismatch',label:'FAIL: Appearance sau mở lại không khớp mốc'};
  if (hydration.source !== 'cache')
    return {key:'fail-cache-source',label:'FAIL: Giá trị đúng nhưng không được khôi phục từ cache UID'};
  return {key:'pass',label:'PASS: phiên mới, cache UID và màu/font/cỡ chữ khớp mốc'};
}
