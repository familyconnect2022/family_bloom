/** A/B Lab contracts. No Firebase, global COLORS, or runtime appearance reads. */
import type { ProfilerOnRenderCallback } from 'react';
import type { A3Tokens } from '../useAppearance3';

export type ABArm = 'on' | 'off';
export type ABStep = Readonly<{
  seq: number;
  value: string;
  presses: number;
  modalVisible: boolean;
}>;
export type ABScenarioProps = Readonly<{
  tokens: A3Tokens;
  step: ABStep;
  onText: (value:string)=>void;
  onPress: ()=>void;
  onOpen: ()=>void;
  onClose: ()=>void;
  onCommit: (arm:ABArm, seq:number)=>void;
  onRender: ProfilerOnRenderCallback;
}>;
export type ABProfile = { samples:number[]; commits:number };
export type ABMetric = { count:number; meanMs:number|null; p50Ms:number|null; p95Ms:number|null; maxMs:number|null };

export const WARMUP_STEPS = 8;
export const MEASURED_PER_ROUND = 50;
export const ABBA_ROUNDS: readonly ABArm[] = ['on','off','off','on'];

export function metric(values:readonly number[]):ABMetric {
  const sorted=[...values].filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return {count:0,meanMs:null,p50Ms:null,p95Ms:null,maxMs:null};
  const at=(pct:number)=>Math.round(sorted[Math.max(0,Math.ceil(sorted.length*pct)-1)]*10)/10;
  return {count:sorted.length,
    meanMs:Math.round(sorted.reduce((total,v)=>total+v,0)/sorted.length*10)/10,
    p50Ms:at(.5),p95Ms:at(.95),maxMs:at(1)};
}
