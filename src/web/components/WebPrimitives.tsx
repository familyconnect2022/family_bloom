import type { CSSProperties, ReactNode } from "react";

export function WebPage({ eyebrow, title, subtitle, children, action }: { eyebrow?:string; title:string; subtitle?:string; children:ReactNode; action?:ReactNode }) {
  return <section className="bloom-page">
    <div className="bloom-page-heading">
      <div className="bloom-page-heading-copy">
        <div className="bloom-eyebrow">{eyebrow || "FAMILY BLOOM"}</div>
        <h1>{title}</h1>
        {subtitle?<p>{subtitle}</p>:null}
      </div>
      {action?<div className="bloom-page-action">{action}</div>:null}
    </div>
    {children}
  </section>;
}

export function WebCard({ children, style, onClick, className="" }: { children:ReactNode; style?:CSSProperties; onClick?:()=>void; className?:string }) {
  return <div onClick={onClick} className={`bloom-card ${onClick?"is-clickable":""} ${className}`} style={style}>{children}</div>;
}

export function EmptyState({ icon="🌸", title, copy }: {icon?:string;title:string;copy:string}){
  return <div className="bloom-empty"><div className="bloom-empty-icon">{icon}</div><b>{title}</b><span>{copy}</span></div>;
}

export function Skeleton({height=100}:{height?:number}){
  return <div className="bloom-skeleton" style={{height}}/>;
}

export function DataError({message}:{message?:string|null}){
  if(!message)return null;
  return <div role="alert" className="bloom-data-error"><b>Bloom chưa tải được phần này.</b><span>{message}</span></div>;
}

export const webGrid:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:14};
