export const getGivenName = (displayName: string): string => {
  const parts = String(displayName ?? "").trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? "";
};

export const getGivenNameInitial = (displayName: string): string => {
  const givenName = getGivenName(displayName);
  return (givenName.slice(0, 1) || "?").toLocaleUpperCase("vi");
};

export const getGivenNameSection = (displayName: string): string => {
  const initial = getGivenNameInitial(displayName);
  return /^[A-ZÀ-ỸĐ]$/iu.test(initial) ? initial : "#";
};

export const compareDisplayNamesByGivenName = (
  a: { displayName: string },
  b: { displayName: string },
): number => {
  const givenA = getGivenName(a.displayName);
  const givenB = getGivenName(b.displayName);
  return givenA.localeCompare(givenB, "vi", { sensitivity: "base" })
    || a.displayName.localeCompare(b.displayName, "vi", { sensitivity: "base" });
};

export type AlphabetSection<T> = { title: string; data: T[] };

export const groupByGivenNameInitial = <T extends { displayName: string }>(items: T[]): AlphabetSection<T>[] => {
  const sorted = [...items].sort(compareDisplayNamesByGivenName);
  const groups = new Map<string, T[]>();
  sorted.forEach((item) => {
    const title = getGivenNameSection(item.displayName);
    const group = groups.get(title);
    if (group) group.push(item);
    else groups.set(title, [item]);
  });
  return [...groups.entries()].map(([title, data]) => ({ title, data }));
};
