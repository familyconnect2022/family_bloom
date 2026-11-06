/**
 * Family Bloom: development/incident diagnostics for session bootstrap.
 * Pure TypeScript; no Firebase, navigation, or React dependencies.
 * IMPORTANT: observation only. This module MUST NOT grant access to protected routes.
 */

// Pure observation: off in normal Dev/Metro AND Release builds. Activate only
// for a dedicated diagnostic run with EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS=1.
// No Auth/Profile/Membership route permission may depend on this observer.
export const sessionDiagnosticsEnabled = process.env.EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS === '1';

export type SessionStage = 'AUTH' | 'PROFILE' | 'MEMBERSHIP' | 'FAMILY' | 'WELCOME' | 'NAVIGATION';
export type DiagnosticStatus = 'idle' | 'running' | 'success' | 'failed' | 'timeout' | 'skipped';
export type DiagnosticErrorCode =
  | 'AUTH-001' | 'AUTH-002' | 'AUTH-003'
  | 'PRO-101' | 'PRO-102' | 'PRO-103' | 'PRO-104'
  | 'MEM-201' | 'MEM-202' | 'MEM-203' | 'MEM-204'
  | 'FAM-301' | 'FAM-302' | 'FAM-303'
  | 'WEL-401' | 'WEL-402' | 'WEL-403'
  | 'NAV-501' | 'NAV-502' | 'SYS-601' | 'SYS-602';

export type SafeDetail = Partial<{
  source: string;
  op: string;
  route: string;
  firebaseCode: string;
  attempt: number;
  elapsedMs: number;
  listenerReady: boolean;
  serverReady: boolean;
  cacheOnly: boolean;
  profileExists: boolean;
  membershipExists: boolean;
  activeFamilyMatched: boolean;
  result: string;
}>;

export type DiagnosticRecord = Readonly<{
  time: string;
  elapsedMs: number;
  authEpoch: number;
  stage: SessionStage | 'SYSTEM';
  operation: string;
  event: 'start' | 'success' | 'failure' | 'timeout' | 'skipped' | 'note' | 'stale-result';
  code?: DiagnosticErrorCode;
  detail?: SafeDetail;
}>;

export type StepSnapshot = Readonly<{
  stage: SessionStage;
  operation: string;
  status: DiagnosticStatus;
  elapsedMs: number;
  code?: DiagnosticErrorCode;
  detail?: SafeDetail;
}>;

export type DiagnosticSnapshot = Readonly<{
  session: string; // Random-looking local correlation only, NOT a Firebase UID.
  authEpoch: number;
  version: number;
  startedAt: string;
  steps: ReadonlyArray<StepSnapshot>;
  records: ReadonlyArray<DiagnosticRecord>;
  latestCode: DiagnosticErrorCode | null;
}>;

export type OperationTicket = Readonly<{ authEpoch: number; stepKey: string; serial: number }>;

const FAILURE_BY_STAGE: Record<SessionStage, DiagnosticErrorCode> = {
  AUTH: 'AUTH-003',
  PROFILE: 'PRO-101',
  MEMBERSHIP: 'MEM-201',
  FAMILY: 'FAM-302',
  WELCOME: 'WEL-401',
  NAVIGATION: 'NAV-501',
};
const PERMISSION_BY_STAGE: Partial<Record<SessionStage, DiagnosticErrorCode>> = {
  PROFILE: 'PRO-103', MEMBERSHIP: 'MEM-202', FAMILY: 'FAM-303',
};
const RECORD_CAPACITY = 120;
const ALLOWED_SOURCES = new Set(['firestore', 'auth', 'cache', 'server', 'listener', 'native', 'router', 'local', 'root']);
const ALLOWED_OPERATIONS = new Set([
  'main', 'identity', 'auth-listener', 'auth-state', 'token-read', 'profile-server-read',
  'server-read', 'listener-first-result', 'first-result', 'active-family', 'family-server-read',
  'server-verify', 'paint', 'foreground', 'redirect', 'layout', 'render', 'ack-write',
  'session-gate', 'compare', 'listener-vs-server', 'invariant', 'retry', 'recovery',
  'new-verification-attempt', 'probe', 'route', 'test',
]);
function safeOperation(value: string): string {
  return ALLOWED_OPERATIONS.has(value) ? value : 'other';
}
const CODE_PATTERN = /^(?:auth|firestore)\//i;
const SAFE_FIREBASE_CODES = new Set([
  'permission-denied', 'unauthenticated', 'unavailable', 'deadline-exceeded',
  'cancelled', 'not-found', 'invalid-argument', 'failed-precondition',
  'resource-exhausted', 'aborted', 'internal', 'unknown', 'network-request-failed',
  'user-disabled', 'user-token-expired', 'invalid-user-token', 'too-many-requests',
]);

/** Never copy raw error messages, document contents, UID, email, token, family ID, or URL into a report. */
export function sanitizeFirebaseCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown';
  const raw = (error as { code?: unknown }).code;
  if (typeof raw !== 'string') return 'unknown';
  const candidate = raw.replace(CODE_PATTERN, '').trim().toLowerCase();
  return SAFE_FIREBASE_CODES.has(candidate) ? candidate : 'unknown';
}

export function classifyFailure(stage: SessionStage, error: unknown): DiagnosticErrorCode {
  const firebaseCode = sanitizeFirebaseCode(error);
  if (firebaseCode === 'permission-denied' || firebaseCode === 'unauthenticated') {
    return PERMISSION_BY_STAGE[stage] ?? FAILURE_BY_STAGE[stage];
  }
  return FAILURE_BY_STAGE[stage];
}

function sanitizeRoute(value: string): string {
  // No dynamic path segments (IDs, invitation codes) should reach the report.
  const segments = value.split(/[?#]/)[0].split('/').filter(Boolean);
  const publicNames = new Set(['session-gate', 'welcome', 'create-profile', 'login', 'sign-in', 'sign-up', 'auth', 'index', 'home', '(tabs)', '(auth)', '(protected)', '(public)', '(app)', 'profile', 'family', 'join-family']);
  return '/' + segments.slice(0, 4).map(s => publicNames.has(s) ? s : ':id').join('/');
}

/** Compare observer evidence only. It must NEVER be used as a Firestore authorization decision. */
export function compareMembershipEvidence(evidence: {
  listener: 'pending' | 'exists' | 'absent' | 'error';
  server: 'pending' | 'exists' | 'absent' | 'error';
  listenerError?: unknown;
  serverError?: unknown;
}): DiagnosticErrorCode | null {
  if (evidence.listener === 'error' && sanitizeFirebaseCode(evidence.listenerError) === 'permission-denied') return 'MEM-202';
  if (evidence.server === 'error' && sanitizeFirebaseCode(evidence.serverError) === 'permission-denied') return 'MEM-202';
  if (evidence.server === 'pending') return null; // Only watchdog can classify a true timeout.
  if (evidence.server === 'error') return 'MEM-201';
  if (evidence.listener === 'pending' || evidence.listener === 'error') return null;
  if ((evidence.listener === 'exists') !== (evidence.server === 'exists')) return 'MEM-204';
  if (evidence.server === 'absent') return 'MEM-203';
  return null;
}

/** Read-only checks for regressions between session gate and UI. */
export function analyzeSessionInvariant(state: {
  uidVerified: boolean;
  profileVerified: boolean;
  membershipVerified: boolean;
  activeFamilyVerified: boolean;
  welcomeRequired: boolean;
  welcomePainted: boolean;
  homeMounted: boolean;
  gatePendingMs: number;
}): DiagnosticErrorCode | null {
  const allowed = state.uidVerified && state.profileVerified && state.membershipVerified && state.activeFamilyVerified;
  if (state.homeMounted && (!allowed || (state.welcomeRequired && !state.welcomePainted))) return 'NAV-502';
  if (allowed && state.welcomeRequired && !state.welcomePainted && state.gatePendingMs >= 5000) return 'WEL-401';
  if (allowed && !state.welcomeRequired && !state.homeMounted && state.gatePendingMs >= 5000) return 'SYS-601';
  return null;
}

function sanitizeDetail(detail?: SafeDetail): SafeDetail | undefined {
  if (!detail) return undefined;
  const clean: SafeDetail = {};
  // Explicit allowlist. Dynamic object spreading is intentionally forbidden.
  if (typeof detail.source === 'string') clean.source = ALLOWED_SOURCES.has(detail.source) ? detail.source : 'other';
  if (typeof detail.op === 'string') clean.op = safeOperation(detail.op);
  // Route is reduced to path segments, never query strings (which might contain IDs).
  if (typeof detail.route === 'string') clean.route = sanitizeRoute(detail.route);
  if (typeof detail.firebaseCode === 'string') {
    const v = detail.firebaseCode.replace(CODE_PATTERN, '').trim().toLowerCase();
    clean.firebaseCode = SAFE_FIREBASE_CODES.has(v) ? v : 'unknown';
  }
  if (typeof detail.attempt === 'number' && Number.isFinite(detail.attempt)) clean.attempt = Math.min(100, Math.max(0, Math.trunc(detail.attempt)));
  if (typeof detail.elapsedMs === 'number' && Number.isFinite(detail.elapsedMs)) clean.elapsedMs = Math.min(86400000, Math.max(0, Math.trunc(detail.elapsedMs)));
  for (const name of ['listenerReady', 'serverReady', 'cacheOnly', 'profileExists', 'membershipExists', 'activeFamilyMatched'] as const) {
    if (typeof detail[name] === 'boolean') clean[name] = detail[name];
  }
  if (typeof detail.result === 'string') clean.result = detail.result.slice(0, 32).replace(/[^a-zA-Z0-9_ .-]/g, '_');
  return Object.keys(clean).length ? clean : undefined;
}

interface MutableStep {
  stage: SessionStage;
  operation: string;
  status: DiagnosticStatus;
  serial: number;
  began: number;
  elapsedMs: number;
  code?: DiagnosticErrorCode;
  detail?: SafeDetail;
  timer?: ReturnType<typeof setTimeout>;
}

export class SessionDiagnostics {
  private authEpoch = 0;
  private currentUid: string | null = null; // in memory only; never placed in records or reports
  private serial = 0;
  private version = 0;
  private started = Date.now();
  private session = this.newSessionId();
  private steps = new Map<string, MutableStep>();
  private records: DiagnosticRecord[] = [];
  private latestCode: DiagnosticErrorCode | null = null;
  private listeners = new Set<() => void>();
  private snapshot: DiagnosticSnapshot = this.makeSnapshot();

  private newSessionId(): string {
    return `FB-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xFFFFFF).toString(36)}`;
  }
  private key(stage: SessionStage, operation: string): string { return `${stage}/${operation}`; }
  private makeSnapshot(): DiagnosticSnapshot {
    const now = Date.now();
    return {
      session: this.session,
      authEpoch: this.authEpoch,
      version: this.version,
      startedAt: new Date(this.started).toISOString(),
      steps: Array.from(this.steps.values(), s => ({
        stage: s.stage, operation: s.operation, status: s.status,
        elapsedMs: s.status === 'running' ? now - s.began : s.elapsedMs,
        ...(s.code ? { code: s.code } : {}), ...(s.detail ? { detail: s.detail } : {}),
      })),
      records: this.records.slice(), latestCode: this.latestCode,
    };
  }
  private publish() {
    if (!sessionDiagnosticsEnabled) return;
    this.version += 1;
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach(fn => { try { fn(); } catch { /* subscriber is external */ } });
  }
  private add(stage: SessionStage | 'SYSTEM', operation: string, event: DiagnosticRecord['event'], code?: DiagnosticErrorCode, detail?: SafeDetail) {
    if (!sessionDiagnosticsEnabled) return;
    this.records.push({
      time: new Date().toISOString(), elapsedMs: Date.now() - this.started,
      authEpoch: this.authEpoch, stage, operation, event,
      ...(code ? { code } : {}), ...(sanitizeDetail(detail) ? { detail: sanitizeDetail(detail) } : {}),
    });
    if (this.records.length > RECORD_CAPACITY) this.records.splice(0, this.records.length - RECORD_CAPACITY);
    if (code) this.latestCode = code;
    this.publish();
  }
  private clearSteps() {
    this.steps.forEach(s => { if (s.timer) clearTimeout(s.timer); });
    this.steps.clear();
  }
  /** Call on Firebase auth callback. The SAME UID does not reset current verification. */
  identityChanged(uid: string | null): boolean {
    if (!sessionDiagnosticsEnabled || this.currentUid === uid) return false;
    this.currentUid = uid;
    this.authEpoch += 1;
    this.serial = 0;
    this.clearSteps();
    this.records = [];
    this.latestCode = null;
    this.started = Date.now();
    this.session = this.newSessionId();
    this.add('AUTH', 'identity', 'note', undefined, { result: uid ? 'signed-in' : 'signed-out' });
    return true;
  }
  /** Call on *same-UID* explicit re-verification to invalidate callbacks from older attempts. */
  newVerificationAttempt(): number {
    if (!sessionDiagnosticsEnabled) return this.authEpoch;
    this.authEpoch += 1;
    this.serial = 0;
    this.clearSteps();
    this.add('SYSTEM', 'new-verification-attempt', 'note');
    return this.authEpoch;
  }
  getEpoch(): number { return this.authEpoch; }
  isCurrentEpoch(epoch: number): boolean { return epoch === this.authEpoch; }
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = (): DiagnosticSnapshot => this.snapshot;
  /**
   * timeoutMs is OBSERVATION-ONLY. It changes the diagnostic label, never navigates,
   * never cancels a Firestore listener, and never writes permission/profile state.
   */
  start(stage: SessionStage, operation = 'main', timeoutMs = 15000, detail?: SafeDetail): OperationTicket {
    if (!sessionDiagnosticsEnabled) return { authEpoch: -1, stepKey: "disabled", serial: -1 };
    operation = safeOperation(operation);
    const stepKey = this.key(stage, operation);
    const previous = this.steps.get(stepKey);
    if (previous?.timer) clearTimeout(previous.timer);
    const serial = ++this.serial;
    const ticketEpoch = this.authEpoch;
    const step: MutableStep = {
      stage, operation, status: 'running', serial, began: Date.now(), elapsedMs: 0, detail: sanitizeDetail(detail),
    };
    this.steps.set(stepKey, step);
    this.add(stage, operation, 'start', undefined, detail);
    if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
      step.timer = setTimeout(() => {
        if (!this.isActive({ authEpoch: ticketEpoch, stepKey, serial })) return;
        step.status = 'timeout';
        step.elapsedMs = Date.now() - step.began;
        step.code = this.timeoutCode(stage);
        this.add(stage, operation, 'timeout', step.code, { elapsedMs: step.elapsedMs });
      }, Math.min(120000, Math.max(1, timeoutMs)));
    }
    return { authEpoch: ticketEpoch, stepKey, serial };
  }
  private isActive(ticket: OperationTicket): boolean {
    return ticket.authEpoch === this.authEpoch && this.steps.get(ticket.stepKey)?.serial === ticket.serial;
  }
  private timeoutCode(stage: SessionStage): DiagnosticErrorCode {
    if (stage === 'AUTH') return 'AUTH-001';
    if (stage === 'WELCOME') return 'WEL-401';
    if (stage === 'NAVIGATION') return 'NAV-501';
    return FAILURE_BY_STAGE[stage];
  }
  private finish(ticket: OperationTicket, status: DiagnosticStatus, code?: DiagnosticErrorCode, detail?: SafeDetail) {
    if (!this.isActive(ticket)) {
      // A stale callback may not touch the new session state.
      return false;
    }
    const step = this.steps.get(ticket.stepKey)!;
    if (step.timer) clearTimeout(step.timer);
    step.timer = undefined;
    step.status = status;
    step.elapsedMs = Date.now() - step.began;
    const previousCode = step.code;
    step.code = code;
    step.detail = sanitizeDetail(detail) ?? step.detail;
    if (status === 'success' && previousCode === this.latestCode) {
      const remaining = Array.from(this.steps.values()).filter(s => s !== step && (s.status === 'failed' || s.status === 'timeout') && s.code);
      this.latestCode = remaining.length ? remaining[remaining.length - 1].code ?? null : null;
    }
    this.add(step.stage, step.operation, status === 'failed' ? 'failure' : status === 'skipped' ? 'skipped' : 'success', code, { ...step.detail, elapsedMs: step.elapsedMs });
    return true;
  }
  success(ticket: OperationTicket, detail?: SafeDetail): boolean { return this.finish(ticket, 'success', undefined, detail); }
  failure(ticket: OperationTicket, error: unknown, overrideCode?: DiagnosticErrorCode): boolean {
    if (!this.isActive(ticket)) return false;
    const stage = this.steps.get(ticket.stepKey)!.stage;
    return this.finish(ticket, 'failed', overrideCode ?? classifyFailure(stage, error), { firebaseCode: sanitizeFirebaseCode(error) });
  }
  skipped(ticket: OperationTicket, detail?: SafeDetail): boolean { return this.finish(ticket, 'skipped', undefined, detail); }
  issue(stage: SessionStage | 'SYSTEM', code: DiagnosticErrorCode, operation = 'invariant', detail?: SafeDetail) {
    if (!sessionDiagnosticsEnabled) return;
    this.add(stage, safeOperation(operation), 'failure', code, detail);
  }
  note(stage: SessionStage | 'SYSTEM', operation: string, detail?: SafeDetail) {
    if (!sessionDiagnosticsEnabled) return;
    this.add(stage, safeOperation(operation), 'note', undefined, detail);
  }
  dispose() { this.clearSteps(); this.listeners.clear(); }
  /** Plain string suitable for user-controlled Share / native text selection. No PII. */
  exportReport(): string {
    return `FAMILY BLOOM · AUTH DIAGNOSTIC\n${JSON.stringify(this.getSnapshot(), null, 2)}`;
  }
}

/** Single instance; do not duplicate via separate providers/components. */
export const familyBloomSessionDiagnostics = new SessionDiagnostics();
