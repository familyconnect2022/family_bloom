import { Ionicons } from "@expo/vector-icons";
import { Link, Slot, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { useWebAuth } from "../context/WebAuthContext";
import { useWebFamily } from "../context/WebFamilyContext";
import { WebFamilyManager } from "./WebFamilyManager";
import { WebModal } from "./WebOverlay";

type IconName = keyof typeof Ionicons.glyphMap;
const tabs:Array<{href:string;label:string;icon:IconName}>=[
 {href:"/",label:"Nhà",icon:"home"},
 {href:"/moments",label:"Kỷ niệm",icon:"images"},
 {href:"/planner",label:"Lịch",icon:"calendar"},
 {href:"/family",label:"Phả hệ",icon:"people"},
 {href:"/play",label:"Nhà Mình",icon:"heart"},
];

export function WebTabShell(){
 const path=usePathname();
 const auth=useWebAuth();
 const family=useWebFamily();
 const [profileOpen,setProfileOpen]=useState(false);
 const [online,setOnline]=useState(()=>typeof navigator==="undefined"?true:navigator.onLine);

 useEffect(()=>{
  const yes=()=>setOnline(true),no=()=>setOnline(false);
  window.addEventListener("online",yes);window.addEventListener("offline",no);
  return()=>{window.removeEventListener("online",yes);window.removeEventListener("offline",no)};
 },[]);

 return <div className="bloom-shell">
  <aside className="bloom-brand-rail" aria-hidden="true">
    <div className="bloom-brand-mark">✿</div><div><b>Family Bloom</b><span>Nhà mình, gần nhau hơn</span></div>
  </aside>
  <header className="bloom-header">
   <div className="bloom-mobile-brand"><span className="bloom-mobile-flower">✿</span><div><b>Family Bloom</b><small>WEB</small></div></div>
   <div className="bloom-header-family">
    {family.memberships.length>1?<select aria-label="Chọn gia đình" value={family.activeFamilyId??""} onChange={e=>void family.switchFamily(e.target.value)} className="bloom-family-select">{family.memberships.map(item=><option value={item.familyId} key={item.familyId}>{item.familyName}</option>)}</select>:<div className="bloom-family-pill"><Ionicons name="home-outline" size={15}/> <span>{family.activeFamily?.familyName||"Nhà Mình"}</span></div>}
   </div>
   <div className="bloom-header-tools">
    <div className={`bloom-live-dot ${online?"is-live":""}`} title={online?"Đang online":"Đang offline"}/>
    <button className="bloom-avatar-button" title="Tài khoản" onClick={()=>setProfileOpen(true)}>{family.profile?.avatarUrl?<img src={family.profile.avatarUrl} alt=""/>:<span>{String(family.profile?.shortName||family.profile?.displayName||"B").slice(0,1).toUpperCase()}</span>}</button>
   </div>
  </header>
  {!online?<div className="bloom-connectivity" data-tone="offline">Không có mạng · Bloom sẽ tự nối lại khi có Internet</div>:null}
  <main className="bloom-body" id="bloom-scroll-root"><Slot/></main>
  <nav className="bloom-nav" aria-label="Điều hướng chính">{tabs.map(tab=>{const active=tab.href==="/"?path==="/":path.startsWith(tab.href);return <Link href={tab.href as never} key={tab.href} className="bloom-nav-link" data-active={active}><span className="bloom-nav-icon"><Ionicons name={tab.icon} size={22}/></span><span className="bloom-nav-label">{tab.label}</span></Link>})}</nav>
  <WebModal open={profileOpen} onClose={()=>setProfileOpen(false)} title="Tài khoản & mái nhà" sheet>
   <div className="bloom-profile-summary"><div className="bloom-profile-avatar">{family.profile?.avatarUrl?<img src={family.profile.avatarUrl} alt=""/>:String(family.profile?.displayName||"B").slice(0,1)}</div><div><b>{family.profile?.displayName||auth.user?.displayName||"Thành viên"}</b><span>{auth.user?.email||auth.user?.phoneNumber||"Tài khoản Family Bloom"}</span></div></div>
   <WebFamilyManager/>
   <button className="bloom-btn danger bloom-full-button" onClick={()=>void auth.logout()}>Đăng xuất</button>
  </WebModal>
 </div>;
}
