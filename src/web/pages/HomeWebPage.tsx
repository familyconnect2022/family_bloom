import { Link } from "expo-router";
import { limit, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { useWebFamily } from "../context/WebFamilyContext";
import { useWebCollection } from "../hooks/useWebCollection";
import { DataError, EmptyState, Skeleton, WebCard } from "../components/WebPrimitives";

type Moment = { id:string; authorName?:string; caption?:string; createdAt?:unknown; media?:Array<{type?:string;secureUrl?:string;thumbnailUrl?:string}> };
type Event = { id:string; title?:string; dateISO?:string; eventType?:string; location?:string };
type Person = { id:string; displayName?:string; nickname?:string; avatarUrl?:string|null; color?:string };

const asMillis=(value:unknown)=>{if(!value)return 0;if(typeof value==="string")return new Date(value).getTime();if(typeof value==="object"&&value!==null&&"toMillis" in value&&typeof (value as {toMillis?:unknown}).toMillis==="function")return (value as {toMillis:()=>number}).toMillis();if(typeof value==="object"&&value!==null&&"seconds" in value)return Number((value as {seconds:number}).seconds)*1000;return 0};
const dayPart=()=>{const h=new Date().getHours();return h<11?"buổi sáng":h<14?"buổi trưa":h<18?"buổi chiều":"buổi tối"};
const eventTime=(iso?:string)=>{if(!iso)return "--:--";const d=new Date(iso);return Number.isNaN(d.getTime())?"--:--":d.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})};
const eventDate=(iso?:string)=>{if(!iso)return "Chưa có ngày";const d=new Date(iso);return Number.isNaN(d.getTime())?"Chưa có ngày":d.toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit"})};

export default function HomeWebPage(){
 const family=useWebFamily();const familyId=family.activeFamilyId;
 const momentConstraints=useMemo(()=>[orderBy("createdAt","desc"),limit(8)],[]);
 const eventConstraints=useMemo(()=>[orderBy("dateISO","asc"),limit(12)],[]);
 const moments=useWebCollection<Moment>(familyId?`families/${familyId}/moments`:null,momentConstraints);
 const events=useWebCollection<Event>(familyId?`families/${familyId}/events`:null,eventConstraints);
 const people=useWebCollection<Person>(familyId?`families/${familyId}/persons`:null);
 const firstName=family.profile?.shortName||family.profile?.displayName?.split(" ").slice(-1)[0]||"Nhà mình";
 const heroPhotos=moments.items.flatMap(m=>m.media||[]).filter(x=>x.type!=="video"&&x.secureUrl).slice(0,3);
 const now=Date.now();const upcoming=events.items.filter(e=>{const t=e.dateISO?new Date(e.dateISO).getTime():0;return !t||t>now-6*60*60*1000}).slice(0,5);
 const previewPeople=(people.items.length?people.items:family.members.map(m=>({id:m.uid,displayName:m.displayName,avatarUrl:m.avatarUrl,color:m.color}))).slice(0,7);

 return <section className="bloom-page bloom-home-page">
   <DataError message={moments.error||events.error||people.error}/>
   <div className="bloom-home-hero">
     <div className="bloom-home-hero-content">
       <div><div className="bloom-eyebrow" style={{color:"rgba(255,255,255,.84)"}}>NHÀ MÌNH HÔM NAY</div><h2>Chào {dayPart()}, {firstName} 🌷</h2><p>{family.activeFamily?.familyName||"Gia đình"} đang ở đây — kỷ niệm, lịch hẹn và những điều nhỏ xíu của mọi người đều cùng một nơi.</p></div>
       <div className="bloom-hero-chip">✿ {family.members.length} thành viên đang cùng vun Nhà Mình</div>
     </div>
     <div className="bloom-hero-collage" aria-hidden="true">{heroPhotos.length?heroPhotos.map((m,i)=><div className="bloom-hero-photo" key={i}><img src={m.thumbnailUrl||m.secureUrl} alt=""/></div>):<><div className="bloom-hero-photo"/><div className="bloom-hero-photo"/><div className="bloom-hero-photo"/></>}</div>
   </div>

   <div className="bloom-home-main">
     <div style={{display:"grid",gap:16,minWidth:0}}>
       <div className="bloom-section-title"><div><div className="bloom-eyebrow">KỶ NIỆM GẦN ĐÂY</div><h2>Một chút mình vừa giữ lại</h2></div><Link href="/moments" className="bloom-chip">Xem tất cả</Link></div>
       {moments.loading?<Skeleton height={210}/>:moments.items.length?<div className="bloom-memory-strip">{moments.items.slice(0,6).map((m,index)=>{const media=m.media?.[0];return <article className="bloom-memory-card" key={m.id}><div className="bloom-memory-image">{media?.secureUrl&&media.type!=="video"?<img src={media.thumbnailUrl||media.secureUrl} alt=""/>:<span>{["🌷","🍲","🌤️","🎂"][index%4]}</span>}</div><div className="bloom-memory-copy"><b>{m.authorName||"Người Nhà Mình"}</b><p>{m.caption||"Một khoảnh khắc nhỏ vừa được cất vào Family Bloom."}</p></div></article>})}</div>:<EmptyState icon="♡" title="Chưa có Kỷ niệm gần đây" copy="Khi cả nhà đăng khoảnh khắc, chúng sẽ tạo thành một dải kỷ niệm ở đây."/>}

       <div className="bloom-section-title"><div><div className="bloom-eyebrow">PHẢ HỆ GIA ĐÌNH</div><h2>Những người làm nên Nhà Mình</h2></div><Link href="/family" className="bloom-chip">Mở Phả hệ</Link></div>
       <WebCard>
        <div className="bloom-family-overview"><div className="bloom-avatar-stack">{previewPeople.map((p,i)=><div className="bloom-mini-avatar" key={p.id} style={{background:p.color||["#df7898","#7da7cf","#db9e69","#8cad87"][i%4]}}>{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:String(p.nickname||p.displayName||"?").slice(0,1)}</div>)}</div><span className="bloom-stat-pill">{people.items.length||family.members.length} người</span><span className="bloom-stat-pill">Cùng một cây gia đình</span></div>
        <p style={{fontSize:11,lineHeight:1.6,color:"#8e747d",margin:"13px 0 0"}}>Chạm vào Phả hệ để xem các nhánh, thêm người thân hoặc chỉnh lại mối quan hệ. Dữ liệu này dùng chung với Android.</p>
       </WebCard>

       <div className="bloom-section-title"><div><div className="bloom-eyebrow">NHÀ MÌNH</div><h2>Đi thẳng tới điều bạn cần</h2></div><Link href="/play" className="bloom-chip">Mở Nhà Mình</Link></div>
       <div className="bloom-quick-grid"><Link href="/play" className="bloom-quick-card" style={{textDecoration:"none"}}><span>💌</span><b>Lời thì thầm</b><small>Gửi một điều chỉ người nhận mới thấy.</small></Link><Link href="/play" className="bloom-quick-card" style={{textDecoration:"none"}}><span>🗳️</span><b>Cùng quyết định</b><small>Tạo Poll nhanh cho cả nhà.</small></Link><Link href="/play" className="bloom-quick-card" style={{textDecoration:"none"}}><span>🎁</span><b>Hộp thời gian</b><small>Hẹn một lời nhắn cho tương lai.</small></Link><Link href="/play" className="bloom-quick-card" style={{textDecoration:"none"}}><span>♟️</span><b>Trò chơi</b><small>Cờ vua, Cờ tướng và mini game.</small></Link></div>
     </div>

     <aside className="bloom-home-side">
       <WebCard className="bloom-schedule-card"><div className="bloom-section-title" style={{marginTop:0}}><div><div className="bloom-eyebrow">LỊCH NHÀ MÌNH</div><h2>Những mốc sắp tới</h2></div><Link href="/planner" className="bloom-chip">Lịch</Link></div>{events.loading?<Skeleton height={170}/>:upcoming.length?<div className="bloom-schedule">{upcoming.map(e=><div className="bloom-schedule-row" key={e.id}><div className="bloom-schedule-time">{eventTime(e.dateISO)}</div><span className="bloom-schedule-dot"/><div><div className="bloom-schedule-title">{e.title||"Sự kiện Nhà Mình"}</div><div className="bloom-schedule-meta">{eventDate(e.dateISO)}{e.location?` · ${e.location}`:""}</div></div></div>)}</div>:<div className="bloom-empty" style={{minHeight:130}}>Chưa có lịch gần đây 🌿</div>}</WebCard>
       <WebCard><div className="bloom-eyebrow">NHỊP NHÀ MÌNH</div><h3 style={{fontSize:18,margin:"5px 0 13px"}}>Hôm nay nhẹ nhàng thôi</h3><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><div style={{background:"#fff2f6",borderRadius:18,padding:13}}><b style={{fontSize:24}}>{family.members.length}</b><div style={{fontSize:9,color:"#8e747d",marginTop:3}}>thành viên</div></div><div style={{background:"#fff4e7",borderRadius:18,padding:13}}><b style={{fontSize:24}}>{moments.items.length}</b><div style={{fontSize:9,color:"#8e747d",marginTop:3}}>kỷ niệm tải gần nhất</div></div></div></WebCard>
     </aside>
   </div>
 </section>;
}
