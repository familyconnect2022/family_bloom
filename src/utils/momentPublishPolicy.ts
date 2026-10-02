export const MAX_ADDITIONAL_MOMENT_FAMILIES = 3;

/**
 * Current/source family is always first. Extra targets are explicit opt-in only,
 * deduped, and bounded so a single tap cannot accidentally fan out many large uploads.
 */
export const normalizeMomentTargetFamilyIds = (
  sourceFamilyId: string,
  additionalFamilyIds?: string[],
): string[] => {
  const source = String(sourceFamilyId || "").trim();
  if (!source) return [];
  const extras: string[] = [];
  const seen = new Set([source]);
  for (const raw of additionalFamilyIds ?? []) {
    const familyId = String(raw || "").trim();
    if (!familyId || seen.has(familyId)) continue;
    seen.add(familyId);
    extras.push(familyId);
    if (extras.length >= MAX_ADDITIONAL_MOMENT_FAMILIES) break;
  }
  return [source, ...extras];
};

export const momentResumeProgress = (totalFiles: number, completedFiles: number): number => {
  if (totalFiles <= 0) return 100;
  return Math.min(99, Math.max(0, Math.round((Math.max(0, completedFiles) / totalFiles) * 100)));
};
