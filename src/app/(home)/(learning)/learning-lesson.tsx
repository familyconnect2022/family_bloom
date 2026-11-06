import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useEffect,useState} from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import {Image} from 'expo-image';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {getPublishedLesson,type PublishedBloomLesson} from '../../../features/learning/publishedLessons';
import LessonRichView,{RichLine} from '../../../features/learning/LessonRichView';
import {NativeFormula} from '../../../features/study/StudyFormula';
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';

const shades = {get text(){return COLORS.primaryText},get muted(){return COLORS.secondaryText},get tint(){return COLORS.primary},get border(){return COLORS.border},get surface(){return COLORS.surface},get lightTint(){return COLORS.softSurface}};
export default function LearningLesson(){
  const __a3Colors = useA3Theme().colors;
  const __a3_s = useA3LegacyStyles(s);

  
 const router=useRouter();const {lessonId}=useLocalSearchParams<{lessonId:string}>();
 const [lesson,setLesson]=useState<PublishedBloomLesson|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [revealed,setRevealed]=useState<number[]>([]);
 useEffect(()=>{let current=true;setBusy(true);setError('');setLesson(null);
  getPublishedLesson(typeof lessonId==='string'?lessonId:'').then(item=>{if(current)setLesson(item)})
   .catch(e=>{if(current)setError('Không thể mở bài đã duyệt: '+String((e as Error).message||e))})
   .finally(()=>{if(current)setBusy(false)});
  return()=>{current=false};
 },[lessonId]);
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
  <BloomHeroHeader variant="learning" compact roundedBottom eyebrow="BLOOM EDUCATION" title="Bài học Super Bloom" subtitle="Khám phá · thực hành · ghi nhớ" onBack={()=>router.back()}/>
  <ScrollView contentContainerStyle={__a3_s.body}>
   {busy&&<ActivityIndicator color={__a3Colors.primary}/>}
   {!!error&&<Text style={__a3_s.error}>{error}</Text>}
   {!busy&&!error&&!lesson&&<Text style={__a3_s.error}>Bài này không còn trong kho xuất bản hoặc chưa được cấp quyền đọc.</Text>}
   {lesson&&<>
    <View style={__a3_s.hero}><Text style={__a3_s.pill}>LỚP {lesson.grade} · {lesson.subject.toLocaleUpperCase()}</Text><Text style={__a3_s.title}>{lesson.title}</Text><Text style={__a3_s.sub}>{lesson.unit} · {lesson.topic}</Text></View>
    {!!lesson.outcomes.length&&<View style={__a3_s.card}><Text style={__a3_s.section}>🎯 Hôm nay em sẽ học</Text>{lesson.outcomes.map((x,i)=><View key={i} style={{flexDirection:'row',alignItems:'flex-start',gap:6}}><Text style={__a3_s.bodyText}>•</Text><View style={{flex:1}}><RichLine content={x} colors={shades} base={15}/></View></View>)}</View>}
    <View style={__a3_s.card}><Text style={__a3_s.section}>🌸 Cùng khám phá</Text><LessonRichView markdown={lesson.body} colors={shades}/></View>
    {lesson.imageUrls.map((url,i)=><View key={url+i} style={__a3_s.card}><Image source={{uri:url}} style={__a3_s.picture} contentFit="contain" cachePolicy="memory-disk"/><Text style={__a3_s.note}>Hình minh họa {i+1}</Text></View>)}
    {!!lesson.formulas.length&&<View style={__a3_s.card}><Text style={__a3_s.section}>🧮 Công thức</Text>{lesson.formulas.map((x,i)=><View key={i} style={__a3_s.formulaCard}><NativeFormula tex={x}/></View>)}</View>}
    {!!lesson.questions.length&&<View style={__a3_s.card}><Text style={__a3_s.section}>✏️ Em thử sức nhé!</Text><Text style={__a3_s.note}>Tự làm trước, chạm từng câu để kiểm tra đáp án.</Text>{lesson.questions.map((q,i)=>{
      const open=revealed.includes(i);return <Pressable key={i} accessibilityRole="button" style={__a3_s.question} onPress={()=>setRevealed(o=>open?o.filter(v=>v!==i):[...o,i])}>
       <View style={{flexDirection:'row',alignItems:'flex-start',gap:6}}><Text style={__a3_s.questionText}>{i+1}.</Text><View style={{flex:1}}><RichLine content={q.prompt} colors={shades} base={14} bold/></View></View><Text style={__a3_s.toggle}>{open?'Ẩn đáp án ▲':'Chạm để xem đáp án ▼'}</Text>
       {open&&<View><RichLine content={q.answer} colors={{...shades,text:__a3Colors.primaryText}} base={14}/></View>}
      </Pressable>})}</View>}
    <View style={__a3_s.card}><Text style={__a3_s.section}>📚 Nguồn tham chiếu</Text><Text style={__a3_s.note}>{lesson.sourceTitle||'Nguồn đang được cập nhật'} · {lesson.curriculumRef}</Text><Text style={__a3_s.note}>Bài đã được kiểm duyệt trong Content Studio. Các hoạt động và đáp án chỉ mang tính hỗ trợ học tập.</Text></View>
   </>}
  </ScrollView>
 </ScreenContainer>;
}
const s=createBloomStyles(() => StyleSheet.create({formulaCard:{backgroundColor:COLORS.surface,borderRadius:13,padding:10},body:{padding:16,gap:13,paddingBottom:54},hero:{backgroundColor:COLORS.softSurface,borderRadius:24,padding:18,gap:8},pill:{fontSize:11,fontWeight:'900',color:COLORS.primary},title:{fontSize:25,fontWeight:'900',color:COLORS.primaryText},sub:{fontSize:13,color:COLORS.secondaryText},card:{backgroundColor:COLORS.surface,borderRadius:21,borderWidth:1,borderColor:COLORS.border,padding:16,gap:10},section:{fontSize:18,color:COLORS.primary,fontWeight:'900'},bodyText:{fontSize:15,lineHeight:24,color:COLORS.primaryText},note:{color:COLORS.secondaryText,fontSize:12,lineHeight:18},picture:{width:'100%',height:235,backgroundColor:COLORS.surface,borderRadius:14},question:{backgroundColor:COLORS.surface,borderRadius:15,padding:14,gap:8},questionText:{color:COLORS.primaryText,fontWeight:'800',fontSize:14,lineHeight:22},toggle:{color:COLORS.primary,fontSize:12,fontWeight:'900'},answer:{color:COLORS.primaryText,fontSize:14,fontWeight:'700',lineHeight:22},error:{padding:15,color:COLORS.primary}}));
