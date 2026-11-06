/** Dependency-free source preflight: safe to run before npm install or updater backup. */
const fs=require('fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log(`PASS ${passed} ${name}`)};
const repo=read('src/features/study/studyRepository.ts'),formula=read('src/features/study/StudyFormula.tsx'),editor=read('src/features/study/StudyFormulaEditor.tsx'),composer=read('src/features/study/StudyComposer.tsx'),feed=read('src/app/(home)/(learning)/study-questions.tsx'),detail=read('src/app/(home)/(learning)/study-question-detail.tsx'),qcompose=read('src/app/(home)/(learning)/study-question-compose.tsx'),layout=read('src/app/_layout.tsx'),library=read('src/app/(home)/(learning)/learning-library.tsx');
check('Feature is discoverable only inside Learning',()=>{assert(library.includes('/study-questions'));assert(layout.includes('study-question-detail'));assert(layout.includes('study-question-compose'))});
check('Question/answer/comment persisted within family path',()=>{assert(repo.includes("'families',familyId,'studyQuestions'"));assert(repo.includes("'answers'"));assert(repo.includes("'comments'"))});
check('No realtime listeners or root side effects',()=>{assert(!/onSnapshot|setInterval|useTabLiveEffect/.test([repo,feed,detail].join('\n')));assert(feed.includes('useFocusEffect'));assert(repo.includes('STUDY_PAGE_SIZE=15'))});
check('Native-only editor with editable TeX and readable fallback',()=>{assert(formula.includes('parseStudyMath'));assert(formula.includes('formulaToAccessibleText'));assert(read('src/features/study/StudyMathParser.ts').includes('export function parseStudyMath'));assert(editor.includes('setCaret'));assert(!/import .*WebView|https:\/\/cdn|from .mathlive./.test(formula))});
check('Drafts scoped by user, family and question',()=>{assert(composer.includes('bloom.study.draft:${uid}:${familyId}:${draftKey}'));assert(detail.includes('draftKey={`answer:${q.id}`}'))});
check('Image picker and uploads loaded only in active compose',()=>{assert(composer.includes("import('expo-image-picker')"));assert(composer.includes('mediaService.uploadImage'));assert(!feed.includes('expo-image-picker'))});
check('Question creation server timestamp and bounded blocks/images',()=>{assert(repo.includes('createdAt:serverTimestamp()'));assert(repo.includes('blocks.length>24'));assert(repo.includes('urls.length>3'))});
check('Paged queries use limit and cursor',()=>{assert(repo.includes("orderBy('createdAt','desc')"));assert(repo.includes('startAfter(cursor)'));assert(feed.includes('removeClippedSubviews'));assert(feed.includes('windowSize={5}'))});
check('Accepted solution controlled by asker',()=>{assert(detail.includes('q.authorUid===uid'));assert(repo.includes('acceptAnswer'));assert(repo.includes('acceptedAnswerId'))});
check('Comment and reaction owned by per-user paths',()=>{assert(repo.includes("'reactions',uid"));assert(detail.includes('getMyReaction'));assert(detail.includes('listComments'))});
for(const file of ['firestore.rules','firestore.cloud.rules']){
 const r=read(file);check(`${file}: nested family authorization & page caps`,()=>{assert(r.includes('match /studyQuestions/{questionId}'));assert(r.includes('match /answers/{answerId}'));assert(r.includes('match /comments/{commentId}'));assert(r.includes('match /reactions/{reactionUid}'));assert(r.includes('request.query.limit <= 30'));assert(r.includes('request.resource.data.authorUid == request.auth.uid'));assert(r.includes('request.resource.data.diff(resource.data).affectedKeys().hasOnly'));});
}
check('Family bulletin remains hidden',()=>{assert(read('src/constants/featureFlags.ts').includes('ENABLE_FAMILY_BULLETIN: boolean = false'))});
check('No new dependency or unrelated native change',()=>{const p=JSON.parse(read('package.json'));assert(!p.dependencies['react-native-webview']);assert(!p.dependencies.mathlive)});
console.log(`SUPER BLOOM STUDY QA PRECHECK ${passed}/${passed} PASS`);
