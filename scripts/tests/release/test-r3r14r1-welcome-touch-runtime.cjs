#!/usr/bin/env node
'use strict';
// Minimal hook/runtime simulation: exercises the real WelcomeModal callback
// and the tree reachable from its touch event. Does not assert Android pixels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const file = path.join(root, 'src/components/onboarding/WelcomeModal.tsx');
const code = fs.readFileSync(file, 'utf8');
let passed = 0;
const pass = name => console.log(`PASS R3R14R1 ${++passed}: ${name}`);
function childArray(node) {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(childArray);
  if (typeof node !== 'object') return [];
  return [node, ...childArray(node.props?.children)];
}

function harness() {
  let hookIdx = 0;
  const hooks = [];
  let deferredEffects = [];
  let animationStarts = 0;
  let continueCount = 0;
  let currentVisible = true;
  class MockAnimatedValue {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    interpolate(spec) { return {type:'interpolation', spec}; }
  }
  const react = {
    createElement(type, props, ...children) { return {type,props:{...(props || {}),children}}; },
    useRef(value) { const i = hookIdx++; if (!hooks[i]) hooks[i]={current:value}; return hooks[i]; },
    useState(value) { const i=hookIdx++; if (!(i in hooks)) hooks[i]=value;
      return [hooks[i], next=>{hooks[i]=typeof next==='function'?next(hooks[i]):next;}]; },
    useCallback(fn) { hookIdx++; return fn; },
    useEffect(fn) { hookIdx++; deferredEffects.push(fn); },
  };
  const Animated = {
    Value:MockAnimatedValue,
    Image:'Animated.Image',View:'Animated.View',
    timing(value,opt) { return {value,opt}; },
    parallel(parts) { return {parallel:parts}; },
    sequence(parts) { return {start(cb) { animationStarts++; cb({finished:true}); },stop() {}}; },
  };
  const mocks = {
    react:{__esModule:true,default:react,...react},
    'react-native':{
      AccessibilityInfo:{isReduceMotionEnabled:()=>Promise.resolve(false)},
      Animated, BackHandler:{addEventListener:()=>({remove(){}})},
      Easing:{cubic:x=>x, quad:x=>x, out:x=>x, inOut:x=>x},
      Pressable:'Pressable', ScrollView:'ScrollView',StyleSheet:{absoluteFillObject:{position:'absolute',top:0,left:0,right:0,bottom:0},create:x=>x},
      Text:'Text',useWindowDimensions:()=>({width:412,height:915}), View:'View',
    },
    'expo-asset':{Asset:{loadAsync:async()=>[]}},
    '@expo/vector-icons':{Ionicons:'Ionicons'},
    '@/components/ui/BloomButtonComponents':{BloomButton:'BloomButton'},
  };
  const compiled = ts.transpileModule(code, {fileName:'WelcomeModal.tsx',compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
  assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const module = {exports:{}};
  new Function('module','exports','require',compiled.outputText)(module,module.exports,id=>{
    if (id in mocks) return mocks[id];
    if (id.endsWith('.jpg')) return {uri:id};
    throw new Error(`Unexpected imported runtime dependency: ${id}`);
  });
  const render = () => {
    hookIdx=0; deferredEffects=[];
    const tree = module.exports.WelcomeModal({visible:currentVisible,onContinue:()=>{continueCount++;}});
    // Components' hooks are processed after commit.
    for (const effect of deferredEffects) effect();
    return childArray(tree);
  };
  return {render,setVisible:v=>{currentVisible=v;},getAnimationStarts:()=>animationStarts,getContinueCount:()=>continueCount};
}

const h=harness();
let tree=h.render();
const hit=tree.filter(x=>x.type==='Pressable'&&x.props.testID==='welcome-envelope-open');
assert.equal(hit.length,1,'sealed screen must have one top-level interactive press target');
const idx=tree.indexOf(hit[0]);
const elevatedSheet=tree.filter(x=>x.type==='Animated.View'&&x.props.style?.some?.(style=>style?.elevation===20));
assert.equal(elevatedSheet.length,0,'reading sheet must be UNMOUNTED while sealed');
assert.equal(typeof hit[0].props.onPressIn,'function');
assert.equal(typeof hit[0].props.onPress,'function');
assert(code.indexOf('testID="welcome-envelope-open"')>code.indexOf('testID="welcome-letter-scroll"'),'tap target is authored last');
assert(idx>0);
pass('initial sealed scene has actual top-layer Pressable and no elevated invisible sheet');

hit[0].props.onPressIn();
hit[0].props.onPress();
assert.equal(h.getAnimationStarts(),1,'one gesture cannot start multiple sequences');
pass('touch-down starts exactly one real animated sequence');

tree=h.render();
assert.equal(tree.some(x=>x.type==='Pressable'&&x.props.testID==='welcome-envelope-open'),false,'should stop intercepting reader');
assert(tree.some(x=>x.type==='ScrollView'&&x.props.testID==='welcome-letter-scroll'),'reader visible after animation callback');
const continueBtn=tree.find(x=>x.type==='BloomButton');
assert(continueBtn?.props?.onPress,'reader must offer a continue button');
pass('animation ends in scrollable letter, with open overlay detached');

continueBtn.props.onPress();continueBtn.props.onPress();
assert.equal(h.getContinueCount(),1,'double continue must be ignored');
pass('continue is idempotent and dismisses welcome only once');

h.setVisible(false);h.render();h.setVisible(true);tree=h.render();
assert(tree.some(x=>x.type==='Pressable'&&x.props.testID==='welcome-envelope-open'));
pass('sign-out or family switch resets envelope to a tappable initial state');

assert(code.includes('openingWatchdog.current = setTimeout'));
assert(code.includes('clearTimeout(openingWatchdog.current)'));
assert(code.includes('run !== animationRun.current'));
pass('interrupted animation has guarded fallback and cancelable watchdog');
console.log(`R3R14R1 WELCOME TOUCH RUNTIME: ${passed}/${passed} PASS`);
