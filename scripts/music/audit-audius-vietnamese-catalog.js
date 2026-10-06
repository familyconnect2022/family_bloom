#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { loadCatalog, normalize } = require("./catalog-tools");

const root = path.resolve(process.cwd());
const args = process.argv.slice(2);
const full = args.includes("--full");
const limitArg = (() => { const i = args.indexOf("--limit"); return i >= 0 ? Number(args[i + 1]) : null; })();
const concurrency = 4;
const API_ROOT = "https://api.audius.co/v1";
const catalogVersion = "vi2-dynamic-2026-09-30";
const reportPath = path.join(root, "document/music-catalog/audius-audit-latest.json");
const generatedPath = path.join(root, "src/data/music/vietnameseMusicPlayableV2.generated.ts");
const prior = (() => { try { return JSON.parse(fs.readFileSync(reportPath, "utf8")); } catch { return { entries: {} }; } })();

const stripMarks = text => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = text => stripMarks(text).toLowerCase().replace(/đ/g, "d").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const NOISE = new Set(["feat","ft","version","ver","official","audio","lyrics","lyric","mv","music","acoustic","cover","remix","remastered","karaoke","instrumental","intro","ost"]);
const tokens = text => new Set(norm(text).split(" ").filter(t => t.length > 1 && !NOISE.has(t)));
const overlap = (a,b) => { if (!a.size || !b.size) return 0; let h=0; for (const t of a) if (b.has(t)) h++; return h/Math.max(a.size,b.size); };
const canonicalTitle = text => norm(text).replace(/\b(feat|ft|acoustic|cover|remix|version|ver|official|lyrics|lyric|mv|intro|ost)\b.*$/g, "").trim();
const titleScore = (seed, raw) => {
  const actual=canonicalTitle(raw.title||""); let best=0;
  for (const candidate of [seed.title,...(seed.aliases||[])]) { const wanted=canonicalTitle(candidate); if (!wanted||!actual) continue; if (wanted===actual) return 1; if (actual.includes(wanted)||wanted.includes(actual)) best=Math.max(best,.9); best=Math.max(best,overlap(tokens(wanted),tokens(actual))); }
  return best;
};
const artistName = raw => String(raw.user?.name || raw.artist_name || raw.user?.handle || "").trim();
const artistScore = (seed, raw) => {
  const actual=tokens(artistName(raw)); let best=0;
  for (const artist of seed.artists) { best=Math.max(best,overlap(tokens(artist),actual)); const a=norm(artist),b=norm(artistName(raw)); if (a&&b&&(a===b||a.includes(b)||b.includes(a))) best=Math.max(best,.92); }
  return best;
};
const alternate = (seed, raw) => { const wanted=norm([seed.title,...(seed.aliases||[])].join(" ")); const actual=norm(raw.title||""); return ["cover","remix","karaoke","instrumental","sped up","slowed","nightcore"].some(word=>actual.includes(word)&&!wanted.includes(word)); };
const scoreTrack = (seed, raw) => { if (raw.is_stream_gated || alternate(seed,raw)) return null; const t=titleScore(seed,raw),a=artistScore(seed,raw); if (t<.78||a<.28) return null; return { raw, titleScore:t, artistScore:a, score:t*.72+a*.28 }; };

const fetchJson = async url => {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12000);
  try { const res=await fetch(url,{headers:{Accept:"application/json","User-Agent":"FamilyBloomAudiusAudit/1.0"},signal:controller.signal}); if(!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json(); } finally { clearTimeout(timer); }
};
const search = async q => {
  const url=new URL(`${API_ROOT}/tracks/search`); url.searchParams.set("query",q); url.searchParams.set("limit","8"); url.searchParams.set("sort_method","relevant");
  const payload=await fetchJson(url.toString()); return payload.data||[];
};
const auditSeed = async seed => {
  const queries=[`${seed.title} ${seed.artists.slice(0,2).join(" ")}`.trim(),seed.title,...(seed.aliases||[]).slice(0,1)];
  const scored=[];
  for (const q of queries) {
    const rows=await search(q);
    for (const raw of rows) { const s=scoreTrack(seed,raw); if(s) scored.push(s); }
    if (scored.some(x=>x.score>=.88)) break;
  }
  scored.sort((a,b)=>b.score-a.score);
  const best=scored[0]; const second=scored[1];
  if (!best) return { status:"unmatched", checkedAt:new Date().toISOString(), score:0 };
  if (best.score<.82 || (second && best.score-second.score<.035 && best.raw.id!==second.raw.id)) return { status:"ambiguous", checkedAt:new Date().toISOString(), score:best.score, candidate:best.raw };
  return { status:"matched", checkedAt:new Date().toISOString(), score:best.score, track:best.raw };
};

const toHomeTrack = (seed, raw) => ({
  id:`audius:${String(raw.id)}`, provider:"audius", providerTrackId:String(raw.id), title:String(raw.title||seed.title), artist:artistName(raw)||seed.artists[0]||"Nghệ sĩ Audius",
  artworkUrl:raw.artwork?.["480x480"]||raw.artwork?.["150x150"]||raw.artwork?.["1000x1000"]||null,
  durationSec:Math.max(0,Number(raw.duration||0)||0), genre:raw.genre?String(raw.genre):null, mood:raw.mood?String(raw.mood):null, releaseDate:raw.release_date?String(raw.release_date):null,
  language:"vi", curation:{catalogVersion,seedId:seed.id,sourceKinds:Array.from(new Set((seed.signals||[]).map(x=>x.kind)))},
});
const ts = value => JSON.stringify(value,null,2).replace(/"([A-Za-z_][A-Za-z0-9_]*)":/g,"$1:");
const writeGenerated = (tracks, unmatched, ambiguous, generatedAt) => `import type { HomeMusicTrack } from "@/types/homeLiving";\n\n/** AUTO-GENERATED by npm run music:audit-audius. */\nexport const VIETNAMESE_MUSIC_PROVIDER_AUDIT_VERSION = ${JSON.stringify(catalogVersion)} as const;\nexport const VIETNAMESE_MUSIC_PROVIDER_AUDIT_GENERATED_AT: string | null = ${JSON.stringify(generatedAt)};\nexport const PREAUDITED_VIETNAMESE_TRACKS: HomeMusicTrack[] = ${ts(tracks)};\nexport const AUDIUS_UNMATCHED_SEED_IDS: string[] = ${ts(unmatched)};\nexport const AUDIUS_AMBIGUOUS_SEED_IDS: string[] = ${ts(ambiguous)};\n`;

const main=async()=>{
  const {verified}=loadCatalog(root); let seeds=verified;
  if (Number.isFinite(limitArg) && limitArg>0) seeds=seeds.slice(0,limitArg);
  const entries={...(prior.entries||{})};
  const queue=seeds.filter(seed=>full || !entries[seed.id] || !["matched","unmatched","ambiguous"].includes(entries[seed.id].status));
  console.log(`[audius-audit] catalog=${verified.length}, checking=${queue.length}, mode=${full?"full":"incremental"}`);
  let cursor=0; let fatal=0;
  const worker=async()=>{ while(true){ const i=cursor++; if(i>=queue.length) return; const seed=queue[i]; try { const result=await auditSeed(seed); entries[seed.id]={...result,title:seed.title,artists:seed.artists}; console.log(`[${i+1}/${queue.length}] ${result.status.padEnd(9)} ${seed.title} — ${seed.artists[0]}`); } catch(error){ fatal++; entries[seed.id]={status:"error",checkedAt:new Date().toISOString(),title:seed.title,artists:seed.artists,error:String(error?.message||error)}; console.warn(`[${i+1}/${queue.length}] error ${seed.title}: ${error?.message||error}`); } } };
  await Promise.all(Array.from({length:Math.min(concurrency,Math.max(1,queue.length))},()=>worker()));
  const generatedAt=new Date().toISOString();
  const tracks=[],unmatched=[],ambiguous=[];
  for(const seed of verified){ const e=entries[seed.id]; if(e?.status==="matched"&&e.track) tracks.push(toHomeTrack(seed,e.track)); else if(e?.status==="unmatched") unmatched.push(seed.id); else if(e?.status==="ambiguous") ambiguous.push(seed.id); }
  const report={catalogVersion,generatedAt,mode:full?"full":"incremental",catalogCount:verified.length,matched:tracks.length,unmatched:unmatched.length,ambiguous:ambiguous.length,errorCount:Object.values(entries).filter(e=>e.status==="error").length,coverage:verified.length?tracks.length/verified.length:0,entries};
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});
  if(fatal && !tracks.length && !(prior.entries && Object.keys(prior.entries).length)){ console.error("[audius-audit] network/provider audit failed before any reusable result; previous manifest preserved."); process.exit(2); }
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(generatedPath,writeGenerated(tracks,unmatched,ambiguous,generatedAt));
  console.log(`[audius-audit] matched=${tracks.length}/${verified.length} (${Math.round(report.coverage*100)}%), ambiguous=${ambiguous.length}, unmatched=${unmatched.length}, errors=${report.errorCount}`);
};
main().catch(error=>{console.error(error);process.exit(1);});
