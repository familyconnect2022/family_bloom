import { BloomScaledInput } from '../../../components/ui/BloomScaledInput';
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import {useRouter} from 'expo-router';
import React,{useCallback,useRef,useState} from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import {ScreenContainer} from '../../../components/layout/ScreenContainer';
import {BloomKeyboardScreen,useBloomKeyboardFocus} from '../../../components/layout/BloomKeyboardScreen';
import {useBloomToast} from '../../../components/ui/BloomToast';
import {BloomHeroHeader} from '../../../components/ui/BloomHeroHeader';
import {COLORS} from '../../../constants/theme';
import {useAuth} from '../../../context/AuthContext';
import {StudyComposer} from '../../../features/study/StudyComposer';
import {studyRepository,STUDY_SUBJECTS,type StudySubject} from '../../../features/study/studyRepository';
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';

export default function StudyQuestionCompose(){
  const __a3Colors = useA3Theme().colors;
  const __a3_s = useA3LegacyStyles(s);

  
 const router=useRouter(),{user,userProfile,activeFamilyId}=useAuth();
 const {showToast}=useBloomToast();
 const titleRef=useRef<BloomScaledInput>(null);
 const [title,setTitle]=useState(''),[subject,setSubject]=useState<StudySubject>('math'),[grade,setGrade]=useState(6);
 const validateBeforeUpload=useCallback(()=>{if(title.trim())return true;showToast({title:'Đặt tên cho câu hỏi 🌸',message:'Hãy nhập một tiêu đề ngắn để cả nhà dễ tìm bài nhé.',type:'warning'});titleRef.current?.focus();return false;},[title,showToast]);
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
  <BloomHeroHeader variant="learning" compact roundedBottom eyebrow="CẢ NHÀ CÙNG GIẢI" title="Đặt câu hỏi" subtitle="Một câu hỏi nhỏ, cả nhà cùng tìm lời giải" onBack={()=>router.back()}/>
  <BloomKeyboardScreen contentContainerStyle={__a3_s.content}>
   <StudyTitleField inputRef={titleRef} title={title} setTitle={setTitle} />
   <View style={__a3_s.card}>
    <Text style={__a3_s.label}>Chọn môn học</Text><View style={__a3_s.chips}>{STUDY_SUBJECTS.map(([id,name])=><Pressable key={id} style={[__a3_s.chip,subject===id&&__a3_s.selected]} onPress={()=>setSubject(id)}><Text style={[__a3_s.chipText,subject===id&&__a3_s.white]}>{name}</Text></Pressable>)}</View>
    <Text style={__a3_s.label}>Lớp học</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{Array.from({length:12},(_,i)=>i+1).map(g=><Pressable key={g} style={[__a3_s.chip,grade===g&&__a3_s.selected]} onPress={()=>setGrade(g)}><Text style={[__a3_s.chipText,grade===g&&__a3_s.white]}>{g}</Text></Pressable>)}</ScrollView>
   </View>
   {activeFamilyId&&user?<View style={__a3_s.card}><StudyComposer familyId={activeFamilyId} uid={user.uid} submitText="Đăng câu hỏi" validateBeforeUpload={validateBeforeUpload} onSubmit={async(blocks,images)=>{
    if(!title.trim())throw Error('Hãy nhập tiêu đề câu hỏi.');
    const id=await studyRepository.createQuestion(activeFamilyId,user.uid,userProfile?.displayName||'Người nhà',title,subject,grade,blocks,images);
    router.replace({pathname:'/study-question-detail',params:{questionId:id}} as never);
   }}/></View>:<Text>Hãy đăng nhập và chọn gia đình trước khi đăng câu hỏi.</Text>}
  </BloomKeyboardScreen>
 </ScreenContainer>
}
function StudyTitleField({inputRef,title,setTitle}:{inputRef:React.RefObject<BloomScaledInput|null>;title:string;setTitle:(value:string)=>void}){
  const __a3Colors = useA3Theme().colors;
  const __a3_s = useA3LegacyStyles(s);

  
  
 const {revealInput}=useBloomKeyboardFocus();
 return <View style={__a3_s.card}><Text style={__a3_s.label}>Tiêu đề câu hỏi</Text><BloomScaledInput ref={inputRef} placeholder="Ví dụ: Cách giải phương trình bậc hai" value={title} onChangeText={setTitle} maxLength={160} style={__a3_s.titleInput} placeholderTextColor={__a3Colors.muted} onFocus={()=>revealInput(inputRef.current,32)}/></View>;
}
const s=createBloomStyles(() => StyleSheet.create({content:{padding:16,paddingBottom:60,gap:14},card:{backgroundColor:COLORS.surface,borderRadius:22,padding:17,gap:13,borderWidth:1,borderColor:COLORS.border},label:{fontSize:14,fontWeight:'900',color:COLORS.primaryText},titleInput:{backgroundColor:COLORS.surface,borderRadius:14,padding:12,fontSize:15,color:COLORS.primaryText,borderWidth:1,borderColor:COLORS.border},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{backgroundColor:COLORS.surface,borderRadius:19,paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:COLORS.border},selected:{backgroundColor:COLORS.selectedBackground,borderColor:COLORS.border},chipText:{color:COLORS.secondaryText,fontWeight:'800',fontSize:12},white:{color:COLORS.white}}));
