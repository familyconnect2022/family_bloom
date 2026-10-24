import {Ionicons} from '@expo/vector-icons';
import {useLocalSearchParams,useRouter} from 'expo-router';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomKeyboardScreen,useBloomKeyboardFocus} from '../../../components/layout/BloomKeyboardScreen';
import {useBloomToast} from '../../../components/ui/BloomToast';
import {showStudyError,studyErrorMessage} from '../../../features/study/studyFeedback';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {useAuth} from '../../../context/AuthContext';
import {StudyBlocksView} from '../../../features/study/StudyFormula';
import {StudyComposer} from '../../../features/study/StudyComposer';
import {studyRepository,studyTimestamp,subjectName,type StudyAnswer,type StudyComment,type StudyQuestion,STUDY_REACTIONS,studyReactionGlyph,type StudyReaction} from '../../../features/study/studyRepository';
const P='#A4437B';
function StudyImages({urls}:{urls:string[]}){return <View style={s.photos}>{(urls||[]).map((u,i)=><Image key={u+i} source={{uri:u}} style={s.photo} resizeMode="contain"/>)}</View>}
function Comments({fid,qid,aid,uid,name}:{fid:string;qid:string;aid:string;uid:string;name:string}){
 const {showToast}=useBloomToast(),{revealInput}=useBloomKeyboardFocus();
 const commentRef=useRef<TextInput>(null);
 const [items,setItems]=useState<StudyComment[]>([]),[cursor,setCursor]=useState<any>(),[more,setMore]=useState(false),[input,setInput]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async(reset:boolean)=>{
  if(busy)return;setBusy(true);
  try{const r=await studyRepository.listComments(fid,qid,aid,reset?undefined:cursor);setItems(v=>reset?r.items:[...v,...r.items]);setCursor(r.cursor);setMore(r.hasMore)}catch(e){showStudyError(showToast,e,'tải bình luận')}finally{setBusy(false)}
 },[aid,busy,cursor,fid,qid]);
 useEffect(()=>{void studyRepository.listComments(fid,qid,aid).then(r=>{setItems(r.items);setCursor(r.cursor);setMore(r.hasMore)}).catch(()=>undefined)},[fid,qid,aid]);
 const submit=async()=>{if(!input.trim()||busy)return;setBusy(true);try{await studyRepository.addComment(fid,qid,aid,uid,name,input);setInput('');const r=await studyRepository.listComments(fid,qid,aid);setItems(r.items);setCursor(r.cursor);setMore(r.hasMore)}catch(e){showStudyError(showToast,e,'gửi bình luận')}finally{setBusy(false)}};
 return <View style={{gap:9,marginTop:8}}><Text style={s.commentHeader}>Trao đổi về lời giải</Text>{items.map(c=><View key={c.id} style={s.comment}><Text style={s.commentAuthor}>{c.authorName}</Text><Text style={s.commentBody}>{c.body}</Text></View>)}
 <View style={s.commentRow}><TextInput ref={commentRef} style={s.commentInput} onFocus={()=>revealInput(commentRef.current,38)} value={input} onChangeText={setInput} placeholder="Hỏi lại một bước…" maxLength={1000} placeholderTextColor="#9E8C97"/><Pressable onPress={()=>void submit()} disabled={busy||!input.trim()} style={s.commentSend}><Ionicons name="send" size={18} color="#FFF"/></Pressable></View>
 {more&&<Pressable onPress={()=>void load(false)}><Text style={s.link}>Xem thêm bình luận</Text></Pressable>}
 </View>;
}
function AnswerCard({answer,q,uid,name,onAccepted}:{answer:StudyAnswer;q:StudyQuestion;uid:string;name:string;onAccepted:(id:string)=>Promise<void>}){
 const {showToast}=useBloomToast();
 const [comments,setComments]=useState(false),[reaction,setReaction]=useState<StudyReaction|null>(null),[reactionOpen,setReactionOpen]=useState(false),[likeBusy,setLikeBusy]=useState(false);
 useEffect(()=>{let live=true;void studyRepository.getMyReactionKind(q.familyId,q.id,answer.id,uid).then(v=>{if(live)setReaction(v)}).catch(()=>{});return()=>{live=false}},[q.familyId,q.id,answer.id,uid]);
 const isAccepted=q.acceptedAnswerId===answer.id;
 const toggle=async(value:StudyReaction)=>{
  if(likeBusy||!uid)return;
  const old=reaction,next=old===value?null:value;
  setLikeBusy(true);setReactionOpen(false);setReaction(next);
  try{await studyRepository.setReactionKind(q.familyId,q.id,answer.id,uid,next)}
  catch(e){setReaction(old);showStudyError(showToast,e,'lưu cảm xúc')}
  finally{setLikeBusy(false)}
 };
 return <View style={[s.answer,isAccepted&&s.accepted]}>
 <View style={s.answerHead}><Text style={s.answerAuthor}>{answer.authorName||'Người nhà'}</Text>{isAccepted&&<Text style={s.acceptedLabel}>✓ Lời giải hữu ích</Text>}</View>
 <StudyBlocksView blocks={answer.blocks||[]}/><StudyImages urls={answer.imageUrls||[]}/>
 <View style={s.answerActions}>
 <Pressable accessibilityRole="button" accessibilityLabel="Chọn biểu tượng cảm xúc cho lời giải" disabled={likeBusy||!uid} onPress={()=>setReactionOpen(v=>!v)} style={s.smallAction}><Text style={s.reactionGlyph}>{reaction?studyReactionGlyph[reaction]:'♡'}</Text><Text style={s.smallActionText}>{reaction?'Đổi cảm xúc':'Cảm xúc'}</Text></Pressable>
 <Pressable onPress={()=>setComments(v=>!v)} style={s.smallAction}><Ionicons name="chatbubble-outline" color={P} size={17}/><Text style={s.smallActionText}>Trao đổi</Text></Pressable>
 {q.authorUid===uid&&!isAccepted&&<Pressable onPress={()=>void onAccepted(answer.id)} style={s.smallAction}><Ionicons name="checkmark-circle-outline" color="#398E6D" size={17}/><Text style={s.smallActionText}>Chọn lời giải</Text></Pressable>}
 </View>
 {reactionOpen&&<View style={s.reactionPicker} accessibilityLabel="Chọn một biểu tượng cảm xúc">
  {STUDY_REACTIONS.map(kind=><Pressable key={kind} accessibilityRole="button" accessibilityLabel={`Cảm xúc ${kind}`} disabled={likeBusy} onPress={()=>void toggle(kind)} style={[s.reactionChoice,reaction===kind&&s.reactionChoiceActive]}><Text style={s.reactionEmoji}>{studyReactionGlyph[kind]}</Text></Pressable>)}
 </View>}
 {comments&&<Comments fid={q.familyId} qid={q.id} aid={answer.id} uid={uid} name={name}/>}
 </View>
}
export default function StudyQuestionDetail(){
 const router=useRouter();const {questionId}=useLocalSearchParams<{questionId:string}>();
 const {showToast}=useBloomToast();
 const {activeFamilyId,user,userProfile}=useAuth();
 const [q,setQ]=useState<StudyQuestion|null>(null),[answers,setAnswers]=useState<StudyAnswer[]>([]),[cursor,setCursor]=useState<any>(),[more,setMore]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showComposer,setShowComposer]=useState(false);
 const name=userProfile?.displayName||'Người nhà';
 const load=useCallback(async(reset:boolean)=>{
  if(!activeFamilyId||typeof questionId!=='string')return;
  try{
   const [question,answerPage]=await Promise.all([
     reset?studyRepository.getQuestion(activeFamilyId,questionId):Promise.resolve(null),
     studyRepository.listAnswers(activeFamilyId,questionId,reset?undefined:cursor),
   ]);
   if(reset)setQ(question);
   setAnswers(v=>reset?answerPage.items:[...v,...answerPage.items.filter(x=>!v.some(y=>y.id===x.id))]);
   setCursor(answerPage.cursor);setMore(answerPage.hasMore);
  }catch(e){setError(studyErrorMessage(e,'tải câu hỏi').message)}finally{setLoading(false);setBusy(false)}
 },[activeFamilyId,questionId,cursor]);
 useEffect(()=>{let live=true;if(!activeFamilyId||typeof questionId!=='string'){setLoading(false);return}
  setLoading(true);Promise.all([studyRepository.getQuestion(activeFamilyId,questionId),studyRepository.listAnswers(activeFamilyId,questionId)]).then(([question,r])=>{if(live){setQ(question);setAnswers(r.items);setCursor(r.cursor);setMore(r.hasMore)}}).catch(e=>{if(live)setError(studyErrorMessage(e,'tải câu hỏi').message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false};
 },[activeFamilyId,questionId]);
 const onAccepted=async(aid:string)=>{if(!q||!activeFamilyId)return;try{await studyRepository.acceptAnswer(activeFamilyId,q.id,aid);setQ({...q,acceptedAnswerId:aid})}catch(e){showStudyError(showToast,e,'chọn lời giải')}};
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
  <BloomHeroHeader variant="generic" compact roundedBottom eyebrow="CẢ NHÀ CÙNG GIẢI" title="Câu hỏi & lời giải" subtitle="Mỗi cách giải đều đáng lắng nghe" onBack={()=>router.back()}/>
  <BloomKeyboardScreen contentContainerStyle={s.body}>
   {loading&&<ActivityIndicator color={P}/>}
   {!!error&&<Text style={s.error}>{error}</Text>}
   {!loading&&!q&&!error&&<Text style={s.error}>Không tìm thấy câu hỏi hoặc bạn chưa có quyền truy cập.</Text>}
   {q&&<><View style={s.question}><Text style={s.overline}>{subjectName(q.subject)} · Lớp {q.grade}</Text><Text style={s.questionTitle}>{q.title}</Text><Text style={s.date}>{q.authorName} · {studyTimestamp(q.createdAt)?new Date(studyTimestamp(q.createdAt)).toLocaleDateString('vi-VN'):''}</Text><StudyBlocksView blocks={q.blocks||[]}/><StudyImages urls={q.imageUrls||[]}/></View>
    <Text style={s.sectionHead}>Bài giải của cả nhà ({answers.length}{more?'+':''})</Text>
    {answers.map(a=><AnswerCard key={a.id} answer={a} q={q} uid={user?.uid||''} name={name} onAccepted={onAccepted}/>)}
    {!answers.length&&!loading&&<Text style={s.muted}>Chưa có lời giải. Mình cùng giúp bạn nhé!</Text>}
    {more&&<Pressable style={s.more} disabled={busy} onPress={()=>{setBusy(true);void load(false)}}><Text style={s.link}>Xem thêm bài giải</Text></Pressable>}
    {user&&activeFamilyId&&<View style={s.composeCard}>{showComposer?<StudyComposer familyId={activeFamilyId} uid={user.uid} draftKey={`answer:${q.id}`} submitText="Đăng bài giải" onSubmit={async(blocks,images)=>{await studyRepository.createAnswer(activeFamilyId,q.id,user.uid,name,blocks,images);setShowComposer(false);await load(true)}}/>:<Pressable style={s.addAnswer} onPress={()=>setShowComposer(true)}><Ionicons name="create-outline" size={19} color="#FFF"/><Text style={{fontWeight:'900',color:'#FFF'}}>Viết lời giải của mình</Text></Pressable>}</View>}
    <Text style={s.disclaimer}>Lời giải do các thành viên đóng góp; dấu chọn thể hiện sự hữu ích, không đảm bảo tuyệt đối tính chính xác.</Text>
   </>}
  </BloomKeyboardScreen>
 </ScreenContainer>
}
const s=StyleSheet.create({body:{padding:16,paddingBottom:65,gap:14},question:{backgroundColor:'#FFF',borderRadius:22,padding:18,gap:12,borderWidth:1,borderColor:'#F1D8E4'},overline:{color:P,fontSize:11,fontWeight:'900'},questionTitle:{color:'#54374C',fontSize:21,fontWeight:'900',lineHeight:29},date:{color:'#9B7C8D',fontSize:11},photos:{flexDirection:'row',flexWrap:'wrap',gap:8},photo:{width:98,height:98,borderRadius:12,backgroundColor:'#FFF7FC'},sectionHead:{fontSize:18,fontWeight:'900',color:'#713E58',marginTop:7},answer:{backgroundColor:'#FFF',borderRadius:20,padding:16,borderColor:'#F0D8E4',borderWidth:1,gap:12},accepted:{borderColor:'#90D1AE',borderWidth:2},answerHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},answerAuthor:{fontSize:14,color:'#673952',fontWeight:'900'},acceptedLabel:{fontSize:11,color:'#267953',fontWeight:'900'},answerActions:{flexDirection:'row',flexWrap:'wrap',gap:15},smallAction:{flexDirection:'row',gap:5,alignItems:'center',paddingVertical:6},smallActionText:{color:'#875E73',fontSize:11,fontWeight:'800'},reactionGlyph:{fontSize:20},reactionPicker:{flexDirection:'row',flexWrap:'wrap',gap:10,backgroundColor:'#FFF4FA',borderWidth:1,borderColor:'#F0D7E4',borderRadius:15,padding:10},reactionChoice:{width:43,height:43,alignItems:'center',justifyContent:'center',borderRadius:13,backgroundColor:'#FFF',borderWidth:1,borderColor:'#F7E2EC'},reactionChoiceActive:{backgroundColor:'#FCE0ED',borderColor:'#A4437B'},reactionEmoji:{fontSize:24},commentHeader:{fontSize:12,fontWeight:'900',color:'#76566C'},comment:{padding:10,backgroundColor:'#FCF3F8',borderRadius:10},commentAuthor:{color:P,fontSize:11,fontWeight:'900'},commentBody:{color:'#634B5A',fontSize:12,lineHeight:18},commentRow:{flexDirection:'row',gap:7,alignItems:'center'},commentInput:{flex:1,borderRadius:12,backgroundColor:'#FAEFF5',paddingHorizontal:12,color:'#4F3445',minHeight:41},commentSend:{width:43,height:42,backgroundColor:P,borderRadius:12,alignItems:'center',justifyContent:'center'},link:{color:P,fontWeight:'900',textAlign:'center'},more:{padding:12,backgroundColor:'#FCEAF2',borderRadius:13},composeCard:{padding:13,borderRadius:19,backgroundColor:'#FFF',borderWidth:1,borderColor:'#F0D7E2'},addAnswer:{backgroundColor:P,minHeight:53,borderRadius:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},muted:{color:'#987C8C',fontSize:13},disclaimer:{fontSize:11,color:'#987A89',lineHeight:18},error:{color:'#A74356',padding:16}});
