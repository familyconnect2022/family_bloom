import { BloomScaledInput } from '../../../components/ui/BloomScaledInput';
import { getBloomStatusBarStyle } from "../../../constants/theme";
import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import {StatusBar} from 'expo-status-bar';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {listPublishedLessons,type PublishedBloomLesson} from '../../../features/learning/publishedLessons';
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';

const subjects:Record<string,string>={math:'Toán',vietnamese:'Tiếng Việt',literature:'Ngữ văn',english:'Tiếng Anh',physics:'Vật lí',chemistry:'Hóa học'};
export default function LearningLibrary(){
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_s = useA3LegacyStyles(s);

  
 const router=useRouter();const [items,setItems]=useState<PublishedBloomLesson[]>([]);const [cursor,setCursor]=useState<any>(null);
 const [more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [subject,setSubject]=useState('all'),[grade,setGrade]=useState(0),[search,setSearch]=useState('');
 const fetchPage=useCallback(async(reset=false)=>{
  if(busy&&!reset)return;setBusy(true);setError('');
  try{const result=await listPublishedLessons(reset?undefined:cursor);
   setItems(old=>reset?result.lessons:[...old,...result.lessons.filter(x=>!old.some(v=>v.id===x.id))]);
   setCursor(result.cursor);setMore(result.hasMore);
  }catch(e){setError('Chưa tải được bài học. Kiểm tra Internet, đăng nhập và Firestore Rules. '+String((e as Error)?.message||e));}
  finally{setBusy(false)}
 },[cursor,busy]);
 useEffect(()=>{void fetchPage(true)},[]); // No root listener; only fetch when opened.
 const shown=items.filter(x=>(subject==='all'||x.subject===subject)&&(!grade||x.grade===grade)&&
  (!search.trim()||[x.title,x.unit,x.topic].join(' ').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))));
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
  <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} translucent backgroundColor="transparent"/>
  <BloomHeroHeader variant="learning" compact roundedBottom eyebrow="BLOOM EDUCATION" title="Góc học tập" subtitle="Chỉ những bài đã được kiểm duyệt trong Content Studio" onBack={()=>router.back()}/>
  <ScrollView contentContainerStyle={__a3_s.body} keyboardShouldPersistTaps="handled">
   <Pressable style={__a3_s.qaCard} onPress={()=>router.push('/study-questions' as never)} accessibilityRole="button">
    <View style={__a3_s.qaIcon}><Ionicons name="chatbubbles-outline" size={25} color={__a3Colors.primary}/></View>
    <View style={{flex:1,gap:5}}><Text style={__a3_s.qaTitle}>Cả nhà cùng giải</Text><Text style={__a3_s.qaSubtitle}>Đặt câu hỏi, giải Toán · Lý · Hóa và chia sẻ cách học cùng nhau</Text></View>
    <Ionicons name="chevron-forward" size={19} color={__a3Colors.primary}/>
   </Pressable>
   <BloomScaledInput style={__a3_s.input} value={search} onChangeText={setSearch} placeholder="Tìm tên bài học, chương, chủ đề…" placeholderTextColor={__a3Colors.secondaryText}/>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={__a3_s.filters}>
    {['all',...Object.keys(subjects)].map(k=><Pressable key={k} onPress={()=>setSubject(k)} style={[__a3_s.filter,subject===k&&__a3_s.active]}><Text style={[__a3_s.filterText,subject===k&&__a3_s.activeText]}>{subjects[k]||'Tất cả môn'}</Text></Pressable>)}
   </ScrollView>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={__a3_s.filters}>
    {[0,...Array.from({length:12},(_,i)=>i+1)].map(g=><Pressable key={g} onPress={()=>setGrade(g)} style={[__a3_s.gradeChip,grade===g&&__a3_s.active]}><Text style={[__a3_s.filterText,grade===g&&__a3_s.activeText]}>{g?'Lớp '+g:'Mọi lớp'}</Text></Pressable>)}
   </ScrollView>
   <Text style={__a3_s.meta}>Đã tải {items.length} bài đã duyệt từ Firebase · {shown.length} bài đang hiển thị</Text>
   {shown.map(x=><Pressable key={x.id} onPress={()=>router.push({pathname:'/learning-lesson',params:{lessonId:x.id}} as never)} style={({pressed})=>[__a3_s.card,pressed&&{opacity:.72}]}>
    <View style={__a3_s.cardTop}><Text style={__a3_s.eyebrow}>{subjects[x.subject]||x.subject} · LỚP {x.grade}</Text><Ionicons name="chevron-forward" color={__a3Colors.primary} size={18}/></View>
    <Text style={__a3_s.title}>{x.title}</Text><Text style={__a3_s.caption}>{x.unit} · {x.topic||'Bài học Super Bloom'}</Text>
    <Text style={__a3_s.tag}>📖 Bài học · {x.questions.length} câu hỏi</Text>
   </Pressable>)}
   {!!error&&<View style={__a3_s.warn}><Text style={__a3_s.warnText}>{error}</Text><Pressable onPress={()=>void fetchPage(true)}><Text style={__a3_s.link}>Thử tải lại</Text></Pressable></View>}
   {!busy&&!error&&!items.length&&<Text style={__a3_s.empty}>Chưa có bài được xuất bản. Hãy duyệt và đồng bộ từ Bloom Content Studio trước.</Text>}
   {busy&&<ActivityIndicator color={__a3Colors.primary} size="large"/>}
   {more&&!busy&&<Pressable style={__a3_s.more} onPress={()=>void fetchPage(false)}><Text style={__a3_s.moreText}>Tải thêm bài đã duyệt</Text></Pressable>}
  </ScrollView>
 </ScreenContainer>;
}
const s=createBloomStyles(() => StyleSheet.create({qaCard:{backgroundColor:COLORS.surface,borderRadius:22,padding:15,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',alignItems:'center',gap:12},qaIcon:{height:51,width:51,borderRadius:16,backgroundColor:COLORS.surface,alignItems:'center',justifyContent:'center'},qaTitle:{fontWeight:'900',color:COLORS.primary,fontSize:17},qaSubtitle:{color:COLORS.secondaryText,fontSize:12,lineHeight:17},body:{padding:16,gap:12,paddingBottom:55},input:{borderRadius:16,borderColor:COLORS.border,borderWidth:1,backgroundColor:COLORS.surface,fontSize:15,padding:13,color:COLORS.primaryText},filters:{gap:8,paddingVertical:4},filter:{backgroundColor:COLORS.surface,paddingHorizontal:13,paddingVertical:9,borderRadius:19,borderWidth:1,borderColor:COLORS.border},gradeChip:{backgroundColor:COLORS.surface,paddingHorizontal:12,paddingVertical:7,borderRadius:17,borderWidth:1,borderColor:COLORS.border},active:{backgroundColor:COLORS.selectedBackground,borderColor:COLORS.border},filterText:{color:COLORS.secondaryText,fontWeight:'700',fontSize:12},activeText:{color:COLORS.white},meta:{color:COLORS.secondaryText,fontSize:11},card:{borderRadius:20,padding:17,backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,gap:6},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:11,color:COLORS.primary,fontWeight:'900'},title:{fontSize:17,color:COLORS.primaryText,fontWeight:'900'},caption:{fontSize:12,color:COLORS.secondaryText},tag:{fontSize:12,color:COLORS.primary,fontWeight:'800',marginTop:5},warn:{padding:14,backgroundColor:COLORS.surface,borderRadius:15,gap:8},warnText:{color:COLORS.primary},link:{color:COLORS.primary,fontWeight:'900'},empty:{padding:18,fontSize:14,textAlign:'center',color:COLORS.secondaryText},more:{padding:15,borderRadius:15,backgroundColor:COLORS.selectedBackground,alignItems:'center'},moreText:{color:COLORS.white,fontWeight:'900'}}));
