import { postFamilyGraphMutation } from "./familyGraphCloudGateway";
import { getAuth } from "@react-native-firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, orderBy, query, runTransaction, setDoc, where } from "@react-native-firebase/firestore";
import type { GraphProposal, ProposalAction, ProposalDocument, ProposalEntity } from "../../types/graphProposal";
import type { FamilyPerson, FamilyRelationship } from "../../types/familyGraph";
import { approveTarget, buildProposalTarget } from "../../utils/graphProposal";
import { wouldCreateParentCycle } from "../../utils/familyGraph";
import { FEATURE_FLAGS } from "../../constants/featureFlags";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
const userId = () => { const uid = getAuth().currentUser?.uid; if (!uid) throw new Error("Bạn cần đăng nhập."); return uid; };
const safeId = (id: string) => { if (!id || id.includes("/")) throw new Error("Mã không hợp lệ."); return id; };
const entityCollectionPath = (familyId: string, entity: ProposalEntity) => entity === "persons"
  ? FIRESTORE_PATHS.familyPersons(safeId(familyId))
  : FIRESTORE_PATHS.familyRelationships(safeId(familyId));
const entityDocPath = (familyId: string, entity: ProposalEntity, id: string) => entity === "persons"
  ? FIRESTORE_PATHS.familyPerson(safeId(familyId), safeId(id))
  : FIRESTORE_PATHS.familyRelationship(safeId(familyId), safeId(id));
export const graphProposalService = {
  watchHasPending(familyId: string, onChange: (pending: boolean) => void, onError: (error: unknown) => void) {
    return onSnapshot(query(collection(getFirestore(), FIRESTORE_PATHS.familyGraphProposals(safeId(familyId))), where("status", "==", "pending"), limit(1)), snapshot => onChange(!snapshot.empty), onError);
  },
  watch(familyId: string, pending: boolean, onChange: (items: GraphProposal[]) => void, onError: (error: unknown) => void) {
    const ref = collection(getFirestore(), FIRESTORE_PATHS.familyGraphProposals(safeId(familyId)));
    const q = pending ? query(ref, where("status", "==", "pending"), limit(100)) : query(ref, orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(q, snap => onChange(snap.docs.map(d => d.data() as GraphProposal).sort((a,b) => b.createdAt.localeCompare(a.createdAt))), onError);
  },
  async submit(familyId: string, entity: ProposalEntity, action: ProposalAction, targetId: string | null, input: Record<string, unknown>, reason: string, expectedUpdatedAt?: string) {
    const uid=userId(), db=getFirestore(), now=new Date().toISOString();
    if (!reason.trim() || reason.length > 2000) throw new Error("Hãy ghi lý do đề xuất (tối đa 2.000 ký tự).");
    const ref=doc(collection(db, FIRESTORE_PATHS.familyGraphProposals(safeId(familyId))));
    let id=targetId || doc(collection(db, entityCollectionPath(familyId, entity))).id;
    let before: ProposalDocument | null=null;
    if (action !== "create") { const snap=await getDoc(doc(db, entityDocPath(familyId, entity, id))); if (!snap.exists()) throw new Error("Nội dung không còn tồn tại."); before=snap.data() as ProposalDocument; if (expectedUpdatedAt !== undefined && before.updatedAt !== expectedUpdatedAt) throw new Error("Dữ liệu thay đổi trong lúc bạn soạn. Hãy chọn lại nội dung và kiểm tra trước khi gửi."); }
    const after=buildProposalTarget(entity,action,familyId,id,before,input,uid,now);
    if (after) id=after.id;
    const proposal: GraphProposal={ id:ref.id, familyId, entity, action, targetId:id, before, after, reason:reason.trim(), createdByUid:uid, createdAt:now, status:"pending", reviewedByUid:null, reviewedAt:null, reviewNote:null, applied:null };
    await setDoc(ref, proposal);
    return ref.id;
  },
  async review(familyId: string, id: string, decision: "approved" | "rejected" | "withdrawn", note: string) {
    if (FEATURE_FLAGS.USE_CLOUD_FUNCTIONS && decision === "approved") { await postFamilyGraphMutation(familyId, "approveGraphProposal", { proposalId: id, note }); return; }
    if (decision === "rejected" && !note.trim()) throw new Error("Hãy ghi lý do từ chối.");
    if (note.length > 2000) throw new Error("Ghi chú tối đa 2.000 ký tự.");
    const uid=userId(), db=getFirestore(), ref=doc(db, FIRESTORE_PATHS.familyGraphProposal(safeId(familyId), safeId(id)));
    await runTransaction(db, async tx => {
      const current=await tx.get(ref);
      if (!current.exists() || current.data()?.status!=="pending") throw new Error("Đề xuất đã được xử lý.");
      const proposal=current.data() as GraphProposal;
      if (decision === "approved" && proposal.createdByUid === uid) throw new Error("Bạn không thể tự duyệt đề xuất của mình.");
      const now=new Date().toISOString();
      if (decision !== "approved") { tx.update(ref,{status:decision,reviewedByUid:uid,reviewedAt:now,reviewNote:note.trim() || null}); return; }
      // Serialize proposal approvals; on retry re-read the graph before applying.
      const stateRef=doc(db, FIRESTORE_PATHS.familyGraphProposalState(safeId(familyId)));
      const state=await tx.get(stateRef);
      const p=proposal;
      const relationships = decision === "approved" ? await getDocs(collection(db, FIRESTORE_PATHS.familyRelationships(safeId(familyId)))) : null;
      // Existing direct admin mutations do not use the proposal revision. Full
      // graph-wide serialization still belongs in the trusted backend.
      if (decision === "approved" && p.entity === "persons" && p.action === "delete") {
        if ((p.before as FamilyPerson)?.linkedUid || relationships?.docs.some(d => { const r=d.data(); return r.personAId===p.targetId || r.personBId===p.targetId; })) throw new Error("Hãy gỡ liên kết tài khoản và các quan hệ trước khi đề xuất xóa người này.");
        const dependents=await Promise.all([
          getDocs(query(collection(db, FIRESTORE_PATHS.familyPersonTimeline(safeId(familyId), safeId(p.targetId))),limit(1))),
          getDocs(query(collection(db, FIRESTORE_PATHS.familyPersonAlbum(safeId(familyId), safeId(p.targetId))),limit(1))),
          getDocs(query(collection(db, FIRESTORE_PATHS.moments(safeId(familyId))),where("personIds","array-contains",p.targetId),limit(1))),
          getDocs(query(collection(db, FIRESTORE_PATHS.familyEvents(safeId(familyId))),where("personIds","array-contains",p.targetId),limit(1))),
        ]);
        if (dependents.some(s => !s.empty)) throw new Error("Người này còn Timeline, Album, Kỷ niệm hoặc Sự kiện liên quan. Cần xử lý các liên kết trước khi xóa.");
      }
      if (decision === "approved" && p.entity === "relationships" && p.action !== "delete") {
        const r=p.after as FamilyRelationship;
        if (r.type === "parent_child" && wouldCreateParentCycle(r.personAId,r.personBId,(relationships?.docs.map(d => d.data() as FamilyRelationship) || []).filter(x=>x.id!==p.targetId))) throw new Error("Quan hệ này tạo vòng lặp cha/mẹ–con.");
      }

      const target=doc(db, entityDocPath(familyId, proposal.entity, proposal.targetId));
      const targetSnap=await tx.get(target);
      const applied=approveTarget(proposal,targetSnap.exists()?targetSnap.data() as ProposalDocument:null,uid,now);
      if (proposal.entity === "relationships" && applied) {
        const r=applied as FamilyRelationship;
        const endpoints=await Promise.all([tx.get(doc(db,FIRESTORE_PATHS.familyPerson(safeId(familyId),safeId(r.personAId)))),tx.get(doc(db,FIRESTORE_PATHS.familyPerson(safeId(familyId),safeId(r.personBId))))]);
        if (endpoints.some(s=>!s.exists())) throw new Error("Một người trong quan hệ không còn tồn tại.");
      }
      if (applied) tx.set(target,applied); else tx.delete(target);
      tx.set(stateRef,{revision:Number(state.data()?.revision||0)+1,updatedAt:now});
      tx.update(ref,{status:decision,reviewedByUid:uid,reviewedAt:now,reviewNote:note.trim() || null,applied});
    });
  },
};
