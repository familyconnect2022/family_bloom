import { limit, orderBy } from "firebase/firestore";
import { useMemo, useState } from "react";
import { useWebAuth } from "../context/WebAuthContext";
import { useWebFamily } from "../context/WebFamilyContext";
import { useWebCollection } from "../hooks/useWebCollection";
import { DataError, EmptyState, Skeleton, WebCard, WebPage } from "../components/WebPrimitives";
import { FormRow, InlineNotice, WebModal } from "../components/WebOverlay";
import { addMomentComment, createMoment, deleteOwnMoment, listMomentComments, setMomentReaction } from "../services/webFeatureService";
import { WebFamilyTimeline, WebMemoryBook } from "../components/WebMemoryTools";

type Reaction="like"|"love"|"haha"|"wow"|"sad"|"celebrate";
type Moment={id:string;authorUid?:string;authorName?:string;authorAvatarUrl?:string;caption?:string;createdAt?:string;commentCount?:number;reactionCounts?:Record<string,number>;personIds?:string[];media?:Array<{type?:"image"|"video";secureUrl?:string;thumbnailUrl?:string}>};
type Person={id:string;displayName?:string;nickname?:string;avatarUrl?:string|null};
const REACTIONS:Array<{key:Reaction;icon:string}>=[{key:"love",icon:"❤️"},{key:"like",icon:"👍"},{key:"haha",icon:"😄"},{key:"wow",icon:"😮"},{key:"sad",icon:"😢"},{key:"celebrate",icon:"🌸"}];

export default function MomentsWebPage(){
 const auth=useWebAuth();const f=useWebFamily();const constraints=useMemo(()=>[orderBy("createdAt","desc"),limit(60)],[]);const q=useWebCollection<Moment>(f.activeFamilyId?`families/${f.activeFamilyId}/moments`:null,constraints);
 const people=useWebCollection<Person>(f.activeFamilyId?`families/${f.activeFamilyId}/persons`:null);
 const [viewMode,setViewMode]=useState<"feed"|"timeline"|"book">("feed");
 const [compose,setCompose]=useState(false);const [caption,setCaption]=useState("");const [files,setFiles]=useState<File[]>([]);const [personIds,setPersonIds]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);const [error,setError]=useState<string|null>(null);const [commentsFor,setCommentsFor]=useState<Moment|null>(null);const [comments,setComments]=useState<any[]>([]);const [comment,setComment]=useState("");
 const name=f.profile?.displayName||auth.user?.displayName||"Thành viên";
 const publish=async()=>{if(!auth.user||!f.activeFamilyId||busy)return;setBusy(true);setError(null);try{await createMoment({familyId:f.activeFamilyId,uid:auth.user.uid,name,avatarUrl:f.profile?.avatarUrl,caption,files,personIds,onProgress:setProgress,notifyFamily:true});setCaption("");setFiles([]);setPersonIds([]);setProgress(0);setCompose(false)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const openComments=async(m:Moment)=>{setCommentsFor(m);setComments([]);if(f.activeFamilyId)setComments(await listMomentComments(f.activeFamilyId,m.id).catch(()=>[]))};
 const sendComment=async()=>{if(!commentsFor||!auth.user||!f.activeFamilyId||!comment.trim())return;await addMomentComment(f.activeFamilyId,commentsFor.id,auth.user.uid,name,f.profile?.avatarUrl,comment);setComment("");setComments(await listMomentComments(f.activeFamilyId,commentsFor.id).catch(()=>[]))};
 return <WebPage eyebrow="KỶ NIỆM" title="Những điều Nhà Mình nhớ" subtitle="Khoảnh khắc, Dòng thời gian và Kỷ yếu Bloom dùng cùng dữ liệu với Android." action={<button className="bloom-btn" onClick={()=>setCompose(true)}>＋ Đăng Kỷ niệm</button>}>
  <DataError message={q.error||people.error}/><div style={{display:"flex",gap:7,overflowX:"auto",marginBottom:14}}>{([["feed","Khoảnh khắc"],["timeline","Dòng thời gian"],["book","Kỷ yếu Bloom"]] as const).map(([id,label])=><button key={id} className="bloom-chip" data-active={viewMode===id} onClick={()=>setViewMode(id)}>{label}</button>)}</div>
  {viewMode==="timeline"?<WebFamilyTimeline moments={q.items}/>:viewMode==="book"?<WebMemoryBook familyId={f.activeFamilyId} uid={auth.user?.uid||""} moments={q.items} people={people.items}/>:q.loading?<><Skeleton height={260}/><Skeleton height={260}/></>:q.items.length?<div className="bloom-card-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))"}}>{q.items.map(m=><WebCard key={m.id} style={card}>
   <div style={author}>{m.authorAvatarUrl?<img src={m.authorAvatarUrl} style={avatar}/>:<div style={avatarFallback}>♡</div>}<div style={{minWidth:0,flex:1}}><b>{m.authorName||"Thành viên"}</b><div style={time}>{format(m.createdAt)}</div></div>{m.authorUid===auth.user?.uid?<button className="bloom-btn ghost" style={tinyBtn} onClick={()=>{if(f.activeFamilyId&&confirm("Xóa Kỷ niệm này?"))void deleteOwnMoment(f.activeFamilyId,m.id,auth.user!.uid)}}>×</button>:null}</div>
   {m.caption?<p style={captionStyle}>{m.caption}</p>:null}{m.personIds?.length?<div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"0 16px 8px"}}>{m.personIds.map(id=>{const p=people.items.find(x=>x.id===id);return p?<span className="bloom-chip" key={id}>👤 {p.nickname||p.displayName||"Người thân"}</span>:null})}</div>:null}
   {m.media?.length?<div style={{display:"grid",gridTemplateColumns:m.media.length>1?"1fr 1fr":"1fr",gap:2}}>{m.media.slice(0,4).map((media,i)=>media.secureUrl?(media.type==="video"?<video key={i} controls playsInline preload="metadata" poster={media.thumbnailUrl} src={media.secureUrl} style={mediaStyle}/>:<img key={i} src={media.secureUrl} style={mediaStyle}/>):null)}</div>:null}
   <div style={reactionRow}>{REACTIONS.map(r=><button key={r.key} className="bloom-chip" onClick={()=>f.activeFamilyId&&auth.user&&void setMomentReaction(f.activeFamilyId,m.id,auth.user.uid,r.key)}>{r.icon} {m.reactionCounts?.[r.key]||""}</button>)}</div>
   <button className="bloom-btn ghost" style={{width:"100%"}} onClick={()=>void openComments(m)}>💬 {m.commentCount||0} bình luận</button>
  </WebCard>)}</div>:<EmptyState title="Chưa có kỷ niệm" copy="Hãy đăng khoảnh khắc đầu tiên từ web hoặc Android."/>}

  <WebModal open={compose} onClose={()=>!busy&&setCompose(false)} title="Đăng Kỷ niệm" sheet>
   <FormRow label="Lời nhắn"><textarea className="bloom-field bloom-textarea" placeholder="Hôm nay Nhà Mình có gì đáng nhớ?" value={caption} onChange={e=>setCaption(e.target.value)}/></FormRow>
   <FormRow label="Ảnh hoặc video" hint="Có thể chọn nhiều file. Web dùng cùng Cloudinary của Android."><input className="bloom-field" type="file" multiple accept="image/*,video/*" onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,8))}/></FormRow>
   <FormRow label="Gắn người trong Phả hệ" hint="Tùy chọn · dùng cùng personIds với Android"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{people.items.map(p=>{const active=personIds.includes(p.id);return <button type="button" className="bloom-chip" data-active={active} key={p.id} onClick={()=>setPersonIds(active?personIds.filter(x=>x!==p.id):[...personIds,p.id])}>{p.nickname||p.displayName||"Người thân"}</button>})}</div></FormRow>
   {files.length?<div style={fileList}>{files.map(x=><span className="bloom-chip" key={x.name}>{x.name}</span>)}</div>:null}
   {busy?<InlineNotice>Đang tải và đăng Kỷ niệm… {progress}%</InlineNotice>:null}{error?<InlineNotice tone="danger">{error}</InlineNotice>:null}
   <div style={actions}><button className="bloom-btn secondary" disabled={busy} onClick={()=>setCompose(false)}>Hủy</button><button className="bloom-btn" disabled={busy||(!caption.trim()&&!files.length)} onClick={()=>void publish()}>Đăng</button></div>
  </WebModal>

  <WebModal open={!!commentsFor} onClose={()=>setCommentsFor(null)} title="Bình luận" sheet>
   <div style={{display:"flex",flexDirection:"column",gap:9,maxHeight:360,overflow:"auto"}}>{comments.length?comments.map(c=><div key={c.id} style={commentBubble}><b>{c.authorName||"Thành viên"}</b><span>{c.text}</span></div>):<div className="bloom-empty">Chưa có bình luận.</div>}</div>
   <div style={{display:"flex",gap:8,marginTop:12}}><input className="bloom-field" placeholder="Viết bình luận…" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void sendComment()}}/><button className="bloom-btn" onClick={()=>void sendComment()}>Gửi</button></div>
  </WebModal>
 </WebPage>
}
const format=(v?:string)=>v?new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"";const card:React.CSSProperties={padding:0,overflow:"hidden"};const author:React.CSSProperties={display:"flex",gap:10,alignItems:"center",padding:"16px 16px 8px"};const avatar:React.CSSProperties={width:42,height:42,borderRadius:15,objectFit:"cover"};const avatarFallback:React.CSSProperties={width:42,height:42,borderRadius:15,display:"grid",placeItems:"center",background:"#fce4ec",color:"#b95f79"};const time:React.CSSProperties={fontSize:11,color:"#9a858d",marginTop:2};const captionStyle:React.CSSProperties={fontSize:14,lineHeight:1.55,padding:"0 16px 8px",color:"#665159",whiteSpace:"pre-wrap"};const mediaStyle:React.CSSProperties={width:"100%",height:"min(54vw,420px)",objectFit:"cover",display:"block",background:"#f7eef1"};const reactionRow:React.CSSProperties={display:"flex",gap:5,overflowX:"auto",padding:"12px 12px 8px"};const tinyBtn:React.CSSProperties={padding:0,width:32,height:32};const fileList:React.CSSProperties={display:"flex",gap:6,flexWrap:"wrap",margin:"-3px 0 12px"};const actions:React.CSSProperties={display:"flex",justifyContent:"flex-end",gap:8,marginTop:16};const commentBubble:React.CSSProperties={display:"flex",flexDirection:"column",gap:3,padding:"10px 12px",borderRadius:14,background:"#fff4f6",fontSize:12,color:"#6f5861"};
