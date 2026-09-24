const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");
const { performance } = require("perf_hooks");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-layout-"));
for (const relativePath of [
  "src/constants/appConfiguration.ts",
  "src/components/familyGraph/familyGraphPrototypeData.ts",
  "src/components/familyGraph/familyGraphLiveAdapter.ts",
  "src/components/familyGraph/familyGraphSpatialGrid.ts",
  "src/components/familyGraph/familyGraphViewport.ts",
  "src/components/familyGraph/familyGraphConnectorRouting.ts",
]) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(outRoot, relativePath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const result = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  fs.writeFileSync(targetPath, result.outputText);
}

const { APP_CONFIG_DEFAULTS } = require(path.join(outRoot, "src/constants/appConfiguration.js"));
const { adaptFamilyGraphSnapshot, getFamilyGraphGenerationY } = require(path.join(outRoot, "src/components/familyGraph/familyGraphLiveAdapter.js"));
const { FamilyGraphSpatialGrid } = require(path.join(outRoot, "src/components/familyGraph/familyGraphSpatialGrid.js"));
const {
  buildProgressiveFamilyGraphOrder,
  getFamilyGraphNodeRect,
  getFamilyGraphViewportRect,
  rectsIntersect,
} = require(path.join(outRoot, "src/components/familyGraph/familyGraphViewport.js"));
const {
  buildFamilyGraphConnectorRoutingPlan,
  getFamilyGraphConnectorPort,
} = require(path.join(outRoot, "src/components/familyGraph/familyGraphConnectorRouting.js"));

const familyId = "fam_layout";
const person = (id, name, gender, birthYear) => ({
  id, familyId, linkedUid: null, displayName: name, gender, nickname: null,
  birthDate: null, birthYear, birthPlace: null, deathDate: null, deathYear: null,
  lifeStatus: "living", birthOrder: null, avatarUrl: null, description: null,
  createdByUid: "admin", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
});
const pc = (a, b) => ({
  id: `pc_${a}_${b}`, familyId, type: "parent_child", personAId: a, personBId: b,
  subtype: "biological", partnerStatus: null, startDate: null, endDate: null,
  createdByUid: "admin", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
});
const pt = (a, b) => {
  const [x, y] = [a, b].sort();
  return { id: `pt_${x}_${y}`, familyId, type: "partner", personAId: x, personBId: y,
    subtype: null, partnerStatus: "married", startDate: null, endDate: null,
    createdByUid: "admin", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
};

const persons = [
  person("lan", "Nguyễn Thị Lan", "female", 1930),
  person("don", "Nguyễn Vũ Đôn", "male", 1932),
  person("lien", "Nguyễn Thị Liên", "female", 1956),
  person("bich", "Nguyễn Thị Bích", "female", 1960),
  person("long", "Huỳnh Văn Long", "male", 1950),
  person("nhan", "Huỳnh Thanh Nhân", "male", 1988),
];
const relationships = [
  pt("lan", "don"),
  pc("lan", "lien"), pc("don", "lien"),
  pc("lan", "bich"), pc("don", "bich"),
  pt("bich", "long"),
  pc("bich", "nhan"), pc("long", "nhan"),
];

const visual = adaptFamilyGraphSnapshot({ familyId, persons, relationships }, "nhan");
const byId = new Map(visual.people.map((p) => [p.id, p]));
const bich = byId.get("bich");
const long = byId.get("long");
const lien = byId.get("lien");
assert.ok(bich && long && lien);
assert.strictEqual(bich.generation, long.generation, "partners must share generation");
assert.ok(Math.abs(bich.x - long.x) < 170, "partners must stay adjacent as one visual unit");
const minPair = Math.min(bich.x, long.x);
const maxPair = Math.max(bich.x, long.x);
assert.ok(lien.x < minPair || lien.x > maxPair, "sibling must never be inserted between a couple");

// Phase 6.4 visual-compat spacing is intentionally wider than Phase 6.3,
// while staying compact enough to preserve the Bloom tree language.
const configuredGenerationStep = APP_CONFIG_DEFAULTS.familyGraph.layout.generationStep;
assert.strictEqual(configuredGenerationStep, 216);
assert.strictEqual(getFamilyGraphGenerationY(2) - getFamilyGraphGenerationY(1), configuredGenerationStep);
assert.strictEqual(getFamilyGraphGenerationY(5) - getFamilyGraphGenerationY(4), configuredGenerationStep);
assert.ok(visual.canvasHeight >= getFamilyGraphGenerationY(5) + 124);

// Full-tree progressive order must mount the focus branch first rather than
// arbitrary Firestore/source order.
const progressiveOrder = buildProgressiveFamilyGraphOrder(visual.people, visual.connections, "nhan");
assert.strictEqual(progressiveOrder[0].id, "nhan");
const progressiveDistanceIds = new Set(progressiveOrder.slice(0, 5).map((p) => p.id));
assert.ok(progressiveDistanceIds.has("bich") || progressiveDistanceIds.has("long"), "focus neighbors should mount early");

// Viewport spatial-grid smoke test: only nodes in/near the current camera
// window should be returned, while the complete graph remains in memory.
const viewportGrid = new FamilyGraphSpatialGrid(256);
for (const p of visual.people) {
  viewportGrid.insertNode(p.id, getFamilyGraphNodeRect({
    person: p, nodeSlotWidth: 128, nodeCardWidth: 112, nodeCardHeight: 124, padding: 20,
  }));
}
const focus = byId.get("nhan");
const viewportRect = getFamilyGraphViewportRect({
  camera: { centerX: focus.x + 64, centerY: focus.y + 62, scale: 1 },
  viewport: { width: 320, height: 280 },
  canvasWidth: visual.canvasWidth,
  canvasHeight: visual.canvasHeight,
  overscanScreens: 0.25,
});
const viewportEntries = viewportGrid.queryRect(viewportRect).filter((entry) => entry.kind === "node" && rectsIntersect(entry.rect, viewportRect));
assert.ok(viewportEntries.some((entry) => entry.id === "nhan"), "focus must be indexed in viewport");
assert.ok(viewportEntries.length < visual.people.length, "viewport query should cull distant nodes in this fixture");

// Unassigned Persons remain admin data but must not float on the tree.
const unassigned = adaptFamilyGraphSnapshot({
  familyId,
  persons: [person("assignedA", "Assigned A", "male", 1970), person("assignedB", "Assigned B", "female", 1972), person("loose", "Loose Person", "female", 2000)],
  relationships: [pt("assignedA", "assignedB")],
}, "assignedA");
assert.deepStrictEqual(new Set(unassigned.people.map((p) => p.id)), new Set(["assignedA", "assignedB"]));
assert.ok(!unassigned.people.some((p) => p.id === "loose"), "unassigned Person must stay off the visual tree");

// Dense row: canvas must grow instead of shrinking positions into overlap.
const densePersons = [person("focus", "Focus", "male", 1930), person("partner", "Partner", "female", 1932)];
const denseRelationships = [pt("focus", "partner")];
for (let i = 0; i < 28; i += 1) {
  densePersons.push(person(`p${i}`, `Person ${i}`, i % 2 ? "female" : "male", 1950 + i));
  denseRelationships.push(pc("focus", `p${i}`), pc("partner", `p${i}`));
}
const dense = adaptFamilyGraphSnapshot({ familyId, persons: densePersons, relationships: denseRelationships }, "focus");
const childGeneration = dense.people.find((p) => p.id === "p0").generation;
const row = dense.people.filter((p) => p.generation === childGeneration).sort((a, b) => a.x - b.x);
for (let i = 1; i < row.length; i += 1) {
  assert.ok(row[i].x - row[i - 1].x >= 128, `nodes overlap at ${i}`);
}
assert.ok(dense.canvasWidth > 1020, "dense generation must expand logical canvas width");

// Device regression reproduced from Phase 6.3 test:
// Hoàng Anh is child of Kim Duyên only; Gia Khôi/Gia Minh are children of the
// Thanh Nhân + Kim Hồng couple. The layout must keep those branches visually
// separated so Hoàng Anh cannot look like their sibling.
const branchPersons = [
  person("long2", "Huỳnh Văn Long", "male", 1952),
  person("bich2", "Nguyễn Thị Bích", "female", 1955),
  person("nhan2", "Huỳnh Thanh Nhân", "male", 1986),
  person("duyen2", "Huỳnh Kim Duyên", "female", 1988),
  person("phuoc2", "Huỳnh Thanh Phước Hội", "male", 1990),
  person("hong2", "Nguyễn Thị Kim Hồng", "female", 1988),
  person("hoanganh2", "Nguyễn Hoàng Anh", "male", 2010),
  person("giakhoi2", "Huỳnh Nguyễn Gia Khôi", "male", 2016),
  person("giaminh2", "Huỳnh Nguyễn Gia Minh", "male", 2019),
];
const branchRelationships = [
  pt("long2", "bich2"),
  pc("long2", "nhan2"), pc("bich2", "nhan2"),
  pc("long2", "duyen2"), pc("bich2", "duyen2"),
  pc("long2", "phuoc2"), pc("bich2", "phuoc2"),
  pt("nhan2", "hong2"),
  pc("nhan2", "giakhoi2"), pc("hong2", "giakhoi2"),
  pc("nhan2", "giaminh2"), pc("hong2", "giaminh2"),
  pc("duyen2", "hoanganh2"),
];
const branch = adaptFamilyGraphSnapshot({ familyId, persons: branchPersons, relationships: branchRelationships }, "giakhoi2");
const branchById = new Map(branch.people.map((p) => [p.id, p]));
const center = (id) => branchById.get(id).x + 64;
const hoangAnhDistanceToDuyen = Math.abs(center("hoanganh2") - center("duyen2"));
const nhanHongUnionCenter = (center("nhan2") + center("hong2")) / 2;
const hoangAnhDistanceToNhanHong = Math.abs(center("hoanganh2") - nhanHongUnionCenter);
assert.ok(
  hoangAnhDistanceToDuyen < hoangAnhDistanceToNhanHong,
  "single-parent child must stay visually closer to its actual parent branch than to another couple",
);
const coupleGap = Math.abs(center("nhan2") - center("hong2"));
assert.ok(coupleGap < 180, "Thanh Nhân + Kim Hồng must remain an adjacent couple unit");

const largePersons = [];
const largeRelationships = [];
for (let i = 0; i < 500; i += 1) {
  largePersons.push(person(`n${i}`, `N ${i}`, i % 2 ? "female" : "male", 1900 + (i % 100)));
  if (i > 0) largeRelationships.push(pc(`n${Math.floor((i - 1) / 2)}`, `n${i}`));
}
const start = performance.now();
const large = adaptFamilyGraphSnapshot({ familyId, persons: largePersons, relationships: largeRelationships }, "n0");
const duration = performance.now() - start;
assert.strictEqual(large.people.length, 500);
assert.ok(large.canvasWidth > 1020);


// Connector visual truth: unrelated family groups whose horizontal routes overlap
// must not share the same lane. A far lateral single-parent route should be
// allowed to leave from the side of the parent node.
const routingPeople = [
  { id: "quang", x: 80, y: 20 },
  { id: "otherParent", x: 260, y: 20 },
  { id: "truong", x: 330, y: 220 },
  { id: "minh", x: 650, y: 220 },
].map((p) => ({
  ...p, displayName: p.id, shortName: p.id, gender: "unknown", generation: p.y < 100 ? 1 : 2,
  linkedAccount: false, lifeStatus: "living", relationSummary: [], timeline: [], albumLabels: [],
}));
const routingConnections = [
  { id: "pc_quang_minh", fromId: "quang", toId: "minh", type: "parent_child" },
  { id: "pc_other_truong", fromId: "otherParent", toId: "truong", type: "parent_child" },
];
const routingPlan = buildFamilyGraphConnectorRoutingPlan({
  people: routingPeople,
  connections: routingConnections,
  nodeWidth: 128,
  nodeCardWidth: 112,
  laneGap: 11,
});
assert.notStrictEqual(
  routingPlan.laneOffsetByConnectionId.get("pc_quang_minh"),
  routingPlan.laneOffsetByConnectionId.get("pc_other_truong"),
  "overlapping unrelated family routes must use different connector lanes",
);
assert.ok(
  routingPlan.sideAnchorConnectionIds.has("pc_quang_minh"),
  "far lateral single-parent route should prefer a side anchor",
);

// Center-port invariant. A visually lateral child must not be misclassified as
// a direct connector merely because it still overlaps the parent card body.
// This reproduces the on-device Đinh Văn Anh → Đinh Quốc Trung ambiguity.
const lateralPeople = [
  { id: "anh", x: 300, y: 100 },
  { id: "trung", x: 350, y: 300 },
].map((p) => ({
  ...p, displayName: p.id, shortName: p.id, gender: "unknown", generation: p.y < 200 ? 1 : 2,
  linkedAccount: false, lifeStatus: "living", relationSummary: [], timeline: [], albumLabels: [],
}));
const lateralPlan = buildFamilyGraphConnectorRoutingPlan({
  people: lateralPeople,
  connections: [{ id: "pc_anh_trung", fromId: "anh", toId: "trung", type: "parent_child" }],
  nodeWidth: 128,
  nodeCardWidth: 112,
  laneGap: 11,
});
assert.ok(
  !lateralPlan.directVerticalConnectionIds.has("pc_anh_trung"),
  "lateral child must not get a fake direct stem from an off-center point",
);
assert.ok(
  lateralPlan.sideAnchorConnectionIds.has("pc_anh_trung"),
  "lateral child should leave from the parent side-center port",
);

const alignedPeople = [
  { id: "parent", x: 300, y: 100 },
  { id: "child", x: 300, y: 300 },
].map((p) => ({
  ...p, displayName: p.id, shortName: p.id, gender: "unknown", generation: p.y < 200 ? 1 : 2,
  linkedAccount: false, lifeStatus: "living", relationSummary: [], timeline: [], albumLabels: [],
}));
const alignedPlan = buildFamilyGraphConnectorRoutingPlan({
  people: alignedPeople,
  connections: [{ id: "pc_parent_child", fromId: "parent", toId: "child", type: "parent_child" }],
  nodeWidth: 128,
  nodeCardWidth: 112,
  laneGap: 11,
});
assert.ok(
  alignedPlan.directVerticalConnectionIds.has("pc_parent_child"),
  "exact center-aligned parent/child should keep one clean direct connector",
);
assert.ok(
  !alignedPlan.sideAnchorConnectionIds.has("pc_parent_child"),
  "center-aligned connector must not use a side port",
);

// Port coordinates are immutable edge midpoints. Routing lanes may bend in the
// free space but are never allowed to move these anchors.
const portPerson = { x: 300, y: 100 };
const portArgs = { person: portPerson, nodeSlotWidth: 128, nodeCardWidth: 112, nodeCardHeight: 124, gap: 6 };
assert.deepStrictEqual(getFamilyGraphConnectorPort({ ...portArgs, port: "top" }), { x: 364, y: 94 });
assert.deepStrictEqual(getFamilyGraphConnectorPort({ ...portArgs, port: "bottom" }), { x: 364, y: 230 });
assert.deepStrictEqual(getFamilyGraphConnectorPort({ ...portArgs, port: "left" }), { x: 302, y: 162 });
assert.deepStrictEqual(getFamilyGraphConnectorPort({ ...portArgs, port: "right" }), { x: 426, y: 162 });


// Spatial-grid + semantic-port regression. Quang has two child family groups:
// one aligned branch owns bottom-center; Minh belongs to a different explicit
// parent signature and must therefore leave Quang from a side-center port.
const occupancyPeople = [
  { id: "quang3", x: 200, y: 80 },
  { id: "other3", x: 70, y: 80 },
  { id: "aligned3", x: 200, y: 300 },
  { id: "minh3", x: 590, y: 300 },
].map((p) => ({
  ...p, displayName: p.id, shortName: p.id, gender: "unknown", generation: p.y < 200 ? 1 : 2,
  linkedAccount: false, lifeStatus: "living", relationSummary: [], timeline: [], albumLabels: [],
}));
const occupancyConnections = [
  { id: "pc_quang3_aligned3", fromId: "quang3", toId: "aligned3", type: "parent_child" },
  { id: "pc_other3_aligned3", fromId: "other3", toId: "aligned3", type: "parent_child" },
  { id: "pc_quang3_minh3", fromId: "quang3", toId: "minh3", type: "parent_child" },
];
const occupancyPlan = buildFamilyGraphConnectorRoutingPlan({
  people: occupancyPeople,
  connections: occupancyConnections,
  nodeWidth: 128,
  nodeCardWidth: 112,
  nodeCardHeight: 124,
  canvasWidth: 900,
});
assert.strictEqual(
  occupancyPlan.bottomOwnerFamilyKeyByParentId.get("quang3"),
  occupancyPlan.familyKeyByChildId.get("aligned3"),
  "the family group directly below Quang should own bottom-center",
);
const minhRoute = occupancyPlan.routeByConnectionId.get("pc_quang3_minh3");
assert.ok(minhRoute, "Minh route must be planned");
assert.ok(
  minhRoute.startPort === "left" || minhRoute.startPort === "right",
  "a different family group must not reuse Quang bottom-center",
);
const quangRightPort = getFamilyGraphConnectorPort({
  person: occupancyPeople.find((p) => p.id === "quang3"),
  port: "right", nodeSlotWidth: 128, nodeCardWidth: 112, nodeCardHeight: 124,
});
const quangLeftPort = getFamilyGraphConnectorPort({
  person: occupancyPeople.find((p) => p.id === "quang3"),
  port: "left", nodeSlotWidth: 128, nodeCardWidth: 112, nodeCardHeight: 124,
});
const expectedStart = minhRoute.startPort === "right" ? quangRightPort : quangLeftPort;
assert.deepStrictEqual(minhRoute.points[0], expectedStart, "side route must start exactly at the side midpoint");
assert.strictEqual(
  minhRoute.points[1].y,
  minhRoute.points[0].y,
  "side route must leave the node straight horizontally before any turn",
);
assert.ok(
  minhRoute.crossingCount === 0,
  "collision-aware route should avoid existing unrelated lines when a clean route exists",
);

// Grid smoke benchmark: routing hundreds of explicit edges should stay bounded.
const gridPeople = [];
const gridConnections = [];
for (let i = 0; i < 440; i += 1) {
  gridPeople.push({
    id: `g${i}`, x: (i % 22) * 140 + 40, y: Math.floor(i / 22) * 210 + 20,
    displayName: `G ${i}`, shortName: `G ${i}`, gender: "unknown", generation: Math.floor(i / 22) + 1,
    linkedAccount: false, lifeStatus: "living", relationSummary: [], timeline: [], albumLabels: [],
  });
  if (i >= 22) {
    gridConnections.push({ id: `pc_g${i - 22}_g${i}`, fromId: `g${i - 22}`, toId: `g${i}`, type: "parent_child" });
  }
}
const gridStart = performance.now();
const gridPlan = buildFamilyGraphConnectorRoutingPlan({
  people: gridPeople,
  connections: gridConnections,
  nodeWidth: 128,
  nodeCardWidth: 112,
  nodeCardHeight: 124,
  canvasWidth: 3300,
});
const gridDuration = performance.now() - gridStart;
assert.strictEqual(gridPlan.routeByConnectionId.size, gridConnections.length, "every synthetic edge must receive a route");
assert.ok(gridDuration < 1500, `spatial-grid routing unexpectedly slow: ${gridDuration.toFixed(2)}ms`);

console.log(`Family Graph dense layout tests: PASS (${duration.toFixed(2)}ms adapter; ${gridDuration.toFixed(2)}ms spatial routing)`);
