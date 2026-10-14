import {
  collection, doc, getDoc, getDocs, limit, query, runTransaction, setDoc, updateDoc, where,
} from "firebase/firestore";
import { webDb } from "../firebaseWeb";
import { createFamilyCodeCandidate } from "../../utils/family";
import type { WebProfile } from "../context/WebFamilyContext";
import { uploadWebMedia } from "./webFeatureService";

const nowIso = () => new Date().toISOString();
const compact = <T extends Record<string, unknown>>(value: T) => Object.fromEntries(Object.entries(value).filter(([,v]) => v !== undefined)) as T;

export async function createWebFamily(uid: string, familyName: string, profile: WebProfile) {
  const name = familyName.trim();
  if (!name) throw new Error("Bạn hãy nhập tên mái nhà.");
  const familyRef = doc(collection(webDb, "families"));
  for (let attempt=0; attempt<8; attempt++) {
    const familyCode = createFamilyCodeCandidate(name);
    const codeRef = doc(webDb, `family_codes/${familyCode}`);
    const now = nowIso();
    const result = await runTransaction(webDb, async tx => {
      const code = await tx.get(codeRef);
      if (code.exists()) return null;
      const userRef = doc(webDb, `users/${uid}`);
      const memberRef = doc(webDb, `families/${familyRef.id}/members/${uid}`);
      const membershipRef = doc(webDb, `users/${uid}/memberships/${familyRef.id}`);
      tx.set(familyRef, { id: familyRef.id, name, familyCode, ownerId: uid, createdAt: now, updatedAt: now });
      tx.set(codeRef, { id: familyCode, familyCode, familyId: familyRef.id, familyName: name, ownerId: uid, createdAt: now });
      tx.set(memberRef, compact({ uid, displayName: profile.displayName || "Thành viên", shortName: profile.shortName, avatarUrl: profile.avatarUrl, color: profile.color || "#E98AA6", role: "admin", joinedAt: now, updatedAt: now }));
      tx.set(membershipRef, { familyId: familyRef.id, familyName: name, role: "admin", joinedAt: now });
      tx.set(userRef, { activeFamilyId: familyRef.id, updatedAt: now }, { merge: true });
      return { familyId: familyRef.id, familyName: name, familyCode };
    });
    if (result) return result;
  }
  throw new Error("Bloom chưa tạo được mã Nhà duy nhất. Bạn thử lại nhé.");
}

export async function requestWebFamilyJoin(uid: string, familyKeyInput: string, profile: WebProfile, message?: string) {
  const familyKey = familyKeyInput.trim();
  if (!familyKey || familyKey.includes("/") || familyKey.length > 200) throw new Error("Mã Nhà chưa hợp lệ.");
  const codeSnap = await getDoc(doc(webDb, `family_codes/${familyKey.toLowerCase()}`));
  const aliases = codeSnap.exists() ? null : await getDocs(query(collection(webDb, "family_codes"), where("familyId", "==", familyKey), limit(1)));
  const alias = codeSnap.exists() ? codeSnap.data() : aliases?.docs[0]?.data();
  const familyId = String(alias?.familyId || familyKey);
  const requestRef = doc(webDb, `families/${familyId}/joinRequests/${uid}`);
  const membershipRef = doc(webDb, `users/${uid}/memberships/${familyId}`);
  const request = compact({
    uid, familyId, familyName: String(alias?.familyName || "Gia đình"), status: "pending",
    applicant: compact({ uid, displayName: profile.displayName || "Thành viên", shortName: profile.shortName, avatarUrl: profile.avatarUrl, bio: (profile as any).bio, interests: (profile as any).interests || [] }),
    message: message?.trim() || undefined, requestedAt: nowIso(),
  });
  await runTransaction(webDb, async tx => {
    const [membership, previous] = await Promise.all([tx.get(membershipRef), tx.get(requestRef)]);
    if (membership.exists()) throw new Error("Bạn đã ở trong mái nhà này rồi.");
    if (previous.exists() && previous.data()?.status === "pending") throw new Error("Yêu cầu vào Nhà đang chờ duyệt.");
    tx.set(requestRef, request);
  });
  return request;
}

export async function approveWebJoin(familyId: string, request: any, adminUid: string) {
  const reviewedAt=nowIso(); const requestRef=doc(webDb,`families/${familyId}/joinRequests/${request.uid}`); const memberRef=doc(webDb,`families/${familyId}/members/${request.uid}`); const membershipRef=doc(webDb,`users/${request.uid}/memberships/${familyId}`); const familyRef=doc(webDb,`families/${familyId}`);
  await runTransaction(webDb,async tx=>{const [r,f,m]=await Promise.all([tx.get(requestRef),tx.get(familyRef),tx.get(memberRef)]);if(!r.exists()||r.data()?.status!=="pending")throw new Error("Yêu cầu này không còn chờ duyệt.");if(!f.exists())throw new Error("Không tìm thấy mái nhà.");if(m.exists())throw new Error("Người này đã là thành viên.");const applicant=r.data().applicant||{};tx.set(memberRef,compact({uid:request.uid,displayName:applicant.displayName||"Thành viên",shortName:applicant.shortName,avatarUrl:applicant.avatarUrl,bio:applicant.bio,interests:applicant.interests||[],role:"member",joinedAt:reviewedAt,updatedAt:reviewedAt}));tx.set(membershipRef,{familyId,familyName:f.data().name||request.familyName||"Gia đình",role:"member",joinedAt:reviewedAt});tx.update(requestRef,{status:"approved",reviewedAt,reviewedByUid:adminUid});});
}
export async function rejectWebJoin(familyId:string,request:any,adminUid:string,reason?:string){await updateDoc(doc(webDb,`families/${familyId}/joinRequests/${request.uid}`),compact({status:"rejected",reviewedAt:nowIso(),reviewedByUid:adminUid,rejectionReason:reason?.trim()||undefined}));}

export async function updateWebProfile(uid:string,familyId:string|null,input:{displayName:string;shortName?:string;color?:string;phoneNumber?:string;birthDate?:string;gender?:"male"|"female"|"other";currentLocation?:string;bio?:string;bloodType?:string;interests?:string[];avatarFile?:File|null}){
  let avatarUrl:string|undefined;let avatarPublicId:string|undefined;let avatarAssetId:string|undefined;
  if(input.avatarFile&&familyId){
    const uploaded=await uploadWebMedia(input.avatarFile,familyId,uid,undefined,{purpose:"avatar",entityType:"user",entityId:uid,familyIdForAsset:null,folder:`family-bloom/users/${uid}`});
    avatarUrl=uploaded.media.secureUrl;avatarPublicId=uploaded.media.publicId;avatarAssetId=uploaded.assetId;
  }
  const updatedAt=nowIso();
  const userPatch=compact({displayName:input.displayName.trim(),shortName:input.shortName?.trim()||undefined,color:input.color||undefined,phoneNumber:input.phoneNumber?.trim()||null,birthDate:input.birthDate||null,gender:input.gender||"other",currentLocation:input.currentLocation?.trim()||null,bio:input.bio?.trim()||null,bloodType:input.bloodType||null,interests:Array.from(new Set(input.interests||[])),avatarUrl,avatarPublicId,updatedAt});
  await setDoc(doc(webDb,`users/${uid}`),userPatch,{merge:true});
  if(familyId){
    const memberPatch=compact({displayName:userPatch.displayName,shortName:userPatch.shortName,color:userPatch.color,phoneNumber:userPatch.phoneNumber,birthDate:userPatch.birthDate,gender:userPatch.gender,currentLocation:userPatch.currentLocation,bio:userPatch.bio,bloodType:userPatch.bloodType,interests:userPatch.interests,avatarUrl:userPatch.avatarUrl,updatedAt});
    await setDoc(doc(webDb,`families/${familyId}/members/${uid}`),memberPatch,{merge:true});
  }
  if(avatarAssetId)await updateDoc(doc(webDb,`media_assets/${avatarAssetId}`),{status:"attached",updatedAt});
  return userPatch;
}
