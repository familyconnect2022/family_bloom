/** Authentication transport errors are not equivalent to "no Internet".
 * Safe to log: stage and known error codes ONLY, never UID or payload. */
export type VerificationIssue = { stage: "profile" | "membership"; kind: "timeout" | "unavailable" | "permission" | "unknown" };

export function classifyVerificationIssue(stage: VerificationIssue["stage"], error: unknown): VerificationIssue {
  const source = error && typeof error === "object" ? error as { code?: unknown; name?: unknown } : {};
  const code = typeof source.code === "string" ? source.code.toLowerCase() : "";
  const name = typeof source.name === "string" ? source.name : "";
  if (name === "SessionVerificationTimeoutError" || code.includes("deadline-exceeded")) return { stage, kind: "timeout" };
  if (code.includes("permission-denied") || code.includes("unauthenticated")) return { stage, kind: "permission" };
  if (code.includes("unavailable") || code.includes("network-request-failed")) return { stage, kind: "unavailable" };
  return { stage, kind: "unknown" };
}

export function isTransientVerificationIssue(issue: VerificationIssue): boolean {
  return issue.kind === "timeout" || issue.kind === "unavailable";
}
