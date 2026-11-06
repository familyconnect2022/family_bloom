/**
 * Family Bloom Graph Integrity R3R3D7R2.
 * Pure, synchronous, read-only analyzer. No Firebase, timers, subscriptions or writes.
 * Biological ancestry is never inferred from adoption, step or unknown parenthood.
 * 'block' means a structural/data impossibility in the declared model; unusual
 * real-life history is reported as warning, not silently rejected.
 * This is NOT a trusted server-side authorization gate on the Spark plan.
 */
import type { FamilyGraphSnapshot, FamilyPerson, FamilyRelationship } from '../../types/familyGraph';

export type GraphIssueSeverity = 'block' | 'warning';
export type GraphIntegrityIssue = {
  code: string;
  severity: GraphIssueSeverity;
  message: string;
  personIds: string[];
  relationshipIds: string[];
};
export type GraphIntegrityReport = {
  persons: number;
  relationships: number;
  blocks: number;
  warnings: number;
  issues: GraphIntegrityIssue[];
  truncated: boolean;
};

const pairKey = (a: string, b: string) => a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
const relationKey = (r: FamilyRelationship) => r.type === 'partner'
  ? `partner:${pairKey(r.personAId, r.personBId)}`
  : `parent:${r.personAId}\u0000${r.personBId}`;
const yearOf = (p: FamilyPerson, which: 'birth' | 'death'): number | null => {
  const y = which === 'birth' ? p.birthYear : p.deathYear;
  const d = which === 'birth' ? p.birthDate : p.deathDate;
  return typeof y === 'number' && Number.isFinite(y) ? y : /^\d{4}-/.test(d ?? '') ? Number(d!.slice(0, 4)) : null;
};
const edgeNodes = (edges: FamilyRelationship[]) => {
  const next = new Map<string, Set<string>>();
  for (const r of edges) {
    if (r.type !== 'parent_child' || r.subtype === 'step') continue;
    const set = next.get(r.personAId) ?? new Set<string>();
    set.add(r.personBId); next.set(r.personAId, set);
  }
  return next;
};
function isAncestor(start: string, target: string, children: Map<string, Set<string>>): boolean {
  if (start === target) return true;
  const visited = new Set<string>([start]);
  const queue = [start];
  for (let pos = 0; pos < queue.length; pos += 1) {
    for (const child of children.get(queue[pos]) ?? []) {
      if (child === target) return true;
      if (!visited.has(child)) { visited.add(child); queue.push(child); }
    }
  }
  return false;
}

/** Read-only full scan, only when developer explicitly triggers it. O(V+E) core; partner checks bounded. */
export function auditFamilyGraph(snapshot: FamilyGraphSnapshot, limit = 150): GraphIntegrityReport {
  const people = new Map(snapshot.persons.map(p => [p.id, p]));
  const issues: GraphIntegrityIssue[] = [];
  const emitted = new Set<string>();
  let blocks = 0, warnings = 0;
  const add = (severity: GraphIssueSeverity, code: string, message: string, personIds: string[] = [], relationshipIds: string[] = []) => {
    const fingerprint = `${code}:${[...personIds].sort().join('|')}:${[...relationshipIds].sort().join('|')}`;
    if (emitted.has(fingerprint)) return;
    emitted.add(fingerprint);
    if (severity === 'block') blocks += 1; else warnings += 1;
    if (issues.length < limit) issues.push({severity, code, message, personIds, relationshipIds});
  };
  const linkedUid = new Map<string, string>();
  for (const p of snapshot.persons) {
    if (p.familyId !== snapshot.familyId) add('block', 'G07', 'Hồ sơ thuộc nhà khác.', [p.id]);
    const uid = p.linkedUid;
    if (uid) {
      const previous = linkedUid.get(uid);
      if (previous && previous !== p.id) add('block', 'G11', 'Một UID đang được gắn vào nhiều hồ sơ trong cùng nhà.', [previous, p.id]);
      else linkedUid.set(uid, p.id);
    }
    const birth = yearOf(p, 'birth'), death = yearOf(p, 'death');
    if (birth !== null && death !== null && death < birth) add('block', 'G08', 'Năm mất sớm hơn năm sinh.', [p.id]);
    if (p.birthDate && p.deathDate && p.deathDate < p.birthDate) add('block','G08','Ngày mất sớm hơn ngày sinh.',[p.id]);
    if (p.lifeStatus === 'living' && death !== null) add('block', 'G08', 'Hồ sơ đang sống nhưng đã có năm mất.', [p.id]);
    if (birth !== null && death !== null && death - birth > 120) add('warning', 'W17', 'Tuổi thọ trên 120 năm, cần đối chiếu nguồn.', [p.id]);
  }
  const seen = new Map<string,string>();
  const organicParents = new Map<string,Set<string>>();
  const bioChildren = new Map<string,Set<string>>();
  const socialChildren = edgeNodes(snapshot.relationships);
  const partnerEdges: FamilyRelationship[] = [];
  for (const r of snapshot.relationships) {
    const a = people.get(r.personAId), b = people.get(r.personBId);
    if (!a || !b || r.familyId !== snapshot.familyId) {
      add('block','G12','Liên kết tham chiếu hồ sơ không tồn tại hoặc khác nhà.', [r.personAId,r.personBId], [r.id]);
      continue;
    }
    if (a.id === b.id) add('block','G01','Một người không thể tự nối quan hệ với chính mình.',[a.id],[r.id]);
    const k=relationKey(r), old=seen.get(k);
    if (old && old !== r.id) add('block','G09','Có hai bản ghi cho cùng một liên kết.',[a.id,b.id],[old,r.id]);
    else seen.set(k,r.id);
    if (r.type === 'partner') {
      partnerEdges.push(r);
      if (r.startDate && r.endDate && r.endDate < r.startDate) add('block','G08','Ngày kết thúc quan hệ trước ngày bắt đầu.',[a.id,b.id],[r.id]);
    } else if (r.type === 'parent_child' && r.subtype === 'biological') {
      const list=organicParents.get(b.id) ?? new Set<string>();
      list.add(a.id); organicParents.set(b.id,list);
      const kids=bioChildren.get(a.id) ?? new Set<string>();kids.add(b.id);bioChildren.set(a.id,kids);
      const by=yearOf(b,'birth'),ay=yearOf(a,'birth'),dy=yearOf(a,'death');
      if (ay !== null && by !== null) {
        if (ay >= by) add('block','G05','Cha/mẹ ruột có năm sinh bằng hoặc muộn hơn người con.',[a.id,b.id],[r.id]);
        else if (by-ay < 13) add('warning','W01','Cha/mẹ ruột sinh con khi còn rất trẻ; hãy kiểm tra năm sinh.',[a.id,b.id],[r.id]);
        else if (by-ay > 65) add('warning','W02','Chênh lệch tuổi cha/mẹ ruột – con trên 65 năm.',[a.id,b.id],[r.id]);
      }
      if (by !== null && dy !== null && by-dy > 2) add('warning','W07','Con sinh hơn hai năm sau khi cha/mẹ ruột qua đời; cần kiểm tra ngày hoặc trường hợp đặc biệt.',[a.id,b.id],[r.id]);
    }
  }
  for (const [id, parents] of organicParents) {
    if (parents.size > 2) add('warning','W03','Có hơn hai hồ sơ được khai là cha/mẹ ruột; cần xác minh vai trò sinh học và thông tin lịch sử.',[id,...parents]);
  }
  // Kahn's algorithm: detects ancestry cycles without an O(V*E) all-pairs scan.
  const indegree = new Map<string,number>();
  for (const id of people.keys()) indegree.set(id,0);
  for (const [a,children] of socialChildren) for (const b of children) {
    if (people.has(a) && people.has(b)) indegree.set(b,(indegree.get(b) ?? 0)+1);
  }
  const ready = [...indegree].filter(([,d])=>d===0).map(([id])=>id);
  let scanned=0;
  for (let pos=0;pos<ready.length;pos+=1) {
    const id=ready[pos];scanned++;
    for (const b of socialChildren.get(id) ?? []) {
      const n=(indegree.get(b) ?? 0)-1;
      indegree.set(b,n);
      if (n===0) ready.push(b);
    }
  }
  if (scanned < people.size) add('block','G03','Có vòng lặp cha/mẹ–con trong quan hệ huyết thống hoặc nhận nuôi (đã loại quan hệ kế).',[...indegree].filter(([,d])=>d>0).slice(0,8).map(([id])=>id));
  for (const r of partnerEdges) {
    const {personAId:a,personBId:b}=r;
    if (isAncestor(a,b,bioChildren) || isAncestor(b,a,bioChildren)) {
      add('warning','W10','Hai người vừa có quan hệ bạn đời vừa là tổ tiên/hậu duệ sinh học.',[a,b],[r.id]);
    } else {
      const ap=organicParents.get(a), bp=organicParents.get(b);
      if (ap && bp && [...ap].some(id=>bp.has(id))) add('warning','W11','Hai người bạn đời có chung ít nhất một cha/mẹ ruột được ghi nhận.',[a,b],[r.id]);
    }
  }
  return {persons:snapshot.persons.length, relationships:snapshot.relationships.length,blocks,warnings,issues,truncated:issues.length < blocks+warnings};
}

/**
 * Fast, targeted write preview using the screen's existing snapshot.
 * No full audit, no Firestore reads and no per-render subscription. Each added
 * edge is checked against earlier additions in the same batch.
 */
export function checkGraphRelationshipCandidates(snapshot: FamilyGraphSnapshot, additions: FamilyRelationship[]): GraphIntegrityIssue[] {
  if (!additions.length) return [];
  const people = new Map(snapshot.persons.map(p=>[p.id,p]));
  const current = [...snapshot.relationships];
  const next = edgeNodes(current);
  const biological = edgeNodes(current.filter(r=>r.subtype==='biological'));
  const parentCounts = new Map<string,Set<string>>();
  for (const r of current) if(r.type==='parent_child' && r.subtype==='biological') {
    const parents=parentCounts.get(r.personBId) ?? new Set<string>();
    parents.add(r.personAId);parentCounts.set(r.personBId,parents);
  }
  const issues:GraphIntegrityIssue[]=[];
  const emitted = new Set<string>();
  const add=(severity:GraphIssueSeverity,code:string,message:string,a:string,b:string,id:string)=>{
    const key=`${code}:${a}:${b}`;
    if (emitted.has(key)) return;emitted.add(key);
    issues.push({severity,code,message,personIds:[a,b],relationshipIds:[id]});
  };
  for (const r of additions) {
    const a=r.personAId,b=r.personBId;
    const parent=people.get(a),child=people.get(b);
    if (!parent || !child || r.familyId!==snapshot.familyId) {
      add('block','G12','Không tìm thấy người được chọn trong gia phả hiện tại.',a,b,r.id);continue;
    }
    if (a===b) { add('block','G01','Không được nối một người với chính mình.',a,b,r.id);continue; }
    if (current.some(old=>relationKey(old)===relationKey(r))) {
      add('block','G09','Quan hệ đã tồn tại. Hãy sửa bản ghi cũ nếu cần thay loại.',a,b,r.id);continue;
    }
    if (r.type==='parent_child') {
      if (r.subtype!=='step' && isAncestor(b,a,next)) {
        add('block','G03','Liên kết này tạo vòng lặp tổ tiên – con cháu.',a,b,r.id);
      }
      if (r.subtype==='biological') {
        const py=yearOf(parent,'birth'),cy=yearOf(child,'birth');
        if (py!==null && cy!==null) {
          if(py>=cy) add('block','G05','Cha/mẹ ruột có năm sinh bằng hoặc muộn hơn người con.',a,b,r.id);
          else if (cy-py<13) add('warning','W01','Chênh lệch tuổi dưới 13 năm; cần kiểm tra.',a,b,r.id);
          else if (cy-py>65) add('warning','W02','Chênh lệch tuổi trên 65 năm; cần kiểm tra.',a,b,r.id);
        }
        const death=yearOf(parent,'death');
        if (death!==null && cy!==null && cy-death>2) add('warning','W07','Con sinh hơn hai năm sau khi cha/mẹ ruột mất; cần kiểm tra.',a,b,r.id);
        const parents=parentCounts.get(b)??new Set<string>();
        parents.add(a);parentCounts.set(b,parents);
        if (parents.size>2) add('warning','W03','Có hơn hai cha/mẹ sinh học được ghi nhận; hãy xác minh.',a,b,r.id);
        const kids=biological.get(a)??new Set<string>();kids.add(b);biological.set(a,kids);
      }
      if (r.subtype!=='step') {const kids=next.get(a)??new Set<string>();kids.add(b);next.set(a,kids);}
    } else {
      if (isAncestor(a,b,biological)||isAncestor(b,a,biological)) add('warning','W10','Hai người bạn đời cũng có quan hệ tổ tiên/hậu duệ huyết thống.',a,b,r.id);
      else {
        const parentsA=parentCounts.get(a),parentsB=parentCounts.get(b);
        if (parentsA && parentsB && [...parentsA].some(id=>parentsB.has(id))) {
          add('warning','W11','Hai người bạn đời có chung cha/mẹ ruột trong cây gia phả.',a,b,r.id);
        }
      }
    }
    current.push(r);
  }
  return issues;
}
