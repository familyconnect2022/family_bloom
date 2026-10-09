import { Link, Slot, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { useWebAuth } from "../context/WebAuthContext";
import { useWebFamily } from "../context/WebFamilyContext";
import { WebModal } from "./WebOverlay";
import { WebFamilyManager } from "./WebFamilyManager";
import { useWebGameSocket } from "../games/WebGameSocketContext";

const tabs=[
 {href:"/",label:"Nhà",icon:"⌂"},{href:"/moments",label:"Kỷ niệm",icon:"♡"},{href:"/planner",label:"Lịch",icon:"▣"},{href:"/family",label:"Phả hệ",icon:"⌘"},{href:"/play",label:"Nhà Mình",icon:"✿"},
] as const;

export function WebTabShell(){
 const path=usePathname();const auth=useWebAuth();const family=useWebFamily();const game=useWebGameSocket();const [profileOpen,setProfileOpen]=useState(false);const [online,setOnline]=useState(()=>typeof navigator==="undefined"?true:navigator.onLine);
 useEffect(()=>{const yes=()=>setOnline(true),no=()=>setOnline(false);window.addEventListener("online",yes);window.addEventListener("offline",no);return()=>{window.removeEventListener("online",yes);window.removeEventListener("offline",no)}},[]);
 return <div className="bloom-shell">
  <header className="bloom-header">
   <div><div style={brand}>Family Bloom <span style={webBadge}>WEB</span></div><div style={sub}>iPhone · iPad · Web · cùng dữ liệu Android</div></div>
   <div style={tools}>
    {family.memberships.length>1?<select aria-label="Chọn gia đình" value={family.activeFamilyId??""} onChange={e=>void family.switchFamily(e.target.value)} style={select}>{family.memberships.map(item=><option value={item.familyId} key={item.familyId}>{item.familyName}</option>)}</select>:<div style={familyPill}>🏡 {family.activeFamily?.familyName}</div>}
    <button style={avatarBtn} title="Tài khoản" onClick={()=>setProfileOpen(true)}>{family.profile?.avatarUrl?<img src={family.profile.avatarUrl} style={avatarImg}/>:String(family.profile?.shortName||family.profile?.displayName||"B").slice(0,1).toUpperCase()}</button>
   </div>
  </header>
  {!online?<div className="bloom-connectivity" data-tone="offline">Không có mạng · Bloom sẽ dùng dữ liệu đã lưu nếu có</div>:!game.connected?<div className="bloom-connectivity" data-tone="soft">Game server đang nối lại…</div>:null}
  <main className="bloom-body"><Slot/></main>
  <nav className="bloom-nav" aria-label="Điều hướng chính">{tabs.map(tab=>{const active=tab.href==="/"?path==="/":path.startsWith(tab.href);return <Link href={tab.href as never} key={tab.href} className="bloom-nav-link" data-active={active}><span className="bloom-nav-icon">{tab.icon}</span><span className="bloom-nav-label">{tab.label}</span></Link>})}</nav>
  <WebModal open={profileOpen} onClose={()=>setProfileOpen(false)} title="Tài khoản & mái nhà" sheet>
   <div style={{display:"grid",gridTemplateColumns:"64px 1fr",gap:14,alignItems:"center",padding:"4px 0 16px"}}><div style={{...avatarBtn,width:64,height:64,borderRadius:22,fontSize:22}}>{family.profile?.avatarUrl?<img src={family.profile.avatarUrl} style={avatarImg}/>:String(family.profile?.displayName||"B").slice(0,1)}</div><div><b style={{fontSize:18}}>{family.profile?.displayName||auth.user?.displayName||"Thành viên"}</b><div style={sub}>{auth.user?.email||auth.user?.phoneNumber||"Tài khoản Family Bloom"}</div></div></div>
   <WebFamilyManager/>
   <button className="bloom-btn danger" style={{width:"100%",marginTop:16}} onClick={()=>void auth.logout()}>Đăng xuất</button>
  </WebModal>
 </div>
}
const brand:React.CSSProperties={fontWeight:950,fontSize:18,letterSpacing:"-.03em"};const webBadge:React.CSSProperties={fontSize:9,letterSpacing:".12em",background:"#f7dce5",color:"#b65c77",padding:"4px 6px",borderRadius:99,verticalAlign:"middle"};const sub:React.CSSProperties={fontSize:11,color:"#9a818a",marginTop:3};const tools:React.CSSProperties={display:"flex",alignItems:"center",gap:8};const select:React.CSSProperties={maxWidth:210,border:"1px solid #eed9e1",borderRadius:12,padding:"9px 10px",background:"#fff",fontWeight:750,color:"#604b52"};const familyPill:React.CSSProperties={fontSize:12,fontWeight:750,background:"#fff",border:"1px solid #f0dde3",borderRadius:99,padding:"9px 12px",maxWidth:210,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};const avatarBtn:React.CSSProperties={width:40,height:40,borderRadius:14,border:0,background:"#e98aa6",color:"white",fontWeight:900,display:"grid",placeItems:"center",overflow:"hidden",cursor:"pointer"};const avatarImg:React.CSSProperties={width:"100%",height:"100%",objectFit:"cover"};const stat:React.CSSProperties={display:"flex",flexDirection:"column",gap:3,alignItems:"center",justifyContent:"center",background:"#fff5f7",borderRadius:16,padding:14,color:"#8b6572"};
