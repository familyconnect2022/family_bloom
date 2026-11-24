/** Opens the existing rich Android FamilyGraphPersonSheet for ANY saved person,
 * including people not yet connected to a rendered tree branch.
 */
import {useMemo} from 'react';
import {ActivityIndicator,Pressable,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useAuth} from '../../../context/AuthContext';
import {useFamilyGraph} from '../../../hooks/family/useFamilyGraph';
import {FamilyGraphPersonSheet} from '../../../components/familyGraph/FamilyGraphPersonSheet';
import type {FamilyGraphPrototypePerson} from '../../../components/familyGraph/familyGraphPrototypeData';
import {useA3Theme} from '../../../appearance3/useAppearance3';

export default function FamilyGraphPersonDetailRoute(){
 const router=useRouter();const {personId:rawId}=useLocalSearchParams<{personId?:string}>();
 const personId=typeof rawId==='string'?rawId:'';
 const {user,userProfile,families}=useAuth();
 const familyId=userProfile?.activeFamilyId??null;
 const {colors}=useA3Theme();
 const {snapshot,loading,error}=useFamilyGraph(familyId,user?.uid,!!personId);
 const isAdmin=families.some(x=>x.familyId===familyId&&(x.role==='admin'||x.role==='owner'));
 const person=snapshot.persons.find(x=>x.id===personId);
 const directRelationships=useMemo(()=>snapshot.relationships.filter(r=>r.personAId===personId||r.personBId===personId).map(r=>{
  const other=snapshot.persons.find(p=>p.id===(r.personAId===personId?r.personBId:r.personAId));
  return {id:r.id,type:r.type,label:r.type==='partner'?`Bạn đời / vợ chồng: ${other?.displayName??'Không rõ'}`:
    r.personAId===personId?`Con: ${other?.displayName??'Không rõ'}`:`Cha/mẹ: ${other?.displayName??'Không rõ'}`};
 }),[snapshot,personId]);
 const displayPerson:FamilyGraphPrototypePerson|null=useMemo(()=>!person?null:{
  id:person.id,displayName:person.displayName,shortName:person.nickname||person.displayName,gender:person.gender==='male'||person.gender==='female'?person.gender:'unknown',
  birthYear:person.birthYear??undefined,birthDate:person.birthDate??undefined,deathYear:person.deathYear??undefined,deathDate:person.deathDate??undefined,
  generation:0,linkedAccount:!!person.linkedUid,linkedUid:person.linkedUid??undefined,avatarUrl:person.avatarUrl??undefined,
  lifeStatus:person.lifeStatus,birthPlace:person.birthPlace??undefined,description:person.description??undefined,
  roleLabel:'Thành viên phả hệ',relationSummary:directRelationships.map(r=>r.label),timeline:[],albumLabels:[],x:0,y:0,
 },[person,directRelationships]);
 const back=()=>router.back();
 return <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:22,backgroundColor:colors.background}}>
  {loading?<ActivityIndicator color={colors.primary}/>:error||!displayPerson?<>
   <Text style={{color:colors.primaryText,textAlign:'center',lineHeight:21}}>{error?'Không tải được hồ sơ người thân.':'Không tìm thấy hồ sơ trong gia phả này.'}</Text>
   <Pressable accessibilityRole="button" onPress={back} style={{padding:14}}><Text style={{color:colors.primary}}>Trở về Cây nhà</Text></Pressable>
  </>:<FamilyGraphPersonSheet person={displayPerson} visible onClose={back} onOpenBranch={id=>router.replace({pathname:'/family-graph',params:{focusPersonId:id}} as never)}
   canEdit={isAdmin} onEditPerson={id=>router.push({pathname:'/family-graph-person-editor',params:{personId:id}} as never)}
   onEditRelationship={(relationshipId,id)=>router.push({pathname:'/family-graph-relationship-detail',params:{relationshipId,personId:id}} as never)}
   directRelationships={directRelationships} familyId={familyId} showPrototypeNote={false}/>}
 </View>;
}
