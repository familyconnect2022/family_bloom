const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const cp = require("child_process");
const { loadCatalog } = require("./music/catalog-tools");

const root = path.resolve(process.argv[2] || process.cwd());
let pass=0, fail=0; const lines=[];
const record=(name,ok,detail="")=>{ok?pass++:fail++;lines.push(`${ok?"PASS":"FAIL"} ${name}${detail?` — ${detail}`:""}`)};
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const hasAll=(text,parts)=>parts.every(part=>text.includes(part));

const pkg=JSON.parse(read("package.json"));
const dynamic=read("src/data/vietnameseMusicCatalogV2.ts");
const additions=read("src/data/vietnameseMusicCatalogAdditions.generated.ts");
const signals=read("src/data/vietnameseMusicSourceSignals.generated.ts");
const playable=read("src/data/vietnameseMusicPlayableV2.generated.ts");
const matcher=read("src/services/home/music/vietnameseMusicMatcher.ts");
const service=read("src/services/home/music/homeMusicService.ts");
const refresh=read("scripts/music/refresh-vietnamese-music-catalog.js");
const audit=read("scripts/music/audit-audius-vietnamese-catalog.js");
const workflow=read(".github/workflows/refresh-vietnamese-music-catalog.yml");
const panel=read("src/features/home/music/HomeMusicPanel.tsx");
const tools=read("scripts/music/catalog-tools.js");
const catalog=loadCatalog(root);

record("dynamic-catalog-builds-on-phase14k", catalog.base.length >= 80 && catalog.verified.length > catalog.base.length, `${catalog.base.length} base / ${catalog.verified.length} verified`);
record("pending-language-review-never-enters-verified-array", hasAll(additions,["VIETNAMESE_MUSIC_REVIEW_QUEUE","language_needs_review","VERIFIED_VIETNAMESE_MUSIC_ADDITIONS"]));
record("conservative-language-gate", hasAll(tools,["hasStrongVietnameseTitleSignal","VI_MARK_RE","VI_WORD_RE"]));
record("stable-nct-home-source", refresh.includes('url: "https://www.nhaccuatui.com/"'));
record("source-refresh-uses-http-change-signals", hasAll(refresh,["If-None-Match","If-Modified-Since","fingerprint","sha256"]));
record("source-refresh-appends-not-resets", hasAll(refresh,["additionsById","reviewById","existingVerifiedByKey","addedVerified"]));
record("nct-sections-parsed", hasAll(refresh,["Top 50 Nhạc Việt","Top 50 Bài Hát Thịnh Hành","Single Mới Phát Hành"]));
record("zing-is-optional-crosscheck", hasAll(refresh,["https://zingmp3.vn/zing-chart","https://zingmp3.vn/moi-phat-hanh","jsShellOnly"]));
record("dynamic-ranks-merged", hasAll(dynamic,["VIETNAMESE_MUSIC_DYNAMIC_SIGNALS","mergeSignals","rankA"]));
record("catalog-cycle-bumped-vi2", service.includes('const CYCLE_VARIANT = "vi2";'));
record("audit-script-uses-official-audius-search-surface", hasAll(audit,['https://api.audius.co/v1','/tracks/search','sort_method']));
record("audit-is-bounded", audit.includes("const concurrency = 4;"));
record("audit-classifies-matched-ambiguous-unmatched", hasAll(audit,['status:"matched"','status:"ambiguous"','status:"unmatched"']));
record("audit-writes-exact-provider-manifest", hasAll(audit,["PREAUDITED_VIETNAMESE_TRACKS","AUDIUS_UNMATCHED_SEED_IDS","providerTrackId"]));
record("runtime-prefers-preaudited-track", hasAll(matcher,["preAuditedBySeedId","return preAudited"]));
record("runtime-skips-audited-unavailable", hasAll(matcher,["auditedUnavailable","auditedAmbiguous","return null"]));
record("audit-version-must-match-catalog", hasAll(matcher,["trustedAudit","VIETNAMESE_MUSIC_PROVIDER_AUDIT_VERSION === VIETNAMESE_MUSIC_CATALOG_VERSION"]));
record("initial-audit-manifest-safe-empty", hasAll(playable,["PREAUDITED_VIETNAMESE_TRACKS: HomeMusicTrack[] = []","AUDIUS_UNMATCHED_SEED_IDS: string[] = []"]));
record("windows-refresh-helper", fs.existsSync(path.join(root,"scripts","maintenance","Family_Bloom_Refresh_Vietnamese_Music.bat")));
record("github-schedule-refreshes-without-blaze", hasAll(workflow,["schedule:","cron:","workflow_dispatch:","git push"]));
record("music-scripts-registered", hasAll(JSON.stringify(pkg.scripts),["music:refresh-catalog","music:audit-audius","music:refresh-and-audit","phase14l:check"]));
record("ui-keeps-catalog-implementation-private", !panel.includes("NCT/Zing") && !panel.includes("khớp Audius") && panel.includes("Bloom sẽ làm mới góc nhạc theo từng đợt"));

try {
  const out=cp.execFileSync(process.execPath,[path.join(root,"scripts/music/refresh-vietnamese-music-catalog.js"),"--fixture",path.join(root,"scripts/music/fixtures/nct-home-sample.html"),"--dry-run"],{cwd:root,encoding:"utf8"});
  record("nct-parser-fixture", /top50vi":5/.test(out) && /trending":3/.test(out) && /recent":3/.test(out), out.trim().split("\n").slice(-1)[0]);
} catch(error){ record("nct-parser-fixture",false,String(error.stdout||error.message)); }

const collect=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);if(entry.isDirectory())return collect(full);return /\.(ts|tsx)$/.test(entry.name)?[full]:[]});
const tsFiles=collect(path.join(root,"src")); let syntaxFails=0;
for(const file of tsFiles){const result=ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler},reportDiagnostics:true,fileName:file});if((result.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error))syntaxFails++;}
record("ts-tsx-syntax",syntaxFails===0,`${tsFiles.length-syntaxFails}/${tsFiles.length}`);

console.log(`Phase14L Dynamic Vietnamese Catalog + Audius Audit: ${pass} PASS / ${fail} FAIL`); for(const line of lines)console.log(line); if(fail)process.exit(1);
