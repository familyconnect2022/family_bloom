import { parseAppError } from "../constants/errorConstants";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomKeyboardScreen } from "../components/layout/BloomKeyboardScreen";
import { BloomButton } from "../components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { BloomTextInput } from "../components/ui/BloomInputComponents";
import { BloomFullScreenFlow } from "../components/ui/BloomFullScreenFlow";
import { useBloomDialog } from "../components/ui/BloomDialogProvider";
import { useBloomToast } from "../components/ui/BloomToast";
import { FamilyPersonMultiPicker } from "../components/familyGraph/FamilyPersonMultiPicker";
import { useAuth } from "../context/AuthContext";
import { useFamilyGraph } from "../hooks/useFamilyGraph";
import { useFamilyMembers } from "../hooks/useFamilyMembers";
import { graphProposalService } from "../services/familyGraph/graphProposalService";
import type { GraphProposal, ProposalAction, ProposalDocument, ProposalEntity } from "../types/graphProposal";
import type { FamilyPerson, FamilyRelationship } from "../types/familyGraph";
import { COLORS } from "../constants/theme";

const actions: Record<ProposalAction,string> = { create:"Thêm mới", update:"Chỉnh sửa", delete:"Xóa" };
const statuses = { pending:"Chờ duyệt", approved:"Đã duyệt", rejected:"Đã từ chối", withdrawn:"Đã rút" };
const fields: Record<string,string> = { displayName:"Họ tên", nickname:"Tên gọi", gender:"Giới tính", lifeStatus:"Tình trạng", birthDate:"Ngày sinh", birthYear:"Năm sinh", deathDate:"Ngày mất", deathYear:"Năm mất", birthPlace:"Nơi sinh", description:"Ghi chú", birthOrder:"Thứ tự sinh", avatarUrl:"Ảnh đại diện", linkedUid:"Tài khoản liên kết", type:"Quan hệ", personAId:"Người thứ nhất / cha mẹ", personBId:"Người thứ hai / con", subtype:"Loại cha mẹ–con", partnerStatus:"Tình trạng đôi lứa", startDate:"Ngày bắt đầu", endDate:"Ngày kết thúc" };
const values: Record<string,string> = { male:"Nam",female:"Nữ",other:"Khác",living:"Đang sống",deceased:"Đã mất",unknown:"Chưa rõ",parent_child:"Cha mẹ–con",partner:"Bạn đời",married:"Kết hôn",separated:"Ly thân",divorced:"Ly hôn",widowed:"Góa",biological:"Ruột",adoptive:"Nuôi",step:"Kế" };
const friendly = (error: unknown) => (error as {code?: string})?.code ? parseAppError(error).message : (error as Error)?.message || "Chưa thực hiện được. Hãy thử lại.";
const emptyDraft = () => ({displayName:"",nickname:"",gender:"other",lifeStatus:"unknown",birthDate:"",birthYear:"",deathDate:"",deathYear:"",birthPlace:"",description:"",birthOrder:"",type:"parent_child",personAId:"",personBId:"",subtype:"unknown",partnerStatus:"married",startDate:"",endDate:""} as Record<string,string>);

function Choices({ options, value, onChange }: { options: Record<string,string>; value:string; onChange:(key:string)=>void }) {
  return <View style={styles.choices}>{Object.entries(options).map(([key,label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{selected:key===value}} onPress={()=>onChange(key)} style={[styles.chip,key===value&&styles.selected]}><Text style={styles.text}>{label}</Text></Pressable>)}</View>;
}

export default function GraphProposals() {
  const router=useRouter();
  const {user,activeFamilyId:familyId,families}=useAuth();
  const {confirm}=useBloomDialog();
  const {showToast}=useBloomToast();
  const canPropose=families.some(f=>f.familyId===familyId&&f.role==="member");
  const isAdmin=families.some(f=>f.familyId===familyId&&(f.role==="admin"||f.role==="owner"));
  const {snapshot,loading:graphLoading,error:graphError}=useFamilyGraph(familyId,user?.uid);
  const {memberByUid}=useFamilyMembers(familyId);
  const [items,setItems]=useState<GraphProposal[]>([]), [pending,setPending]=useState(true), [loading,setLoading]=useState(true), [loadError,setLoadError]=useState("");
  const [reload,setReload]=useState(0), [composer,setComposer]=useState(false), [busy,setBusy]=useState(false);
  const [entity,setEntity]=useState<ProposalEntity>("persons"), [action,setAction]=useState<ProposalAction>("create");
  const [draft,setDraft]=useState(emptyDraft), [original,setOriginal]=useState<ProposalDocument|null>(null), [reason,setReason]=useState("");
  const [review,setReview]=useState<GraphProposal|null>(null), [note,setNote]=useState("");
  const [relationPicker,setRelationPicker]=useState(false), [search,setSearch]=useState("");
  const people=useMemo(()=>new Map(snapshot.persons.map(p=>[p.id,p])),[snapshot.persons]);
  const personName=(id:string)=>people.get(id)?.nickname||people.get(id)?.displayName||id;
  const relationName=(r:FamilyRelationship)=>`${personName(r.personAId)} ${r.type==="parent_child"?"→":"↔"} ${personName(r.personBId)}`;
  const relations=useMemo(()=>snapshot.relationships.filter(r=>`${people.get(r.personAId)?.displayName} ${people.get(r.personBId)?.displayName}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))),[snapshot.relationships,people,search]);
  useEffect(()=>{
    setItems([]);setLoadError("");setLoading(true);
    if (!familyId) {setLoading(false);return;}
    return graphProposalService.watch(familyId,pending,rows=>{setItems(rows);setLoading(false);},error=>{setLoadError(String((error as Error)?.message||error));setLoading(false);});
  },[familyId,pending,reload]);
  const update=(key:string,value:string)=>setDraft(d=>({...d,[key]:value}));
  const selectOriginal=(item:ProposalDocument)=>{
    setOriginal(item);
    const next=emptyDraft();
    for(const [key,value] of Object.entries(item)) if(key in next) next[key]=value==null?"":String(value);
    setDraft(next);
  };
  const reset=()=>{setOriginal(null);setDraft(emptyDraft());setReason("");};
  const display=(key:string,value:unknown)=>{
    if(value===null||value===undefined||value==="") return "—";
    if(key==="personAId"||key==="personBId") return personName(String(value));
    return values[String(value)]||String(value);
  };
  const submit=async()=>{
    if(!familyId||busy||!canPropose)return;
    setBusy(true);
    try {
      if(action!=="create"&&!original)throw new Error("Hãy chọn nội dung muốn thay đổi.");
      const input:Record<string,unknown>={...draft};
      for(const key of ["birthYear","deathYear","birthOrder"]) input[key]=draft[key]?Number(draft[key]):null;
      for(const key of ["birthDate","deathDate","startDate","endDate"]) input[key]=draft[key]||null;
      await graphProposalService.submit(familyId,entity,action,original?.id??null,input,reason,original?.updatedAt);
      setComposer(false);reset();setPending(true);setReload(n=>n+1);
      showToast({type:"success",title:"Đã gửi đề xuất",message:"Phả hệ chỉ thay đổi sau khi quản trị viên duyệt.",duration:2800});
    }catch(error){showToast({type:"error",title:"Chưa gửi được",message:friendly(error),duration:3400});}
    finally{setBusy(false);}
  };
  const decide=async(decision:"approved"|"rejected"|"withdrawn")=>{
    if(!familyId||!review||busy)return;
    setBusy(true);
    try{await graphProposalService.review(familyId,review.id,decision,note);setReview(null);}
    catch(error){showToast({type:"error",title:"Chưa xử lý được",message:friendly(error),duration:3400});}
    finally{setBusy(false);}
  };
  const confirmDecision=(decision:"approved"|"rejected"|"withdrawn")=>void confirm({
    eyebrow:"GÓP Ý PHẢ HỆ",
    title:decision==="approved"?"Duyệt và áp dụng thay đổi?":decision==="rejected"?"Từ chối đề xuất?":"Rút đề xuất?",
    message:decision==="approved"?"Nội dung phả hệ sẽ được cập nhật theo phần so sánh bên dưới.":"Kết quả được giữ trong lịch sử để cả nhà dễ đối chiếu.",
    icon:decision==="approved"?"checkmark-done-outline":"git-branch-outline",
    cancelLabel:"Quay lại",
    confirmLabel:"Xác nhận",
    destructive:decision!=="approved",
  }).then(ok=>{if(ok)void decide(decision);});
  if(!familyId)return <ScreenContainer><Text style={styles.text}>Hãy chọn gia đình trước.</Text></ScreenContainer>;
  return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
    <StatusBar translucent backgroundColor="transparent" style="dark" />
    <BloomHeroHeader
      eyebrow={isAdmin ? "CHĂM SÓC PHẢ HỆ" : "GÓP Ý PHẢ HỆ"}
      title={isAdmin ? "Cùng giữ phả hệ thật đúng" : "Góp một điều bạn biết"}
      subtitle={isAdmin ? "Đối chiếu từng góp ý trước khi một thay đổi đi vào câu chuyện chung của gia đình." : "Một chi tiết nhỏ bạn nhớ được cũng có thể giúp cả nhà nối lại đúng một nhánh."}
      variant="tree"
      onBack={()=>router.back()}
    />
    <View style={styles.pageBody}>
    <Text style={styles.hint}>{isAdmin?"Xem góp ý của thành viên, đối chiếu thông tin và duyệt thay đổi.":"Gửi góp ý để quản trị viên kiểm tra và cập nhật phả hệ."}</Text>
    {canPropose&&<View style={{marginTop:12,marginBottom:8}}><BloomButton title="Tạo đề xuất" onPress={()=>{reset();setComposer(true);}} /></View>}
    <Choices options={{pending:"Chờ duyệt",history:"Lịch sử gần đây"}} value={pending?"pending":"history"} onChange={v=>setPending(v==="pending")} />
    {loadError?<View><Text style={styles.error}>Chưa tải được đề xuất. Hãy kiểm tra kết nối rồi thử lại.</Text><BloomButton title="Thử lại" onPress={()=>setReload(n=>n+1)} /></View>:null}
    {loading?<ActivityIndicator color={COLORS.primary}/>:null}
    <FlatList data={pending?items:items.filter(p=>p.status!=="pending")} keyExtractor={p=>p.id} contentContainerStyle={styles.list} ListEmptyComponent={!loading&&!loadError?<Text style={styles.hint}>Chưa có đề xuất trong danh sách này.</Text>:null} ListFooterComponent={<Text style={styles.hint}>Hiển thị tối đa 100 đề xuất mỗi lượt.</Text>} renderItem={({item:p})=><Pressable style={styles.card} onPress={()=>{setReview(p);setNote("");}}><Text style={styles.cardTitle}>{actions[p.action]} {p.entity==="persons"?"thông tin người":"quan hệ"}</Text><Text style={styles.text}>{p.entity==="persons"?(p.after as FamilyPerson||p.before as FamilyPerson)?.displayName:relationName((p.after||p.before) as FamilyRelationship)}</Text><Text style={styles.hint}>{statuses[p.status]} · {memberByUid.get(p.createdByUid)?.displayName||"Thành viên"}</Text><Text style={styles.text} numberOfLines={2}>{p.reason}</Text></Pressable>}/>
    <BloomFullScreenFlow
      visible={composer&&canPropose}
      eyebrow="GÓP Ý PHẢ HỆ"
      title="Đề xuất một thay đổi"
      subtitle="Chia sẻ điều bạn biết để phả hệ của cả nhà ngày một đầy đủ và đáng tin cậy hơn."
      variant="tree"
      onBack={()=>{if(!busy)setComposer(false);}}
      backDisabled={busy}
    >
      <BloomKeyboardScreen contentContainerStyle={styles.formPage}>
        <Choices options={{persons:"Người trong phả hệ",relationships:"Quan hệ"}} value={entity} onChange={v=>{setEntity(v as ProposalEntity);reset();}}/>
        <Choices options={actions} value={action} onChange={v=>{setAction(v as ProposalAction);reset();}}/>
        {graphLoading?<ActivityIndicator color={COLORS.primary}/>:null}
        {graphError?<Text style={styles.error}>Chưa tải được phả hệ. Hãy quay lại và thử lại sau một chút.</Text>:null}
        {action!=="create"&&(entity==="persons"?<FamilyPersonMultiPicker label="Chọn người cần thay đổi" hint="Chọn một người" persons={snapshot.persons} selectedIds={original?[original.id]:[]} onChange={ids=>{const p=people.get(ids[ids.length-1]);if(p)selectOriginal(p);else setOriginal(null);}}/>:<BloomButton title={original?relationName(original as FamilyRelationship):"Chọn quan hệ cần thay đổi"} variant="outline" onPress={()=>{setSearch("");setRelationPicker(true);}}/>)}
        {action==="delete"?<Text style={styles.error}>Đề xuất xóa không tự xóa các liên kết. Người còn quan hệ, tài khoản hoặc nội dung liên quan cần được xử lý trước.</Text>:entity==="persons"?<>
          {["displayName","nickname","birthPlace","birthYear","birthDate","deathYear","deathDate","birthOrder","description"].map(key=><BloomTextInput key={key} label={fields[key]} value={draft[key]} onChangeText={v=>update(key,v)} placeholder={key.endsWith("Date")?"YYYY-MM-DD":fields[key]} multiline={key==="description"}/>)}
          <Text style={styles.text}>Giới tính</Text><Choices options={{male:"Nam",female:"Nữ",other:"Khác"}} value={draft.gender} onChange={v=>update("gender",v)}/>
          <Text style={styles.text}>Tình trạng</Text><Choices options={{unknown:"Chưa rõ",living:"Đang sống",deceased:"Đã mất"}} value={draft.lifeStatus} onChange={v=>update("lifeStatus",v)}/>
        </>:<>
          {action==="create"?<><Choices options={{parent_child:"Cha mẹ–con",partner:"Bạn đời"}} value={draft.type} onChange={v=>update("type",v)}/>
          {["personAId","personBId"].map((key,index)=><FamilyPersonMultiPicker key={key} label={draft.type==="parent_child"?(index===0?"Cha / mẹ":"Con"):(index===0?"Người thứ nhất":"Người thứ hai")} hint="Chọn một người" persons={snapshot.persons} selectedIds={draft[key]?[draft[key]]:[]} onChange={ids=>update(key,ids[ids.length-1]||"")}/>)}</>:null}
          {draft.type==="parent_child"?<Choices options={{unknown:"Chưa rõ",biological:"Ruột",adoptive:"Nuôi",step:"Kế"}} value={draft.subtype} onChange={v=>update("subtype",v)}/>:<><Choices options={{partner:"Bạn đời",married:"Kết hôn",separated:"Ly thân",divorced:"Ly hôn",widowed:"Góa"}} value={draft.partnerStatus} onChange={v=>update("partnerStatus",v)}/>{["startDate","endDate"].map(key=><BloomTextInput key={key} label={fields[key]} value={draft[key]} placeholder="YYYY-MM-DD" onChangeText={v=>update(key,v)}/>)}</>}
        </>}
        <BloomTextInput label="Lý do / nguồn thông tin" value={reason} onChangeText={setReason} multiline maxLength={2000}/>
        <BloomButton title="Gửi để quản trị viên duyệt" isLoading={busy} disabled={graphLoading||!!graphError||busy} onPress={()=>void submit()}/>
      </BloomKeyboardScreen>

      <BloomFullScreenFlow
        visible={relationPicker}
        eyebrow="CHỌN QUAN HỆ"
        title="Tìm đường nối cần chỉnh"
        subtitle="Chọn đúng hai người để Bloom đặt thay đổi vào đúng vị trí trong phả hệ."
        variant="relationship"
        compactHeader
        onBack={()=>setRelationPicker(false)}
      >
        <View style={styles.relationPickerPage}>
          <BloomTextInput placeholder="Tìm theo tên" value={search} onChangeText={setSearch}/>
          <FlatList data={relations} keyExtractor={r=>r.id} contentContainerStyle={styles.list} renderItem={({item})=><Pressable style={styles.card} onPress={()=>{selectOriginal(item);setRelationPicker(false);}}><Text style={styles.text}>{relationName(item)}</Text><Text style={styles.hint}>{values[item.type]}</Text></Pressable>} ListEmptyComponent={<Text style={styles.hint}>Không có quan hệ phù hợp.</Text>}/>
        </View>
      </BloomFullScreenFlow>
    </BloomFullScreenFlow>

    <BloomFullScreenFlow
      visible={!!review}
      eyebrow="DUYỆT ĐỀ XUẤT"
      title={review?`${actions[review.action]} · ${statuses[review.status]}`:"Xem lại thay đổi"}
      subtitle="Đối chiếu từng chi tiết trước khi thay đổi câu chuyện gia đình được lưu vào phả hệ."
      variant="moderation"
      onBack={()=>{if(!busy)setReview(null);}}
      backDisabled={busy}
    >
      <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
        {review&&<><Text style={styles.text}>{review.reason}</Text><Text style={styles.hint}>Gửi bởi {memberByUid.get(review.createdByUid)?.displayName||review.createdByUid} · {new Date(review.createdAt).toLocaleString("vi-VN")}</Text>
          {Object.entries(fields).filter(([key])=>{const before=review.before as unknown as Record<string,unknown>|null,after=review.after as unknown as Record<string,unknown>|null;return (key in (before||{})||key in (after||{}))&&(review.action!=="update"||before?.[key]!==after?.[key]);}).map(([key,label])=><View key={key} style={styles.diff}><Text style={styles.cardTitle}>{label}</Text><Text style={styles.hint}>Hiện tại: {display(key,(review.before as unknown as Record<string,unknown>|null)?.[key])}</Text><Text style={styles.text}>Đề xuất: {display(key,(review.after as unknown as Record<string,unknown>|null)?.[key])}</Text></View>)}
          {review.reviewedByUid?<Text style={styles.hint}>Xử lý bởi {memberByUid.get(review.reviewedByUid)?.displayName||review.reviewedByUid} · {review.reviewedAt?new Date(review.reviewedAt).toLocaleString("vi-VN"):""}{review.reviewNote?`\n${review.reviewNote}`:""}</Text>:null}
          {review.status==="pending"&&<><BloomTextInput label="Ghi chú xử lý (bắt buộc khi từ chối)" value={note} onChangeText={setNote} multiline maxLength={2000}/>{isAdmin&&<>{review.createdByUid===user?.uid&&<Text style={styles.hint}>Đề xuất do bạn tạo trước đây cần quản trị viên khác duyệt. Bạn có thể rút đề xuất này.</Text>}<BloomButton title="Duyệt và áp dụng" disabled={busy||review.createdByUid===user?.uid} isLoading={busy} onPress={()=>confirmDecision("approved")}/><BloomButton title="Từ chối" variant="outline" disabled={busy||!note.trim()} onPress={()=>confirmDecision("rejected")}/></>}{review.createdByUid===user?.uid&&<BloomButton title="Rút đề xuất" variant="outline" disabled={busy} onPress={()=>confirmDecision("withdrawn")}/>}</>}
        </>}
      </ScrollView>
    </BloomFullScreenFlow>
    </View>
  </ScreenContainer>;
}
const styles=StyleSheet.create({pageBody:{flex:1,marginTop:-24,paddingHorizontal:16,paddingTop:18,borderTopLeftRadius:32,borderTopRightRadius:32,overflow:"hidden",backgroundColor:COLORS.background},header:{gap:8,paddingBottom:8},title:{fontSize:22,fontWeight:"800",color:COLORS.primaryText},link:{color:COLORS.primaryText,fontWeight:"700",paddingVertical:8},text:{color:COLORS.primaryText,fontSize:14,lineHeight:21},hint:{color:"#A87588",fontSize:12,lineHeight:19,paddingVertical:6},error:{color:COLORS.destructive,lineHeight:21},choices:{flexDirection:"row",flexWrap:"wrap",gap:8,marginVertical:10},chip:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,paddingHorizontal:12,paddingVertical:10,backgroundColor:COLORS.white},selected:{backgroundColor:COLORS.accentBg,borderColor:COLORS.primary},card:{backgroundColor:COLORS.white,borderRadius:20,padding:16,marginVertical:6,gap:4,borderWidth:1,borderColor:COLORS.border},cardTitle:{color:COLORS.primaryText,fontWeight:"800",fontSize:14},list:{paddingBottom:24},form:{gap:12,paddingBottom:36},formPage:{gap:12,padding:18,paddingBottom:42},relationPickerPage:{flex:1,padding:18,gap:10},diff:{borderRadius:16,backgroundColor:COLORS.white,padding:14,borderWidth:1,borderColor:COLORS.border}});
