import {useLocalSearchParams,useRouter} from 'expo-router';
import {useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Image} from 'expo-image';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {getPublishedLesson,type PublishedBloomLesson} from '../../../features/learning/publishedLessons';
import LessonRichView,{RichLine} from '../../../features/learning/LessonRichView';
import {NativeFormula} from '../../../features/study/StudyFormula';
const shades={text:'#473745',muted:'#967C88',tint:'#AD3F78',border:'#F1D6E2',surface:'#FFF',lightTint:'#FCE9F1'};
export default function LearningLesson(){
 const router=useRouter();const {lessonId}=useLocalSearchParams<{lessonId:string}>();
 const [lesson,setLesson]=useState<PublishedBloomLesson|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [revealed,setRevealed]=useState<number[]>([]);
 useEffect(()=>{let current=true;setBusy(true);setError('');setLesson(null);
  getPublishedLesson(typeof lessonId==='string'?lessonId:'').then(item=>{if(current)setLesson(item)})
   .catch(e=>{if(current)setError('Không thể mở bài đã duyệt: '+String((e as Error).message||e))})
   .finally(()=>{if(current)setBusy(false)});
  return()=>{current=false};
 },[lessonId]);
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
  <BloomHeroHeader variant="generic" compact roundedBottom eyebrow="BLOOM EDUCATION" title="Bài học Super Bloom" subtitle="Khám phá · thực hành · ghi nhớ" onBack={()=>router.back()}/>
  <ScrollView contentContainerStyle={s.body}>
   {busy&&<ActivityIndicator color={COLORS.primary}/>}
   {!!error&&<Text style={s.error}>{error}</Text>}
   {!busy&&!error&&!lesson&&<Text style={s.error}>Bài này không còn trong kho xuất bản hoặc chưa được cấp quyền đọc.</Text>}
   {lesson&&<>
    <View style={s.hero}><Text style={s.pill}>LỚP {lesson.grade} · {lesson.subject.toLocaleUpperCase()}</Text><Text style={s.title}>{lesson.title}</Text><Text style={s.sub}>{lesson.unit} · {lesson.topic}</Text></View>
    {!!lesson.outcomes.length&&<View style={s.card}><Text style={s.section}>🎯 Hôm nay em sẽ học</Text>{lesson.outcomes.map((x,i)=><View key={i} style={{flexDirection:'row',alignItems:'flex-start',gap:6}}><Text style={s.bodyText}>•</Text><View style={{flex:1}}><RichLine content={x} colors={shades} base={15}/></View></View>)}</View>}
    <View style={s.card}><Text style={s.section}>🌸 Cùng khám phá</Text><LessonRichView markdown={lesson.body} colors={shades}/></View>
    {lesson.imageUrls.map((url,i)=><View key={url+i} style={s.card}><Image source={{uri:url}} style={s.picture} contentFit="contain" cachePolicy="memory-disk"/><Text style={s.note}>Hình minh họa {i+1}</Text></View>)}
    {!!lesson.formulas.length&&<View style={s.card}><Text style={s.section}>🧮 Công thức</Text>{lesson.formulas.map((x,i)=><View key={i} style={s.formulaCard}><NativeFormula tex={x}/></View>)}</View>}
    {!!lesson.questions.length&&<View style={s.card}><Text style={s.section}>✏️ Em thử sức nhé!</Text><Text style={s.note}>Tự làm trước, chạm từng câu để kiểm tra đáp án.</Text>{lesson.questions.map((q,i)=>{
      const open=revealed.includes(i);return <Pressable key={i} accessibilityRole="button" style={s.question} onPress={()=>setRevealed(o=>open?o.filter(v=>v!==i):[...o,i])}>
       <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}><Text style={s.questionText}>{i+1}.</Text><View style={{flex:1}}><RichLine content={q.prompt} colors={shades} base={14} bold/></View></View><Text style={s.toggle}>{open?'Ẩn đáp án ▲':'Chạm để xem đáp án ▼'}</Text>
       {open&&<View><RichLine content={q.answer} colors={{...shades,text:'#265B45'}} base={14}/></View>}
      </Pressable>})}</View>}
    <View style={s.card}><Text style={s.section}>📚 Nguồn tham chiếu</Text><Text style={s.note}>{lesson.sourceTitle||'Nguồn đang được cập nhật'} · {lesson.curriculumRef}</Text><Text style={s.note}>Bài đã được kiểm duyệt trong Content Studio. Các hoạt động và đáp án chỉ mang tính hỗ trợ học tập.</Text></View>
   </>}
  </ScrollView>
 </ScreenContainer>;
}
const s=StyleSheet.create({formulaCard:{backgroundColor:'#FDF0F7',borderRadius:13,padding:10},body:{padding:16,gap:13,paddingBottom:54},hero:{backgroundColor:'#FBE0EB',borderRadius:24,padding:18,gap:8},pill:{fontSize:11,fontWeight:'900',color:'#A13D75'},title:{fontSize:25,fontWeight:'900',color:'#4E3043'},sub:{fontSize:13,color:'#866579'},card:{backgroundColor:'#FFF',borderRadius:21,borderWidth:1,borderColor:'#F5DDE7',padding:16,gap:10},section:{fontSize:18,color:'#A13D75',fontWeight:'900'},bodyText:{fontSize:15,lineHeight:24,color:'#554454'},note:{color:'#957A87',fontSize:12,lineHeight:18},picture:{width:'100%',height:235,backgroundColor:'#FFF8FA',borderRadius:14},question:{backgroundColor:'#FFF7FB',borderRadius:15,padding:14,gap:8},questionText:{color:'#493445',fontWeight:'800',fontSize:14,lineHeight:22},toggle:{color:'#A13D75',fontSize:12,fontWeight:'900'},answer:{color:'#265B45',fontSize:14,fontWeight:'700',lineHeight:22},error:{padding:15,color:'#B34155'}});
