const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const REGION = "asia-southeast1";
const ALLOWED_ROLES = new Set(["owner", "admin"]);
const {
  PARENT_SUBTYPES,
  PARTNER_STATUSES,
  fail,
  text,
  requiredText,
  cleanFamilyId,
  cleanPersonId,
  cleanUid,
  cleanRelationshipId,
  dateOnly,
  getPartnerRelationshipId,
  getParentChildRelationshipId,
  normalizePersonInput,
  wouldCreateCycle,
} = require("./familyGraphCore");

const getBearer = (req) => {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

const requireAdmin = async (req, familyId) => {
  const token = getBearer(req);
  if (!token) fail("GRAPH_PERMISSION_DENIED", 401);
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    fail("GRAPH_PERMISSION_DENIED", 401);
  }
  const [family, member] = await Promise.all([
    db.doc(`families/${familyId}`).get(),
    db.doc(`families/${familyId}/members/${decoded.uid}`).get(),
  ]);
  const isOwner = family.exists && family.data()?.ownerId === decoded.uid;
  const isAdmin = member.exists && ALLOWED_ROLES.has(member.data()?.role);
  if (!isOwner && !isAdmin) fail("GRAPH_PERMISSION_DENIED", 403);
  return decoded.uid;
};

const requireFamilyMember = async (req, familyId) => {
  const token = getBearer(req);
  if (!token) fail("GRAPH_PERMISSION_DENIED", 401);
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    fail("GRAPH_PERMISSION_DENIED", 401);
  }
  const [family, member] = await Promise.all([
    db.doc(`families/${familyId}`).get(),
    db.doc(`families/${familyId}/members/${decoded.uid}`).get(),
  ]);
  const isOwner = family.exists && family.data()?.ownerId === decoded.uid;
  if (!isOwner && !member.exists) fail("GRAPH_PERMISSION_DENIED", 403);
  return decoded.uid;
};


const assertAdminInTransaction = async (tx, familyId, actorUid) => {
  const familyRef = db.doc(`families/${familyId}`);
  const memberRef = db.doc(`families/${familyId}/members/${actorUid}`);
  const [family, member] = await Promise.all([tx.get(familyRef), tx.get(memberRef)]);
  const isOwner = family.exists && family.data()?.ownerId === actorUid;
  const isAdmin = member.exists && ALLOWED_ROLES.has(member.data()?.role);
  if (!isOwner && !isAdmin) fail("GRAPH_PERMISSION_DENIED", 403);
};

const assertMemberInTransaction = async (tx, familyId, actorUid) => {
  const familyRef = db.doc(`families/${familyId}`);
  const memberRef = db.doc(`families/${familyId}/members/${actorUid}`);
  const [family, member] = await Promise.all([tx.get(familyRef), tx.get(memberRef)]);
  const isOwner = family.exists && family.data()?.ownerId === actorUid;
  if (!isOwner && !member.exists) fail("GRAPH_PERMISSION_DENIED", 403);
};


const validateLinkedMember = async (tx, familyId, linkedUid) => {
  if (!linkedUid) return;
  const memberRef = db.doc(`families/${familyId}/members/${linkedUid}`);
  const member = await tx.get(memberRef);
  if (!member.exists) fail("LINKED_UID_NOT_MEMBER");
};

const collectParentEdges = async (tx, familyId) => {
  const query = db.collection(`families/${familyId}/relationships`).where("type", "==", "parent_child");
  const snap = await tx.get(query);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const mutationHandlers = {
  async createPerson({ familyId, payload, actorUid }) {
    const personData = normalizePersonInput(payload);
    const linkedUid = payload?.linkedUid ? cleanUid(payload.linkedUid) : null;
    const personRef = db.collection(`families/${familyId}/persons`).doc();
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      let linkRef = null;
      if (linkedUid) {
        await validateLinkedMember(tx, familyId, linkedUid);
        linkRef = db.doc(`families/${familyId}/personLinks/${linkedUid}`);
        const existingLink = await tx.get(linkRef);
        if (existingLink.exists) fail("UID_ALREADY_LINKED");
      }
      tx.create(personRef, {
        id: personRef.id,
        familyId,
        linkedUid: linkedUid || null,
        ...personData,
        createdByUid: actorUid,
        createdAt: now,
        updatedAt: now,
      });
      if (linkedUid && linkRef) {
        tx.create(linkRef, {
          familyId,
          uid: linkedUid,
          personId: personRef.id,
          createdByUid: actorUid,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    return { personId: personRef.id };
  },

  async updatePerson({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const current = await tx.get(personRef);
      if (!current.exists) fail("PERSON_NOT_FOUND", 404);
      const next = normalizePersonInput({ ...current.data(), ...(payload?.patch || {}) });
      tx.update(personRef, { ...next, updatedAt: new Date().toISOString() });
    });
    return { personId };
  },

  async setPersonAvatar({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const avatarUrl = text(payload?.avatarUrl, 1200);
    const mediaAssetId = text(payload?.mediaAssetId, 180);
    if (avatarUrl && !mediaAssetId) fail("PERSON_INVALID_DATA");
    if (avatarUrl && !/^https:\/\//i.test(avatarUrl)) fail("PERSON_INVALID_DATA");

    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const person = await tx.get(personRef);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);

      if (!avatarUrl) {
        tx.update(personRef, { avatarUrl: null, updatedAt: now });
        return;
      }

      const assetRef = db.doc(`media_assets/${mediaAssetId}`);
      const asset = await tx.get(assetRef);
      const data = asset.data();
      if (!asset.exists
        || data?.ownerUid !== actorUid
        || data?.familyId !== familyId
        || data?.entityType !== "person"
        || data?.entityId !== personId
        || data?.purpose !== "avatar"
        || data?.status !== "uploaded"
        || data?.secureUrl !== avatarUrl) {
        fail("PERSON_INVALID_DATA");
      }

      tx.update(personRef, { avatarUrl, updatedAt: now });
      tx.update(assetRef, { status: "attached", updatedAt: now });
    });
    return { personId };
  },

  async deletePerson({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const person = await tx.get(personRef);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      if (person.data()?.linkedUid) fail("PERSON_ALREADY_LINKED");
      const relQuery = db.collection(`families/${familyId}/relationships`).where("personAId", "==", personId);
      const relQueryB = db.collection(`families/${familyId}/relationships`).where("personBId", "==", personId);
      const [a, b] = await Promise.all([tx.get(relQuery), tx.get(relQueryB)]);
      if (!a.empty || !b.empty) fail("PERSON_HAS_RELATIONSHIPS");
      tx.delete(personRef);
    });
    return { personId };
  },

  async deletePersonCascade({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const relationships = db.collection(`families/${familyId}/relationships`);
    const timelineQuery = db.collection(`families/${familyId}/persons/${personId}/timeline`).limit(1);
    const albumQuery = db.collection(`families/${familyId}/persons/${personId}/album`).limit(1);
    const deletedRelationshipIds = [];

    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const person = await tx.get(personRef);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      if (person.data()?.linkedUid) fail("PERSON_ALREADY_LINKED");

      const [a, b, timeline, album] = await Promise.all([
        tx.get(relationships.where("personAId", "==", personId)),
        tx.get(relationships.where("personBId", "==", personId)),
        tx.get(timelineQuery),
        tx.get(albumQuery),
      ]);
      if (!timeline.empty || !album.empty) fail("PERSON_HAS_CONTENT");

      const relationDocs = new Map();
      a.docs.forEach((item) => relationDocs.set(item.id, item.ref));
      b.docs.forEach((item) => relationDocs.set(item.id, item.ref));
      relationDocs.forEach((ref, relationshipId) => {
        deletedRelationshipIds.push(relationshipId);
        tx.delete(ref);
      });
      tx.delete(personRef);
    });
    return { personId, deletedRelationshipIds };
  },

  async linkPerson({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const uid = cleanUid(payload?.uid);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const linkRef = db.doc(`families/${familyId}/personLinks/${uid}`);
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const [person, link] = await Promise.all([tx.get(personRef), tx.get(linkRef)]);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      if (person.data()?.linkedUid && person.data()?.linkedUid !== uid) fail("PERSON_ALREADY_LINKED");
      if (link.exists && link.data()?.personId !== personId) fail("UID_ALREADY_LINKED");
      await validateLinkedMember(tx, familyId, uid);
      tx.update(personRef, { linkedUid: uid, updatedAt: now });
      tx.set(linkRef, { familyId, uid, personId, createdByUid: actorUid, createdAt: link.data()?.createdAt || now, updatedAt: now }, { merge: true });
    });
    return { personId, uid };
  },

  async unlinkPerson({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const person = await tx.get(personRef);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      const uid = person.data()?.linkedUid || null;
      let linkRef = null;
      let link = null;
      if (uid) {
        linkRef = db.doc(`families/${familyId}/personLinks/${cleanUid(uid)}`);
        link = await tx.get(linkRef);
        if (link.exists && link.data()?.personId !== personId) fail("PERSON_INVALID_DATA");
      }
      tx.update(personRef, { linkedUid: null, updatedAt: new Date().toISOString() });
      if (linkRef && link?.exists) tx.delete(linkRef);
    });
    return { personId };
  },

  async createRelationship({ familyId, payload, actorUid }) {
    const type = requiredText(payload?.type, "RELATIONSHIP_INVALID", 30);
    const now = new Date().toISOString();
    if (type === "parent_child") {
      const parentId = cleanPersonId(payload?.parentId);
      const childId = cleanPersonId(payload?.childId);
      const subtype = text(payload?.subtype, 30) || "unknown";
      if (!PARENT_SUBTYPES.has(subtype)) fail("RELATIONSHIP_INVALID");
      const relationshipId = getParentChildRelationshipId(parentId, childId);
      const relRef = db.doc(`families/${familyId}/relationships/${relationshipId}`);
      const parentRef = db.doc(`families/${familyId}/persons/${parentId}`);
      const childRef = db.doc(`families/${familyId}/persons/${childId}`);
      await db.runTransaction(async (tx) => {
        await assertAdminInTransaction(tx, familyId, actorUid);
        const [parent, child, existing, edges] = await Promise.all([
          tx.get(parentRef), tx.get(childRef), tx.get(relRef), collectParentEdges(tx, familyId),
        ]);
        if (!parent.exists || !child.exists) fail("PERSON_NOT_FOUND", 404);
        if (existing.exists) fail("RELATIONSHIP_DUPLICATE");
        if (wouldCreateCycle(parentId, childId, edges)) fail("RELATIONSHIP_PARENT_CYCLE");
        tx.create(relRef, {
          id: relationshipId, familyId, type: "parent_child", personAId: parentId, personBId: childId,
          subtype, partnerStatus: null, startDate: null, endDate: null,
          createdByUid: actorUid, createdAt: now, updatedAt: now,
        });
      });
      return { relationshipId };
    }
    if (type === "partner") {
      const rawA = cleanPersonId(payload?.personAId);
      const rawB = cleanPersonId(payload?.personBId);
      const [personAId, personBId] = [rawA, rawB].sort();
      const partnerStatus = text(payload?.partnerStatus, 30) || "partner";
      if (!PARTNER_STATUSES.has(partnerStatus)) fail("RELATIONSHIP_INVALID");
      const startDate = dateOnly(payload?.startDate, "RELATIONSHIP_INVALID");
      const endDate = dateOnly(payload?.endDate, "RELATIONSHIP_INVALID");
      if (startDate && endDate && endDate < startDate) fail("RELATIONSHIP_INVALID");
      const relationshipId = getPartnerRelationshipId(personAId, personBId);
      const relRef = db.doc(`families/${familyId}/relationships/${relationshipId}`);
      await db.runTransaction(async (tx) => {
        await assertAdminInTransaction(tx, familyId, actorUid);
        const [a, b, existing] = await Promise.all([
          tx.get(db.doc(`families/${familyId}/persons/${personAId}`)),
          tx.get(db.doc(`families/${familyId}/persons/${personBId}`)),
          tx.get(relRef),
        ]);
        if (!a.exists || !b.exists) fail("PERSON_NOT_FOUND", 404);
        if (existing.exists) fail("RELATIONSHIP_DUPLICATE");
        tx.create(relRef, {
          id: relationshipId, familyId, type: "partner", personAId, personBId,
          subtype: null, partnerStatus, startDate, endDate,
          createdByUid: actorUid, createdAt: now, updatedAt: now,
        });
      });
      return { relationshipId };
    }
    fail("RELATIONSHIP_INVALID");
  },

  // DG-11: UI batch composer, canonical storage remains one parent_child doc
  // per parent × child pair. The whole mutation is validated and committed in
  // one trusted transaction when Cloud mode is enabled in the future.
  async createParentChildRelationshipsBatch({ familyId, payload, actorUid }) {
    const rawParentIds = Array.isArray(payload?.parentIds) ? payload.parentIds : [];
    const rawChildIds = Array.isArray(payload?.childIds) ? payload.childIds : [];
    const parentIds = [...new Set(rawParentIds.map(cleanPersonId))];
    const childIds = [...new Set(rawChildIds.map(cleanPersonId))];
    const subtype = text(payload?.subtype, 30) || "unknown";
    if (!parentIds.length || !childIds.length || !PARENT_SUBTYPES.has(subtype)) fail("RELATIONSHIP_INVALID");

    const now = new Date().toISOString();

    const result = await db.runTransaction(async (tx) => {
      const createdRelationshipIds = [];
      const existingRelationshipIds = [];
      await assertAdminInTransaction(tx, familyId, actorUid);
      const existingEdges = await collectParentEdges(tx, familyId);
      const existingById = new Map(existingEdges.map((edge) => [edge.id, edge]));
      const workingEdges = [...existingEdges];
      const planned = [];

      for (const parentId of parentIds) {
        for (const childId of childIds) {
          if (parentId === childId) fail("RELATIONSHIP_SELF_REFERENCE");
          const relationshipId = getParentChildRelationshipId(parentId, childId);
          const existing = existingById.get(relationshipId);
          if (existing) {
            if ((existing.subtype || "unknown") !== subtype) fail("RELATIONSHIP_DUPLICATE");
            existingRelationshipIds.push(relationshipId);
            continue;
          }
          if (wouldCreateCycle(parentId, childId, workingEdges)) fail("RELATIONSHIP_PARENT_CYCLE");
          const edge = {
            id: relationshipId,
            familyId,
            type: "parent_child",
            personAId: parentId,
            personBId: childId,
            subtype,
            partnerStatus: null,
            startDate: null,
            endDate: null,
            createdByUid: actorUid,
            createdAt: now,
            updatedAt: now,
          };
          planned.push(edge);
          workingEdges.push(edge);
        }
      }

      const personIds = [...new Set([...parentIds, ...childIds])];
      const personSnaps = await Promise.all(personIds.map((personId) => tx.get(db.doc(`families/${familyId}/persons/${personId}`))));
      if (personSnaps.some((snap) => !snap.exists)) fail("PERSON_NOT_FOUND", 404);

      planned.forEach((edge) => {
        tx.create(db.doc(`families/${familyId}/relationships/${edge.id}`), edge);
        createdRelationshipIds.push(edge.id);
      });
      return { createdRelationshipIds, existingRelationshipIds };
    });

    return result;
  },

  async updatePartnerRelationship({ familyId, payload, actorUid }) {
    const relationshipId = cleanRelationshipId(payload?.relationshipId);
    const relRef = db.doc(`families/${familyId}/relationships/${relationshipId}`);
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const current = await tx.get(relRef);
      if (!current.exists) fail("RELATIONSHIP_NOT_FOUND", 404);
      if (current.data()?.type !== "partner") fail("RELATIONSHIP_INVALID");
      const partnerStatus = text(payload?.partnerStatus, 30) || current.data()?.partnerStatus || "partner";
      if (!PARTNER_STATUSES.has(partnerStatus)) fail("RELATIONSHIP_INVALID");
      const startDate = payload?.startDate === undefined ? current.data()?.startDate || null : dateOnly(payload.startDate, "RELATIONSHIP_INVALID");
      const endDate = payload?.endDate === undefined ? current.data()?.endDate || null : dateOnly(payload.endDate, "RELATIONSHIP_INVALID");
      if (startDate && endDate && endDate < startDate) fail("RELATIONSHIP_INVALID");
      tx.update(relRef, { partnerStatus, startDate, endDate, updatedAt: new Date().toISOString() });
    });
    return { relationshipId };
  },


  async createTimelineEntry({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const entryId = cleanPersonId(payload?.entryId);
    const date = dateOnly(payload?.date, "PERSON_INVALID_DATA");
    if (!date) fail("PERSON_INVALID_DATA");
    const title = requiredText(payload?.title, "PERSON_INVALID_DATA", 160);
    const description = text(payload?.description, 4000);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const entryRef = db.doc(`families/${familyId}/persons/${personId}/timeline/${entryId}`);
    const now = new Date().toISOString();
    const entry = {
      id: entryId,
      familyId,
      personId,
      date,
      title,
      description: description || null,
      createdByUid: actorUid,
      createdAt: now,
      updatedAt: now,
    };
    await db.runTransaction(async (tx) => {
      await assertMemberInTransaction(tx, familyId, actorUid);
      const [person, existing] = await Promise.all([tx.get(personRef), tx.get(entryRef)]);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      if (existing.exists) fail("PERSON_INVALID_DATA");
      tx.create(entryRef, entry);
    });
    return { entry };
  },

  async updateTimelineEntry({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const entryId = cleanPersonId(payload?.entryId);
    const date = dateOnly(payload?.date, "PERSON_INVALID_DATA");
    if (!date) fail("PERSON_INVALID_DATA");
    const title = requiredText(payload?.title, "PERSON_INVALID_DATA", 160);
    const description = text(payload?.description, 4000);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const entryRef = db.doc(`families/${familyId}/persons/${personId}/timeline/${entryId}`);
    await db.runTransaction(async (tx) => {
      await assertMemberInTransaction(tx, familyId, actorUid);
      const [person, entry] = await Promise.all([tx.get(personRef), tx.get(entryRef)]);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      if (!entry.exists) fail("PERSON_INVALID_DATA", 404);
      if (entry.data()?.createdByUid !== actorUid) fail("GRAPH_PERMISSION_DENIED", 403);
      tx.update(entryRef, {
        date,
        title,
        description: description || null,
        updatedAt: new Date().toISOString(),
      });
    });
    return { entryId };
  },

  async deleteTimelineEntry({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const entryId = cleanPersonId(payload?.entryId);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const entryRef = db.doc(`families/${familyId}/persons/${personId}/timeline/${entryId}`);
    await db.runTransaction(async (tx) => {
      await assertMemberInTransaction(tx, familyId, actorUid);
      const [person, entry] = await Promise.all([tx.get(personRef), tx.get(entryRef)]);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      if (!entry.exists) fail("PERSON_INVALID_DATA", 404);
      if (entry.data()?.createdByUid !== actorUid) {
        await assertAdminInTransaction(tx, familyId, actorUid);
      }
      tx.delete(entryRef);
    });
    return { entryId };
  },

  async attachPersonAlbumAsset({ familyId, payload, actorUid }) {
    const personId = cleanPersonId(payload?.personId);
    const mediaAssetId = cleanPersonId(payload?.mediaAssetId);
    const caption = text(payload?.caption, 4000);
    const personRef = db.doc(`families/${familyId}/persons/${personId}`);
    const assetRef = db.doc(`media_assets/${mediaAssetId}`);
    const albumRef = db.doc(`families/${familyId}/persons/${personId}/album/${mediaAssetId}`);
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const [person, asset, existingAlbum] = await Promise.all([
        tx.get(personRef),
        tx.get(assetRef),
        tx.get(albumRef),
      ]);
      if (!person.exists) fail("PERSON_NOT_FOUND", 404);
      const data = asset.data();
      if (existingAlbum.exists && data?.status === "attached") return;
      if (!asset.exists
        || data?.ownerUid !== actorUid
        || data?.familyId !== familyId
        || data?.entityType !== "person"
        || data?.entityId !== personId
        || data?.purpose !== "album"
        || data?.status !== "uploaded"
        || !data?.secureUrl) {
        fail("PERSON_INVALID_DATA");
      }
      tx.set(albumRef, {
        id: mediaAssetId,
        familyId,
        personId,
        mediaAssetId,
        caption: caption || null,
        createdByUid: actorUid,
        createdAt: now,
      });
      tx.update(assetRef, { status: "attached", updatedAt: now });
    });
    return { albumId: mediaAssetId };
  },
  async deleteRelationship({ familyId, payload, actorUid }) {
    const relationshipId = cleanRelationshipId(payload?.relationshipId);
    const ref = db.doc(`families/${familyId}/relationships/${relationshipId}`);
    await db.runTransaction(async (tx) => {
      await assertAdminInTransaction(tx, familyId, actorUid);
      const current = await tx.get(ref);
      if (!current.exists) fail("RELATIONSHIP_NOT_FOUND", 404);
      tx.delete(ref);
    });
    return { relationshipId };
  },
};

exports.familyGraphMutation = onRequest({ region: REGION, cors: true, timeoutSeconds: 60, memory: "256MiB" }, async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, code: "METHOD_NOT_ALLOWED" });
    return;
  }
  try {
    const action = requiredText(req.body?.action, "PERSON_INVALID_DATA", 80);
    const familyId = cleanFamilyId(req.body?.familyId);
    const handler = mutationHandlers[action];
    if (!handler) fail("PERSON_INVALID_DATA");
    const memberTimelineActions = new Set(["createTimelineEntry", "updateTimelineEntry", "deleteTimelineEntry"]);
    const actorUid = memberTimelineActions.has(action)
      ? await requireFamilyMember(req, familyId)
      : await requireAdmin(req, familyId);
    const result = await handler({ familyId, payload: req.body?.payload || {}, actorUid });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    const code = error?.code || "UNKNOWN";
    const status = Number(error?.status) || 400;
    console.error("familyGraphMutation", code, error);
    res.status(status).json({ ok: false, code, message: String(error?.message || code) });
  }
});
