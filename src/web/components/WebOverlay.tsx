import type { ReactNode } from "react";

export function WebModal({open,onClose,title,children,footer,sheet=false}:{open:boolean;onClose():void;title:string;children:ReactNode;footer?:ReactNode;sheet?:boolean}){
 if(!open)return null;
 return <div className="bloom-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <section className={`bloom-modal ${sheet?"bloom-sheet":""}`} role="dialog" aria-modal="true" aria-label={title}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:".13em",color:"#bd6982"}}>FAMILY BLOOM</div><h2 style={{margin:"4px 0 0",fontSize:22,letterSpacing:"-.035em"}}>{title}</h2></div><button className="bloom-btn ghost" style={{width:38,height:38,padding:0,borderRadius:13}} onClick={onClose}>×</button></div>
   {children}
   {footer?<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,flexWrap:"wrap"}}>{footer}</div>:null}
  </section>
 </div>
}

export function FormRow({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}><span style={{fontSize:12,fontWeight:800,color:"#725b64"}}>{label}</span>{children}{hint?<span style={{fontSize:10,color:"#9c858d"}}>{hint}</span>:null}</label>}
export function InlineNotice({children,tone="soft"}:{children:ReactNode;tone?:"soft"|"danger"|"success"}){const bg=tone==="danger"?"#fff0f3":tone==="success"?"#effaf2":"#fff7f1";const color=tone==="danger"?"#a84663":tone==="success"?"#3d7951":"#8c6d5c";return <div style={{padding:"10px 12px",borderRadius:13,background:bg,color,fontSize:12,lineHeight:1.5}}>{children}</div>}
