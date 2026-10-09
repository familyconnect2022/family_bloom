import type { CSSProperties, ReactNode } from "react";

export function WebPage({ eyebrow, title, subtitle, children, action }: { eyebrow?:string; title:string; subtitle?:string; children:ReactNode; action?:ReactNode }) {
  return <section style={page}><div style={hero}><div><div style={eyebrowStyle}>{eyebrow || "FAMILY BLOOM"}</div><h1 style={titleStyle}>{title}</h1>{subtitle?<p style={subtitleStyle}>{subtitle}</p>:null}</div>{action}</div>{children}</section>;
}
export function WebCard({ children, style, onClick }: { children:ReactNode; style?:CSSProperties; onClick?:()=>void }) { return <div onClick={onClick} style={{...card,...style,...(onClick?{cursor:"pointer"}:null)}}>{children}</div>; }
export function EmptyState({ icon="🌸", title, copy }: {icon?:string;title:string;copy:string}){return <div style={empty}><div style={{fontSize:34}}>{icon}</div><b>{title}</b><span>{copy}</span></div>}
export function Skeleton({height=100}:{height?:number}){return <div style={{height,borderRadius:22,background:"linear-gradient(90deg,#fff1f4,#fbe0e8,#fff1f4)",backgroundSize:"220% 100%",animation:"bloom-shimmer 1.5s ease infinite"}}/>}
export function DataError({message}:{message?:string|null}){if(!message)return null;return <div role="alert" style={dataError}><b>Bloom chưa tải được phần này.</b><span>{message}</span></div>}
export const webGrid:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:14};
const page:CSSProperties={display:"flex",flexDirection:"column",gap:18}; const hero:CSSProperties={display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,padding:"8px 4px 2px"};
const eyebrowStyle:CSSProperties={fontSize:10,fontWeight:900,letterSpacing:".16em",color:"#c66b87"};const titleStyle:CSSProperties={fontSize:"clamp(28px,5vw,42px)",letterSpacing:"-.045em",margin:"4px 0 5px",lineHeight:1.04};const subtitleStyle:CSSProperties={fontSize:14,lineHeight:1.55,color:"#8c737c",margin:0,maxWidth:640};
const dataError:CSSProperties={display:"flex",flexDirection:"column",gap:4,padding:"11px 13px",borderRadius:14,background:"#fff0f3",border:"1px solid #f2ccd7",color:"#9e4d66",fontSize:11,lineHeight:1.45};
const card:CSSProperties={background:"rgba(255,255,255,.9)",border:"1px solid rgba(231,194,205,.55)",borderRadius:24,padding:18,boxShadow:"0 10px 35px rgba(95,59,72,.065)"}; const empty:CSSProperties={display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,minHeight:220,textAlign:"center",color:"#8b747d",padding:24};
