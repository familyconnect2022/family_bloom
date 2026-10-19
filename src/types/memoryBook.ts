export type MemoryBookScope = "family" | "person";

export interface MemoryBookDraft {
  id: string;
  familyId: string;
  scope: MemoryBookScope;
  personId: string | null;
  title: string;
  subtitle: string;
  coverMomentId: string | null;
  momentIds: string[];
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}
