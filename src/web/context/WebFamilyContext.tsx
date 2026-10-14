import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useWebAuth } from "./WebAuthContext";
import { webDb } from "../firebaseWeb";

export type WebMembership = { familyId: string; familyName: string; role?: string; joinedAt?: string };
export type WebProfile = { uid?: string; displayName?: string; shortName?: string; avatarUrl?: string; avatarPublicId?: string; color?: string; phoneNumber?: string|null; birthDate?: string|null; gender?:"male"|"female"|"other"; currentLocation?:string|null; bio?:string|null; bloodType?:string|null; interests?:string[]; hobbies?:string[]|null; activeFamilyId?: string | null };
export type WebFamilyMember = { uid: string; displayName?: string; shortName?: string; avatarUrl?: string; color?: string; phoneNumber?:string|null; birthDate?:string|null; gender?:"male"|"female"|"other"; currentLocation?:string|null; bio?:string|null; bloodType?:string|null; interests?:string[]; role?: string };

type Value = {
  loading: boolean;
  profile: WebProfile | null;
  memberships: WebMembership[];
  activeFamilyId: string | null;
  activeFamily: WebMembership | null;
  members: WebFamilyMember[];
  switchFamily(familyId: string): Promise<void>;
};

const Ctx = createContext<Value | null>(null);

export function WebFamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useWebAuth();
  const [profile, setProfile] = useState<WebProfile | null>(null);
  const [memberships, setMemberships] = useState<WebMembership[]>([]);
  const [members, setMembers] = useState<WebFamilyMember[]>([]);
  const [profileReady, setProfileReady] = useState(false);
  const [membershipReady, setMembershipReady] = useState(false);

  useEffect(() => {
    setProfile(null); setMemberships([]); setMembers([]); setProfileReady(false); setMembershipReady(false);
    if (!user) return;
    const stopProfile = onSnapshot(doc(webDb, `users/${user.uid}`), snap => {
      setProfile(snap.exists() ? ({ uid: user.uid, ...snap.data() } as WebProfile) : { uid: user.uid });
      setProfileReady(true);
    }, () => setProfileReady(true));
    const stopMemberships = onSnapshot(collection(webDb, `users/${user.uid}/memberships`), snap => {
      const rows = snap.docs.map(item => ({ familyId: item.id, ...item.data() } as WebMembership));
      rows.sort((a, b) => (a.familyName || "").localeCompare(b.familyName || "", "vi"));
      setMemberships(rows);
      setMembershipReady(true);
    }, () => setMembershipReady(true));
    return () => { stopProfile(); stopMemberships(); };
  }, [user]);

  const activeFamilyId = useMemo(() => {
    const candidate = profile?.activeFamilyId ?? null;
    if (candidate && memberships.some(item => item.familyId === candidate)) return candidate;
    return memberships[0]?.familyId ?? null;
  }, [memberships, profile?.activeFamilyId]);
  const activeFamily = memberships.find(item => item.familyId === activeFamilyId) ?? null;

  useEffect(() => {
    setMembers([]);
    if (!activeFamilyId) return;
    return onSnapshot(collection(webDb, `families/${activeFamilyId}/members`), snap => {
      setMembers(snap.docs.map(item => ({ uid: item.id, ...item.data() } as WebFamilyMember)));
    }, () => setMembers([]));
  }, [activeFamilyId]);

  const switchFamily = useCallback(async (familyId: string) => {
    if (!user || !memberships.some(item => item.familyId === familyId)) return;
    await updateDoc(doc(webDb, `users/${user.uid}`), { activeFamilyId: familyId, updatedAt: new Date().toISOString() });
  }, [memberships, user]);

  const value = useMemo<Value>(() => ({
    loading: !!user && (!profileReady || !membershipReady),
    profile,
    memberships,
    activeFamilyId,
    activeFamily,
    members,
    switchFamily,
  }), [activeFamily, activeFamilyId, members, membershipReady, memberships, profile, profileReady, switchFamily, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWebFamily = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWebFamily must be used inside WebFamilyProvider");
  return value;
};
