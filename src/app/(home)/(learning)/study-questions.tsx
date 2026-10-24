import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect,useRouter} from 'expo-router';
import React,{useCallback,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {useAuth} from '../../../context/AuthContext';
import {studyRepository,STUDY_PAGE_SIZE,STUDY_SUBJECTS,studyTimestamp,subjectName,type StudyQuestion} from '../../../features/study/studyRepository';
import {studyErrorMessage} from '../../../features/study/studyFeedback';

const memoized=new Map<string,{items:StudyQuestion[];expires:number;cursor:any;hasMore:boolean}>();
const QuestionRow=React.memo(function QuestionRow({item,onOpen}:{item:StudyQuestion;onOpen:(id:string)=>void}){
 const date=studyTimestamp(item.createdAt);
 return <Pressable style={s.card} onPress={()=>onOpen(item.id)} accessibilityRole="button">
  <View style={s.top}><View style={s.chip}><Text style={s.chipText}>{subjectName(item.subject)} · Lớp {item.grade}</Text></View>{!!item.acceptedAnswerId&&<Ionicons name="checkmark-circle" color="#36916C" size={19}/>}</View>
  <Text style={s.title} numberOfLines={2}>{item.title}</Text>
  <Text style={s.preview} numberOfLines={2}>{item.blocks?.find(x=>x.kind==='text')?.value||'Câu hỏi có công thức hoặc hình ảnh'}</Text>
  <View style={s.meta}><Text style={s.author}>{item.authorName||'Thành viên'} · {date?new Date(date).toLocaleDateString('vi-VN'):''}</Text><Ionicons name="chevron-forward" color="#C8739D" size={17}/></View>
 </Pressable>;
});
export default function StudyQuestions(){
 const router=useRouter(),{activeFamilyId}=useAuth();
 const [items,setItems]=useState<StudyQuestion[]>([]),[cursor,setCursor]=useState<any>(),[hasMore,setHasMore]=useState(true);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[subject,setSubject]=useState('all'),[term,setTerm]=useState('');
 const busyRef=useRef(false),cursorRef=useRef<any>(),moreRef=useRef(true),epoch=useRef(0);
 const load=useCallback(async(reset:boolean)=>{
  if(!activeFamilyId||busyRef.current||(!reset&&!moreRef.current))return;
  const requestEpoch=epoch.current;busyRef.current=true;setLoading(true);setError('');
  try{
   const data=await studyRepository.listQuestions(activeFamilyId,reset?undefined:cursorRef.current,STUDY_PAGE_SIZE);
   if(requestEpoch!==epoch.current)return;
   cursorRef.current=data.cursor;moreRef.current=data.hasMore;setCursor(data.cursor);setHasMore(data.hasMore);
   setItems(prev=>{const next=reset?data.items:[...prev,...data.items.filter(x=>!prev.some(y=>y.id===x.id))];memoized.set(activeFamilyId,{items:next,expires:Date.now()+60_000,cursor:data.cursor,hasMore:data.hasMore});return next});
  }catch(e){if(requestEpoch===epoch.current)setError(studyErrorMessage(e,'tải câu hỏi').message);}finally{busyRef.current=false;if(requestEpoch===epoch.current)setLoading(false)}
 },[activeFamilyId]);
 useFocusEffect(useCallback(()=>{
  epoch.current+=1;const cached=activeFamilyId&&memoized.get(activeFamilyId);
  if(cached?.expires&&cached.expires>Date.now()){setItems(cached.items);}
  cursorRef.current=undefined;moreRef.current=true;setCursor(undefined);setHasMore(true);void load(true);
  return()=>{epoch.current+=1;busyRef.current=false};
 },[activeFamilyId,load]));
 const shown=useMemo(()=>items.filter(x=>(subject==='all'||x.subject===subject)&&(!term.trim()||[x.title,x.authorName].join(' ').toLocaleLowerCase('vi').includes(term.trim().toLocaleLowerCase('vi')))),[items,subject,term]);
 const open=useCallback((id:string)=>router.push({pathname:'/study-question-detail',params:{questionId:id}} as never),[router]);
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
  <FlatList data={shown} keyExtractor={x=>x.id} renderItem={({item})=><QuestionRow item={item} onOpen={open}/>} removeClippedSubviews initialNumToRender={7} maxToRenderPerBatch={6} windowSize={5} contentContainerStyle={s.list}
   ListHeaderComponent={<View style={s.header}><BloomHeroHeader variant="generic" compact roundedBottom eyebrow="SUPER BLOOM" title="Cả nhà cùng giải" subtitle="Hỏi điều chưa rõ, cùng nhau tìm lời giải" onBack={()=>router.back()}/>
    <View style={s.searchBox}><Ionicons name="search-outline" size={20} color="#B46591"/><TextInput style={{flex:1,fontSize:14,color:'#5D4353'}} placeholder="Tìm câu hỏi đã tải…" value={term} onChangeText={setTerm} placeholderTextColor="#9D7D8C"/></View>
    <View style={s.actions}><Pressable style={s.ask} onPress={()=>router.push('/study-question-compose' as never)} accessibilityRole="button"><Ionicons name="add-circle" size={24} color="#FFF"/><Text style={s.askText}>Đặt câu hỏi cho cả nhà</Text></Pressable></View>
    <FlatList horizontal data={[{key:'all',label:'Tất cả'},...STUDY_SUBJECTS.map(([key,label])=>({key,label}))]} keyExtractor={x=>x.key} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8,paddingHorizontal:16,paddingVertical:8}} renderItem={({item})=><Pressable onPress={()=>setSubject(item.key)} style={[s.subject,subject===item.key&&s.active]}><Text style={[s.subjectText,subject===item.key&&{color:'#FFF'}]}>{item.label}</Text></Pressable>}/>
    <Text style={s.note}>Danh sách chỉ tải tối đa {STUDY_PAGE_SIZE} câu hỏi mỗi lượt. Bộ lọc tìm trong các bài đã tải.</Text>
   </View>}
   ListEmptyComponent={!loading?<Text style={s.empty}>{error?'Không thể tải câu hỏi: '+error:'Chưa có câu hỏi phù hợp. Hãy là người đầu tiên đặt câu hỏi nhé!'}</Text>:null}
   ListFooterComponent={<View style={s.footer}>{loading&&<ActivityIndicator color="#A4437B"/>}{!loading&&hasMore&&<Pressable style={s.more} onPress={()=>void load(false)}><Text style={s.moreText}>Xem thêm câu hỏi</Text></Pressable>}{!!error&&!!items.length&&<Text style={s.empty}>{error}</Text>}</View>}/>
 </ScreenContainer>
}
const s=StyleSheet.create({list:{paddingBottom:60,gap:11},header:{gap:12,marginBottom:4},searchBox:{marginHorizontal:16,flexDirection:'row',gap:9,alignItems:'center',backgroundColor:'#FFF',paddingHorizontal:14,borderRadius:17,borderWidth:1,borderColor:'#F0CFE0',minHeight:49},actions:{marginHorizontal:16},ask:{backgroundColor:'#B14882',minHeight:62,borderRadius:20,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:11},askText:{color:'#FFF',fontWeight:'900',fontSize:16},subject:{borderRadius:20,borderWidth:1,borderColor:'#F0D7E4',backgroundColor:'#FFF',paddingVertical:9,paddingHorizontal:12},active:{backgroundColor:'#A4437B',borderColor:'#A4437B'},subjectText:{fontSize:12,fontWeight:'800',color:'#835B71'},note:{marginHorizontal:16,color:'#8B7584',fontSize:11},card:{marginHorizontal:16,backgroundColor:'#FFF',borderColor:'#F0D9E5',borderWidth:1,borderRadius:20,padding:17,gap:9},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},chip:{backgroundColor:'#FBE8F1',borderRadius:13,paddingHorizontal:9,paddingVertical:5},chipText:{fontWeight:'800',color:'#A04578',fontSize:11},title:{fontSize:17,fontWeight:'900',color:'#56394C'},preview:{fontSize:13,lineHeight:19,color:'#846C7D'},meta:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},author:{color:'#9A7D8C',fontSize:11},footer:{minHeight:50,alignItems:'center',justifyContent:'center',marginTop:8},more:{backgroundColor:'#B14882',borderRadius:14,paddingVertical:13,paddingHorizontal:40},moreText:{color:'#FFF',fontWeight:'900'},empty:{marginHorizontal:16,textAlign:'center',padding:25,color:'#856B7E'}});
