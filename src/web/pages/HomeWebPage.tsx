import { limit, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { useWebFamily } from "../context/WebFamilyContext";
import { useWebCollection } from "../hooks/useWebCollection";
import { DataError, EmptyState, Skeleton, WebCard, WebPage, webGrid } from "../components/WebPrimitives";

type Moment = { id:string; authorName?:string; caption?:string; createdAt?:string; media?:Array<{type?:string;secureUrl?:string;thumbnailUrl?:string}> };
type Event = { id:string; title?:string; dateISO?:string; eventType?:string; location?:string };

export default function HomeWebPage(){
 const family=useWebFamily(); const familyId=family.activeFamilyId;
 const momentConstraints=useMemo(()=>[orderBy("createdAt","desc"),limit(4)],[]);
 const eventConstraints=useMemo(()=>[orderBy("dateISO","asc"),limit(6)],[]);
 const moments=useWebCollection<Moment>(familyId?`families/${familyId}/moments`:null,momentConstraints);
 const events=useWebCollection<Event>(familyId?`families/${familyId}/events`:null,eventConstraints);
 const firstName=family.profile?.shortName||family.profile?.displayName||"Nhà mình";
 return <WebPage eyebrow="CHÀO MỪNG TRỞ LẠI" title={`Xin chào, ${firstName}`} subtitle={`Web Companion đang nối trực tiếp với ${family.activeFamily?.familyName||"gia đình"}. Những thay đổi ở đây dùng cùng Firestore với Android.`}>
   <DataError message={moments.error||events.error}/>
   <div style={webGrid}>
    <WebCard><div style={kicker}>THÀNH VIÊN</div><div style={big}>{family.members.length}</div><div style={muted}>người trong {family.activeFamily?.familyName}</div><div style={avatarRow}>{family.members.slice(0,7).map(m=><div key={m.uid} title={m.displayName} style={{...avatar,background:m.color||"#f0b4c6"}}>{m.avatarUrl?<img src={m.avatarUrl} style={img}/>:String(m.shortName||m.displayName||"?").slice(0,1)}</div>)}</div></WebCard>
    <WebCard><div style={kicker}>KỶ NIỆM GẦN ĐÂY</div><div style={big}>{moments.items.length}</div><div style={muted}>đang hiển thị trên web</div><div style={miniLines}>{moments.items.slice(0,2).map(x=><div key={x.id}>♡ {x.authorName||"Thành viên"}: {x.caption||"Một khoảnh khắc"}</div>)}</div></WebCard>
    <WebCard><div style={kicker}>LỊCH NHÀ MÌNH</div><div style={big}>{events.items.length}</div><div style={muted}>mốc gần nhất đã tải</div><div style={miniLines}>{events.items.slice(0,2).map(x=><div key={x.id}>▣ {x.title||"Sự kiện"}</div>)}</div></WebCard>
   </div>
   <div style={sectionHeader}><h2 style={h2}>Một chút từ Nhà Mình</h2><span style={muted}>cache-first trên app · realtime trên web</span></div>
   {moments.loading?<Skeleton height={180}/>:moments.items.length?<div style={momentGrid}>{moments.items.map(m=><WebCard key={m.id} style={{padding:0,overflow:"hidden"}}>{m.media?.[0]?.secureUrl?<img src={m.media[0].thumbnailUrl||m.media[0].secureUrl} style={cover}/>:<div style={placeholder}>🌷</div>}<div style={{padding:15}}><b>{m.authorName||"Thành viên"}</b><div style={{...muted,marginTop:5}}>{m.caption||"Một khoảnh khắc của gia đình"}</div></div></WebCard>)}</div>:<EmptyState title="Chưa có kỷ niệm" copy="Kỷ niệm mới từ Android sẽ xuất hiện ở đây theo realtime."/>}
  </WebPage>
}
const kicker:React.CSSProperties={fontSize:10,fontWeight:900,letterSpacing:".14em",color:"#bd6982"};const big:React.CSSProperties={fontSize:34,fontWeight:950,letterSpacing:"-.05em",marginTop:6};const muted:React.CSSProperties={fontSize:12,color:"#947d85",lineHeight:1.5};const avatarRow:React.CSSProperties={display:"flex",marginTop:14};const avatar:React.CSSProperties={width:34,height:34,borderRadius:12,display:"grid",placeItems:"center",color:"white",fontWeight:900,border:"2px solid white",marginRight:-6,overflow:"hidden"};const img:React.CSSProperties={width:"100%",height:"100%",objectFit:"cover"};const miniLines:React.CSSProperties={marginTop:12,fontSize:12,lineHeight:1.7,color:"#705b63"};const sectionHeader:React.CSSProperties={display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:10,marginTop:4};const h2:React.CSSProperties={margin:0,fontSize:20,letterSpacing:"-.03em"};const momentGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,210px),1fr))",gap:14};const cover:React.CSSProperties={width:"100%",height:145,objectFit:"cover",display:"block"};const placeholder:React.CSSProperties={height:145,display:"grid",placeItems:"center",fontSize:42,background:"#fff0f4"};
