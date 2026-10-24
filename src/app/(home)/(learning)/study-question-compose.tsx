import {useRouter} from 'expo-router';
import React,{useCallback,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomKeyboardScreen,useBloomKeyboardFocus} from '../../../components/layout/BloomKeyboardScreen';
import {useBloomToast} from '../../../components/ui/BloomToast';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {useAuth} from '../../../context/AuthContext';
import {StudyComposer} from '../../../features/study/StudyComposer';
import {studyRepository,STUDY_SUBJECTS,type StudySubject} from '../../../features/study/studyRepository';
export default function StudyQuestionCompose(){
 const router=useRouter(),{user,userProfile,activeFamilyId}=useAuth();
 const {showToast}=useBloomToast();
 const titleRef=useRef<TextInput>(null);
 const [title,setTitle]=useState(''),[subject,setSubject]=useState<StudySubject>('math'),[grade,setGrade]=useState(6);
 const validateBeforeUpload=useCallback(()=>{if(title.trim())return true;showToast({title:'Đặt tên cho câu hỏi 🌸',message:'Hãy nhập một tiêu đề ngắn để cả nhà dễ tìm bài nhé.',type:'warning'});titleRef.current?.focus();return false;},[title,showToast]);
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
  <BloomHeroHeader variant="generic" compact roundedBottom eyebrow="CẢ NHÀ CÙNG GIẢI" title="Đặt câu hỏi" subtitle="Một câu hỏi nhỏ, cả nhà cùng tìm lời giải" onBack={()=>router.back()}/>
  <BloomKeyboardScreen contentContainerStyle={s.content}>
   <StudyTitleField inputRef={titleRef} title={title} setTitle={setTitle} />
   <View style={s.card}>
    <Text style={s.label}>Chọn môn học</Text><View style={s.chips}>{STUDY_SUBJECTS.map(([id,name])=><Pressable key={id} style={[s.chip,subject===id&&s.selected]} onPress={()=>setSubject(id)}><Text style={[s.chipText,subject===id&&s.white]}>{name}</Text></Pressable>)}</View>
    <Text style={s.label}>Lớp học</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{Array.from({length:12},(_,i)=>i+1).map(g=><Pressable key={g} style={[s.chip,grade===g&&s.selected]} onPress={()=>setGrade(g)}><Text style={[s.chipText,grade===g&&s.white]}>{g}</Text></Pressable>)}</ScrollView>
   </View>
   {activeFamilyId&&user?<View style={s.card}><StudyComposer familyId={activeFamilyId} uid={user.uid} submitText="Đăng câu hỏi" validateBeforeUpload={validateBeforeUpload} onSubmit={async(blocks,images)=>{
    if(!title.trim())throw Error('Hãy nhập tiêu đề câu hỏi.');
    const id=await studyRepository.createQuestion(activeFamilyId,user.uid,userProfile?.displayName||'Người nhà',title,subject,grade,blocks,images);
    router.replace({pathname:'/study-question-detail',params:{questionId:id}} as never);
   }}/></View>:<Text>Hãy đăng nhập và chọn gia đình trước khi đăng câu hỏi.</Text>}
  </BloomKeyboardScreen>
 </ScreenContainer>
}
function StudyTitleField({inputRef,title,setTitle}:{inputRef:React.RefObject<TextInput|null>;title:string;setTitle:(value:string)=>void}){
 const {revealInput}=useBloomKeyboardFocus();
 return <View style={s.card}><Text style={s.label}>Tiêu đề câu hỏi</Text><TextInput ref={inputRef} placeholder="Ví dụ: Cách giải phương trình bậc hai" value={title} onChangeText={setTitle} maxLength={160} style={s.titleInput} placeholderTextColor="#AB91A0" onFocus={()=>revealInput(inputRef.current,32)}/></View>;
}
const s=StyleSheet.create({content:{padding:16,paddingBottom:60,gap:14},card:{backgroundColor:'#FFF',borderRadius:22,padding:17,gap:13,borderWidth:1,borderColor:'#F0D7E3'},label:{fontSize:14,fontWeight:'900',color:'#694058'},titleInput:{backgroundColor:'#FFF8FC',borderRadius:14,padding:12,fontSize:15,color:'#53364B',borderWidth:1,borderColor:'#F4DEE9'},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{backgroundColor:'#FFF7FA',borderRadius:19,paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:'#F2DDE9'},selected:{backgroundColor:'#A4437B',borderColor:'#A4437B'},chipText:{color:'#875E75',fontWeight:'800',fontSize:12},white:{color:'#FFF'}});
