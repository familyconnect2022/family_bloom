import React,{useMemo,useCallback,useState} from 'react';
import {useRouter,useFocusEffect} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../../../context/AuthContext';
import {useA3Theme} from '../../../appearance3/useAppearance3';
import {nativeDraftRequest} from '../../../features/learning/familyDocument/draftRequest';
import {NativeFormula} from '../../../features/study/StudyFormula';
import {FamilyArticles} from '../../../features/learning/FamilyArticles';
export default function LearningArticles(){const [epoch,setEpoch]=useState(0);useFocusEffect(useCallback(()=>{setEpoch(x=>x+1);},[]));const router=useRouter(),{user,activeFamilyId,activeMembership}=useAuth(),{colors}=useA3Theme();const request=useMemo(()=>user&&activeFamilyId?async(body:Record<string,unknown>)=>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),35000);try{return await nativeDraftRequest(user.uid,activeFamilyId,body,ctrl.signal);}finally{clearTimeout(timer);}}:null,[user?.uid,activeFamilyId]);if(!request||!user||!activeFamilyId||activeMembership?.familyId!==activeFamilyId)return null;return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><FamilyArticles key={JSON.stringify([user.uid,activeFamilyId,epoch])} request={request} uid={user.uid} colors={colors} syncEnabled renderFormula={tex=><NativeFormula tex={tex}/>} onEditor={()=>router.push({pathname:'/learning-editor',params:{publish:'1'}} as never)} onBack={()=>router.canGoBack()?router.back():router.replace('/learning-library' as never)}/></SafeAreaView>;}
