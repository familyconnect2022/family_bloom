const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const ts = require("typescript");
const { performance } = require("perf_hooks");

const root = path.resolve(__dirname, "..");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "family-bloom-phase64-"));
for (const relativePath of [
  "src/constants/appConfiguration.ts",
  "src/components/familyGraph/familyGraphPrototypeData.ts",
  "src/components/familyGraph/familyGraphSpatialGrid.ts",
  "src/components/familyGraph/familyGraphViewport.ts",
]) {
  const sourcePath = path.join(root, relativePath);
  const targetPath = path.join(outRoot, relativePath.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const result = ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("\n"));
  fs.writeFileSync(targetPath, result.outputText);
}

const { APP_CONFIG_DEFAULTS } = require(path.join(outRoot, "src/constants/appConfiguration.js"));
const { FamilyGraphSpatialGrid } = require(path.join(outRoot, "src/components/familyGraph/familyGraphSpatialGrid.js"));
const {
  buildProgressiveFamilyGraphOrder,
  getFamilyGraphNodeRect,
  getFamilyGraphViewportRect,
  rectsIntersect,
} = require(path.join(outRoot, "src/components/familyGraph/familyGraphViewport.js"));

const people = [];
const connections = [];
const columns = 25;
const generationStep = APP_CONFIG_DEFAULTS.familyGraph.layout.generationStep;
for (let i = 0; i < 500; i += 1) {
  const row = Math.floor(i / columns);
  const col = i % columns;
  people.push({
    id: `p${i}`,
    displayName: `Person ${String(i).padStart(3, "0")}`,
    shortName: `P${i}`,
    gender: "unknown",
    generation: row + 1,
    linkedAccount: false,
    lifeStatus: "living",
    relationSummary: [], timeline: [], albumLabels: [],
    x: col * 148 + 80,
    y: 24 + row * generationStep,
  });
  if (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    connections.push({ id: `pc_p${parent}_p${i}`, fromId: `p${parent}`, toId: `p${i}`, type: "parent_child" });
  }
}

assert.strictEqual(generationStep, 216, "Phase 6.4 visual-compat generation pitch must stay at 216px");

const orderStart = performance.now();
const ordered = buildProgressiveFamilyGraphOrder(people, connections, "p240");
const orderMs = performance.now() - orderStart;
assert.strictEqual(ordered[0].id, "p240", "progressive mount must start from current focus");
assert.ok(orderMs < 100, `progressive order too slow: ${orderMs.toFixed(2)}ms`);

const grid = new FamilyGraphSpatialGrid(APP_CONFIG_DEFAULTS.familyGraph.render.viewportGridCellSize);
for (const person of people) {
  grid.insertNode(person.id, getFamilyGraphNodeRect({
    person,
    nodeSlotWidth: 128,
    nodeCardWidth: 112,
    nodeCardHeight: 124,
    padding: 20,
  }));
}

const canvasWidth = columns * 148 + 160;
const canvasHeight = 24 + Math.ceil(500 / columns) * generationStep + 244;
let totalVisible = 0;
let maxVisible = 0;
const queryStart = performance.now();
for (let step = 0; step < 120; step += 1) {
  const camera = {
    centerX: 180 + ((step * 173) % Math.max(1, canvasWidth - 360)),
    centerY: 220 + ((step * 257) % Math.max(1, canvasHeight - 440)),
    scale: 0.72 + (step % 5) * 0.08,
  };
  const bounds = getFamilyGraphViewportRect({
    camera,
    viewport: { width: 390, height: 700 },
    canvasWidth,
    canvasHeight,
    overscanScreens: APP_CONFIG_DEFAULTS.familyGraph.render.viewportOverscanScreens,
  });
  const visible = grid.queryRect(bounds)
    .filter((entry) => entry.kind === "node" && rectsIntersect(entry.rect, bounds)).length;
  totalVisible += visible;
  maxVisible = Math.max(maxVisible, visible);
}
const queryMs = performance.now() - queryStart;
const averageVisible = totalVisible / 120;
assert.ok(maxVisible < 220, `viewport culling mounted too many nodes: ${maxVisible}`);
assert.ok(averageVisible < 150, `viewport culling average too high: ${averageVisible.toFixed(1)}`);
assert.ok(queryMs < 250, `viewport grid queries too slow: ${queryMs.toFixed(2)}ms`);

console.log(
  `Phase 6.4 viewport/progressive tests: PASS | order ${orderMs.toFixed(2)}ms | 120 viewport queries ${queryMs.toFixed(2)}ms | avg ${averageVisible.toFixed(1)} nodes | max ${maxVisible}`,
);
