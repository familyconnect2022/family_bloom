/** Hero reading veil regression: no external packages, Gradle or Firebase.
 * Verifies every Garden/Rose/Heritage/Midnight + light/dark local overlay,
 * its RGBA/opacity silhouette and the Compiler-safe header text binding.
 */
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const base='assets/images/storybook/shades/';
const backgrounds={
 rose:{light:'#FFF6F8',dark:'#18141C'},
 garden:{light:'#F2F8F3',dark:'#131A17'},
 heritage:{light:'#FCF6ED',dark:'#1D1814'},
 midnight:{light:'#F4F2FC',dark:'#161521'},
};
function readPNG(name){
 const data=fs.readFileSync(path.join(root,base,name));
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature');
 let offset=8,width=0,height=0,depth=0,type=0,parts=[];
 while(offset<data.length){
  const n=data.readUInt32BE(offset);const chunk=data.toString('ascii',offset+4,offset+8);const bytes=data.subarray(offset+8,offset+8+n);
  if(chunk==='IHDR') {width=bytes.readUInt32BE(0);height=bytes.readUInt32BE(4);depth=bytes[8];type=bytes[9]}
  if(chunk==='IDAT')parts.push(bytes);
  offset+=n+12;if(chunk==='IEND')break;
 }
 assert.equal(depth,8);assert.equal(type,6,'RGBA PNG');
 assert.equal(width,512);assert.equal(height,512);
 const raw=zlib.inflateSync(Buffer.concat(parts));
 const bpp=4,stride=width*bpp;
 const image=Buffer.alloc(height*stride);
 const paeth=(a,b,c)=>{const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c};
 for(let y=0;y<height;y++){
  const filter=raw[y*(stride+1)],start=y*(stride+1)+1;
  assert.ok(filter<=4,'known PNG filter');
  for(let x=0;x<stride;x++){
   const v=raw[start+x];const prev=x>=4?image[y*stride+x-4]:0;
   const above=y>0?image[(y-1)*stride+x]:0;
   const corner=x>=4&&y>0?image[(y-1)*stride+x-4]:0;
   image[y*stride+x]=(v+[0,prev,above,Math.floor((prev+above)/2),paeth(prev,above,corner)][filter])&255;
  }
 }
 return (x,y)=>[...image.subarray((Math.round(y*511)*512+Math.round(x*511))*4,(Math.round(y*511)*512+Math.round(x*511))*4+4)];
}
let tests=0;const check=(message,test)=>{assert.ok(test,message);console.log('PASS',String(++tests).padStart(2,'0'),message)};
const header=read('src/components/ui/BloomHeroHeader.tsx');
const tokens=read('src/theme/storybookReadingTokens.ts');
const registry=read('src/theme/storybookShadeRegistry.ts');
const fog=read('src/theme/storybookFogRegistry.ts');
check('Reading palette is consumed directly from reactive Appearance 3.0 snapshot',
 header.includes('getBloomHeroReadingTokens(theme.colors)'));
check('Eyebrow/title/subtitle use resolved reading tokens, not hardcoded secondaryText',
 header.includes('color: heroReading.eyebrow')&&header.includes('color: heroReading.title')&&header.includes('color: heroReading.subtitle')&&
 !header.includes('appearanceTone="secondaryText" style={[__a3_styles.subtitle'));
check('Story artwork remains full-bleed and fixed at 35% of the viewport',
 header.includes('viewportHeight * 0.35') && header.includes('contentFit="cover"'));
check('Veil covers full text width with zero overlay touch interception',
 header.includes('storyCopyShade: { position: "absolute", left: 0, top: 0, bottom: 0, width: "100%" }') &&
 header.includes('<View pointerEvents="none" style={[__a3_styles.storyImageLayer'));
check('Original bottom fog is kept, no live blur/animation',
 header.includes('getBloomFogArt(')&&fog.includes('assets/images/storybook/fog/')&&!header.includes('BlurView'));
check('Text contrast is derived only from palette tokens, not module Proxy',
 tokens.includes('colors.primaryText')&&tokens.includes('colors.secondaryText')&&!tokens.includes('getBloomSelection(')&&!tokens.includes('COLORS.'));
for(const [theme,modes] of Object.entries(backgrounds))for(const [mode,expected] of Object.entries(modes)){
 const filename=`${theme}_${mode}.png`,pixel=readPNG(filename);
 const rgb='#'+pixel(.1,.5).slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');
 check(`${theme}/${mode}: PNG color matches theme (not a hardcoded white/black veil)`,rgb.toUpperCase()===expected);
 check(`${theme}/${mode}: title + long subtitle protected; right art and lower fog remain visible`,
  pixel(.08,.5)[3]>=210 && pixel(.70,.55)[3]>=194 && pixel(.78,.55)[3]>=178 &&
  pixel(.98,.55)[3]<=18 && pixel(.20,.98)[3]<=20);
 check(`${theme}/${mode}: unchanged shade asset referenced by registry`,registry.includes(`shades/${filename}`));
}
console.log(`Family Bloom hero reading veil: ${tests}/${tests} PASS`);
