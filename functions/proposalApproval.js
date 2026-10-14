const { fail, cleanPersonId, cleanRelationshipId, normalizePersonInput, dateOnly, PARENT_SUBTYPES, PARTNER_STATUSES, getParentChildRelationshipId, getPartnerRelationshipId, wouldCreateCycle } = require('./familyGraphCore');
const same = (a,b) => {
  if (a===b) return true;
  if (!a||!b||typeof a!=='object'||typeof b!=='object') return false;
  return Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>k in b&&same(a[k],b[k]));
};
exports.makeApproveGraphProposal = (db, assertAdminInTransaction) => async ({familyId,payload,actorUid}) => {
  const id=cleanPersonId(payload?.proposalId);
  const note=String(payload?.note||'').trim();
  if(note.length>2000)fail('PERSON_INVALID_DATA');
  const root=`families/${familyId}`,ref=db.doc(`${root}/graphProposals/${id}`);
  await db.runTransaction(async tx=>{
    await assertAdminInTransaction(tx,familyId,actorUid);
    const snap=await tx.get(ref);
    const p=snap.data();
    if(!snap.exists||p.status!=='pending')fail('PROPOSAL_ALREADY_REVIEWED',409);
    if(p.familyId!==familyId||!['persons','relationships'].includes(p.entity)||!['create','update','delete'].includes(p.action))fail('PERSON_INVALID_DATA');
    if(p.createdByUid===actorUid)fail('GRAPH_PERMISSION_DENIED',403);
    const targetId=p.entity==='persons'?cleanPersonId(p.targetId):cleanRelationshipId(p.targetId);
    const stateRef=db.doc(`${root}/graphProposalState/current`),state=await tx.get(stateRef);
    const target=db.doc(`${root}/${p.entity}/${targetId}`), current=await tx.get(target);
    if(!same(current.exists?current.data():null,p.before))fail('PROPOSAL_CONFLICT',409);
    if(p.action==='delete'&&p.after!==null)fail('PERSON_INVALID_DATA');
    if(p.action!=='delete'&&(!p.after||p.after.id!==targetId||p.after.familyId!==familyId))fail('PERSON_INVALID_DATA');
    if(p.entity==='persons'){
      if(p.action==='delete'){
        if(p.before.linkedUid)fail('PERSON_ALREADY_LINKED');
        const checks=await Promise.all([
          tx.get(db.collection(`${root}/relationships`).where('personAId','==',targetId).limit(1)),
          tx.get(db.collection(`${root}/relationships`).where('personBId','==',targetId).limit(1)),
          tx.get(db.collection(`${root}/persons/${targetId}/timeline`).limit(1)),
          tx.get(db.collection(`${root}/persons/${targetId}/album`).limit(1)),
          tx.get(db.collection(`${root}/moments`).where('personIds','array-contains',targetId).limit(1)),
          tx.get(db.collection(`${root}/events`).where('personIds','array-contains',targetId).limit(1)),
        ]);
        if(checks.some(s=>!s.empty))fail('PERSON_HAS_RELATIONSHIPS');
      }else{
        normalizePersonInput(p.after);
        if(p.after.linkedUid!==(p.before?.linkedUid??null))fail('PERSON_INVALID_DATA');
      }
    }else if(p.action!=='delete'){
      const r=p.after,a=cleanPersonId(r.personAId),b=cleanPersonId(r.personBId);
      if(a===b)fail('RELATIONSHIP_SELF_REFERENCE');
      const ends=await Promise.all([tx.get(db.doc(`${root}/persons/${a}`)),tx.get(db.doc(`${root}/persons/${b}`))]);
      if(ends.some(s=>!s.exists))fail('PERSON_NOT_FOUND');
      if(p.action==='update'&&(r.type!==p.before.type||a!==p.before.personAId||b!==p.before.personBId))fail('RELATIONSHIP_INVALID');
      if(r.type==='parent_child'){
        if(targetId!==getParentChildRelationshipId(a,b)||!PARENT_SUBTYPES.has(r.subtype)||r.partnerStatus!==null||r.startDate!==null||r.endDate!==null)fail('RELATIONSHIP_INVALID');
        const edges=await tx.get(db.collection(`${root}/relationships`).where('type','==','parent_child'));
        if(wouldCreateCycle(a,b,edges.docs.filter(d=>d.id!==targetId).map(d=>d.data())))fail('RELATIONSHIP_PARENT_CYCLE');
      }else if(r.type==='partner'){
        if(a>=b||targetId!==getPartnerRelationshipId(a,b)||r.subtype!==null||!PARTNER_STATUSES.has(r.partnerStatus))fail('RELATIONSHIP_INVALID');
        const start=dateOnly(r.startDate),end=dateOnly(r.endDate);
        if(start&&end&&end<start)fail('RELATIONSHIP_INVALID');
      }else fail('RELATIONSHIP_INVALID');
    }
    const now=new Date().toISOString();
    const applied=p.action==='delete'?null:{...p.after,updatedAt:now,...(p.action==='create'?{createdByUid:actorUid,createdAt:now}:{createdByUid:p.before.createdByUid,createdAt:p.before.createdAt})};
    if(applied)tx.set(target,applied);else tx.delete(target);
    tx.set(stateRef,{revision:Number(state.data()?.revision||0)+1,updatedAt:now});
    tx.update(ref,{status:'approved',reviewedByUid:actorUid,reviewedAt:now,reviewNote:note||null,applied});
  });
  return {proposalId:id};
};
