/** A bounded wait; the native Firebase request may still finish later.
 * Callers MUST check UID/attempt after resolution before mutating state.
 */
export const SESSION_AUTH_TIMEOUT_MS = 15000;
export const SESSION_PROFILE_TIMEOUT_MS = 15000;
export const SESSION_MEMBERSHIP_TIMEOUT_MS = 15000;

export class SessionVerificationTimeoutError extends Error {
  readonly stage: "profile" | "membership";
  constructor(stage: "profile" | "membership") {
    super(`FAMILY_BLOOM_${stage.toUpperCase()}_TIMEOUT`);
    this.name = "SessionVerificationTimeoutError";
    this.stage = stage;
  }
}

export function withSessionVerificationTimeout<T>(
  request: Promise<T>,
  timeoutMs: number,
  stage: "profile" | "membership",
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SessionVerificationTimeoutError(stage)), timeoutMs);
    request.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
