import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {listPublishedLessons,type PublishedBloomLesson} from '../../../features/learning/publishedLessons';
const subjects:Record<string,string>={math:'Toán',vietnamese:'Tiếng Việt',literature:'Ngữ văn',english:'Tiếng Anh',physics:'Vật lí',chemistry:'Hóa học'};
export default function LearningLibrary(){
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
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
  <StatusBar style="dark" translucent backgroundColor="transparent"/>
  <BloomHeroHeader variant="generic" compact roundedBottom eyebrow="BLOOM EDUCATION" title="Góc học tập" subtitle="Chỉ những bài đã được kiểm duyệt trong Content Studio" onBack={()=>router.back()}/>
  <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
   <Pressable style={s.qaCard} onPress={()=>router.push('/study-questions' as never)} accessibilityRole="button">
    <View style={s.qaIcon}><Ionicons name="chatbubbles-outline" size={25} color="#A4437B"/></View>
    <View style={{flex:1,gap:5}}><Text style={s.qaTitle}>Cả nhà cùng giải</Text><Text style={s.qaSubtitle}>Đặt câu hỏi, giải Toán · Lý · Hóa và chia sẻ cách học cùng nhau</Text></View>
    <Ionicons name="chevron-forward" size={19} color="#A4437B"/>
   </Pressable>
   <TextInput style={s.input} value={search} onChangeText={setSearch} placeholder="Tìm tên bài học, chương, chủ đề…" placeholderTextColor="#947886"/>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
    {['all',...Object.keys(subjects)].map(k=><Pressable key={k} onPress={()=>setSubject(k)} style={[s.filter,subject===k&&s.active]}><Text style={[s.filterText,subject===k&&s.activeText]}>{subjects[k]||'Tất cả môn'}</Text></Pressable>)}
   </ScrollView>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
    {[0,...Array.from({length:12},(_,i)=>i+1)].map(g=><Pressable key={g} onPress={()=>setGrade(g)} style={[s.gradeChip,grade===g&&s.active]}><Text style={[s.filterText,grade===g&&s.activeText]}>{g?'Lớp '+g:'Mọi lớp'}</Text></Pressable>)}
   </ScrollView>
   <Text style={s.meta}>Đã tải {items.length} bài đã duyệt từ Firebase · {shown.length} bài đang hiển thị</Text>
   {shown.map(x=><Pressable key={x.id} onPress={()=>router.push({pathname:'/learning-lesson',params:{lessonId:x.id}} as never)} style={({pressed})=>[s.card,pressed&&{opacity:.72}]}>
    <View style={s.cardTop}><Text style={s.eyebrow}>{subjects[x.subject]||x.subject} · LỚP {x.grade}</Text><Ionicons name="chevron-forward" color={COLORS.primary} size={18}/></View>
    <Text style={s.title}>{x.title}</Text><Text style={s.caption}>{x.unit} · {x.topic||'Bài học Super Bloom'}</Text>
    <Text style={s.tag}>📖 Bài học · {x.questions.length} câu hỏi</Text>
   </Pressable>)}
   {!!error&&<View style={s.warn}><Text style={s.warnText}>{error}</Text><Pressable onPress={()=>void fetchPage(true)}><Text style={s.link}>Thử tải lại</Text></Pressable></View>}
   {!busy&&!error&&!items.length&&<Text style={s.empty}>Chưa có bài được xuất bản. Hãy duyệt và đồng bộ từ Bloom Content Studio trước.</Text>}
   {busy&&<ActivityIndicator color={COLORS.primary} size="large"/>}
   {more&&!busy&&<Pressable style={s.more} onPress={()=>void fetchPage(false)}><Text style={s.moreText}>Tải thêm bài đã duyệt</Text></Pressable>}
  </ScrollView>
 </ScreenContainer>;
}
const s=StyleSheet.create({qaCard:{backgroundColor:'#FFE6F1',borderRadius:22,padding:15,borderWidth:1,borderColor:'#F2C2D8',flexDirection:'row',alignItems:'center',gap:12},qaIcon:{height:51,width:51,borderRadius:16,backgroundColor:'#FFF7FB',alignItems:'center',justifyContent:'center'},qaTitle:{fontWeight:'900',color:'#753F5A',fontSize:17},qaSubtitle:{color:'#855A73',fontSize:12,lineHeight:17},body:{padding:16,gap:12,paddingBottom:55},input:{borderRadius:16,borderColor:'#F3CCD9',borderWidth:1,backgroundColor:'#FFF',fontSize:15,padding:13,color:'#51364B'},filters:{gap:8,paddingVertical:4},filter:{backgroundColor:'#FFF',paddingHorizontal:13,paddingVertical:9,borderRadius:19,borderWidth:1,borderColor:'#EFDFE6'},gradeChip:{backgroundColor:'#FFF',paddingHorizontal:12,paddingVertical:7,borderRadius:17,borderWidth:1,borderColor:'#EFDFE6'},active:{backgroundColor:'#B3437B',borderColor:'#B3437B'},filterText:{color:'#745B67',fontWeight:'700',fontSize:12},activeText:{color:'#FFF'},meta:{color:'#937687',fontSize:11},card:{borderRadius:20,padding:17,backgroundColor:'#FFF',borderColor:'#F2D6E1',borderWidth:1,gap:6},cardTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:11,color:'#A13D75',fontWeight:'900'},title:{fontSize:17,color:'#493547',fontWeight:'900'},caption:{fontSize:12,color:'#856B79'},tag:{fontSize:12,color:'#A13D75',fontWeight:'800',marginTop:5},warn:{padding:14,backgroundColor:'#FFF0E8',borderRadius:15,gap:8},warnText:{color:'#A54C27'},link:{color:'#A13D75',fontWeight:'900'},empty:{padding:18,fontSize:14,textAlign:'center',color:'#957480'},more:{padding:15,borderRadius:15,backgroundColor:'#A13D75',alignItems:'center'},moreText:{color:'#FFF',fontWeight:'900'}});
