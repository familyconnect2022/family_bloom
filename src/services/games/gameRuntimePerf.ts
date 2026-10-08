export type BloomBoardKind = "chess" | "xiangqi";

type BoardPerfState = { renders:number; mounts:number; unmounts:number; runtimeActive:boolean; surfaceMounted:boolean; activeListeners:number; activeTimers:number; hintBatches:number; lastHintCount:number; lastHintMaxDelayMs:number; updatedAt:number; };
type PerfSnapshot = Record<BloomBoardKind, BoardPerfState>;
const createState=():BoardPerfState=>({renders:0,mounts:0,unmounts:0,runtimeActive:false,surfaceMounted:false,activeListeners:0,activeTimers:0,hintBatches:0,lastHintCount:0,lastHintMaxDelayMs:0,updatedAt:Date.now()});
let enabled=false;
const perf:PerfSnapshot={chess:createState(),xiangqi:createState()};
const publish=()=>{ if(!enabled) return; (globalThis as typeof globalThis & {__FAMILY_BLOOM_GAME_PERF__?:PerfSnapshot}).__FAMILY_BLOOM_GAME_PERF__=perf; };
const touch=(kind:BloomBoardKind)=>{ if(!enabled) return false; perf[kind].updatedAt=Date.now(); publish(); return true; };
const reset=()=>{ perf.chess=createState(); perf.xiangqi=createState(); if(enabled) publish(); };
export const gameRuntimePerf={
  setEnabled(value:boolean){ enabled=value; if(value){ reset(); publish(); } else { delete (globalThis as typeof globalThis & {__FAMILY_BLOOM_GAME_PERF__?:PerfSnapshot}).__FAMILY_BLOOM_GAME_PERF__; } },
  isEnabled(){ return enabled; },
  reset,
  markRender(kind:BloomBoardKind){ if(!enabled)return; perf[kind].renders+=1; touch(kind); },
  markMount(kind:BloomBoardKind){ if(!enabled)return; perf[kind].mounts+=1; touch(kind); },
  markUnmount(kind:BloomBoardKind){ if(!enabled)return; perf[kind].unmounts+=1; perf[kind].runtimeActive=false; perf[kind].surfaceMounted=false; perf[kind].activeListeners=0; perf[kind].activeTimers=0; touch(kind); },
  markSurface(kind:BloomBoardKind,mounted:boolean){ if(!enabled)return; perf[kind].surfaceMounted=mounted; touch(kind); },
  markRuntime(kind:BloomBoardKind,active:boolean){ if(!enabled)return; perf[kind].runtimeActive=active; if(!active){perf[kind].activeListeners=0;perf[kind].activeTimers=0;} touch(kind); },
  setActiveListeners(kind:BloomBoardKind,count:number){ if(!enabled)return; perf[kind].activeListeners=Math.max(0,Math.round(count)); touch(kind); },
  adjustTimers(kind:BloomBoardKind,delta:number){ if(!enabled)return; perf[kind].activeTimers=Math.max(0,perf[kind].activeTimers+delta); touch(kind); },
  markHintBatch(kind:BloomBoardKind,count:number,maxDelayMs:number){ if(!enabled)return; perf[kind].hintBatches+=1;perf[kind].lastHintCount=count;perf[kind].lastHintMaxDelayMs=Math.max(0,Math.round(maxDelayMs));touch(kind); },
  snapshot():PerfSnapshot { return { chess:{...perf.chess}, xiangqi:{...perf.xiangqi} }; },
};
