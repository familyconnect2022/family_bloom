const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const exists = (p) => fs.existsSync(path.join(root,p));
const results=[];
const check=(name,ok,detail='')=>{results.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${String(results.length).padStart(2,'0')} ${name}${detail?` — ${detail}`:''}`)};

const required=[
  'src/app/_layout.web.tsx','src/app/(tabs)/_layout.web.tsx','src/app/(tabs)/index.web.tsx',
  'src/app/(tabs)/moments.web.tsx','src/app/(tabs)/planner.web.tsx','src/app/(tabs)/family.web.tsx','src/app/(tabs)/play.web.tsx',
  'src/web/firebaseWeb.ts','src/web/context/WebAuthContext.tsx','src/web/context/WebFamilyContext.tsx',
  'src/web/components/WebTabShell.tsx','src/web/games/WebRealtimeGames.tsx','document/WEB_W1_README.md','public/manifest.json'
];
for(const p of required)check(`exists ${p}`,exists(p));

const pkg=JSON.parse(read('package.json'));
check('Firebase JS SDK dependency',typeof pkg.dependencies?.firebase==='string',pkg.dependencies?.firebase||'missing');
check('web:preview script',pkg.scripts?.['web:preview']==='expo start --web');
check('web:build script',pkg.scripts?.['web:build']==='expo export --platform web');

const webRoot=read('src/app/_layout.web.tsx');
check('Web root uses WebAuthProvider',webRoot.includes('WebAuthProvider'));
check('Web root uses WebFamilyProvider',webRoot.includes('WebFamilyProvider'));
const nativeRoot=read('src/app/_layout.tsx');
check('Native root remains ChessSurfaceHost architecture',nativeRoot.includes('ChessSurfaceHost')&&nativeRoot.includes('ChessRealtimeProvider'));

const webFirebase=read('src/web/firebaseWeb.ts');
check('Web Firebase imports modular SDK',webFirebase.includes('from "firebase/app"')&&webFirebase.includes('from "firebase/auth"')&&webFirebase.includes('from "firebase/firestore"'));
check('Web Firebase uses browserLocalPersistence',webFirebase.includes('browserLocalPersistence'));
check('Web Firebase does not fake Android app id',!webFirebase.includes('android:44e3b5baed37cf765504c8'));

const webAuth=read('src/web/context/WebAuthContext.tsx');
check('Google web auth available',webAuth.includes('signInWithPopup')&&webAuth.includes('signInWithRedirect'));
check('Phone web auth available',webAuth.includes('signInWithPhoneNumber')&&webAuth.includes('RecaptchaVerifier'));

const family=read('src/web/context/WebFamilyContext.tsx');
check('Membership reverse index realtime',family.includes('users/${user.uid}/memberships')&&family.includes('onSnapshot'));
check('Family switch writes canonical user activeFamilyId',family.includes('activeFamilyId')&&family.includes('updateDoc'));
check('Active family members realtime',family.includes('families/${activeFamilyId}/members'));

const games=read('src/web/games/WebRealtimeGames.tsx') + '\n' + read('src/web/games/WebGameSocketContext.tsx') + '\n' + read('src/types/chess.ts') + '\n' + read('src/types/xiangqiRealtime.ts');
for(const event of ['chess:app:join','chess:test:bot:invite','chess:invite:accept','chess:game:ready','chess:game:move','xiangqi:app:join','xiangqi:test:bot:invite','xiangqi:invite:accept','xiangqi:game:ready','xiangqi:game:move']){
  check(`game protocol ${event}`,games.includes(event));
}
check('Game handshake obtains Firebase Web ID token',games.includes('user.getIdToken()'));
check('Web game server uses shared ENV endpoint',games.includes('ENV.chessSocketUrl'));

// Runtime dependency audit: web-only source must never import RN Firebase native modules.
const webFiles=[];
function walk(dir){for(const name of fs.readdirSync(path.join(root,dir))){const rel=path.join(dir,name).replace(/\\/g,'/');const stat=fs.statSync(path.join(root,rel));if(stat.isDirectory())walk(rel);else if(/\.(ts|tsx)$/.test(rel))webFiles.push(rel)}}
walk('src/web');
for(const p of required.filter(x=>x.endsWith('.tsx')||x.endsWith('.ts'))){if(!webFiles.includes(p))webFiles.push(p)}
const nativeImport=webFiles.find(p=>/@react-native-firebase\//.test(read(p)));
check('Web-only files do not import @react-native-firebase',!nativeImport,nativeImport||'clean');
const notificationImport=webFiles.find(p=>/expo-notifications/.test(read(p)));
check('Web-only files do not import expo-notifications',!notificationImport,notificationImport||'clean');

const tabs=read('src/web/components/WebTabShell.tsx');
for(const label of ['Nhà','Kỷ niệm','Lịch','Phả hệ','Nhà Mình'])check(`Web tab ${label}`,tabs.includes(label));

const html=read('src/app/+html.tsx');
check('PWA manifest linked without service worker',html.includes('/manifest.json')&&!webFiles.some(p=>/serviceWorker|service-worker/.test(read(p))));
check('Apple touch icon linked',html.includes('apple-touch-icon'));

const failures=results.filter(x=>!x.ok);
console.log(`\nPhase 17.9W1 Web Companion: ${results.length-failures.length}/${results.length} PASS`);
if(failures.length){process.exitCode=1;}
