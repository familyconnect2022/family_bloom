import React from "react";

type State={error:Error|null};
export class WebRuntimeBoundary extends React.Component<{children:React.ReactNode},State>{
 state:State={error:null};
 static getDerivedStateFromError(error:Error){return{error}}
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error("[web-runtime]",error,info.componentStack)}
 render(){if(!this.state.error)return this.props.children;return <div style={wrap}><div style={card}><div style={flower}>🌸</div><h1 style={title}>Family Bloom cần tải lại</h1><p style={copy}>Có một phần giao diện web vừa gặp lỗi. Dữ liệu của bạn vẫn ở Firebase và chưa bị thay đổi.</p><pre style={detail}>{this.state.error.message}</pre><button className="bloom-btn" onClick={()=>window.location.reload()}>Tải lại Family Bloom</button></div></div>}
}
const wrap:React.CSSProperties={minHeight:"100dvh",display:"grid",placeItems:"center",padding:24,background:"#fff9f7",fontFamily:"Inter,system-ui,sans-serif",color:"#4d3940"};
const card:React.CSSProperties={width:"min(100%,480px)",padding:28,borderRadius:28,background:"white",border:"1px solid #efdce2",boxShadow:"0 24px 70px rgba(76,45,57,.12)",textAlign:"center"};
const flower:React.CSSProperties={fontSize:44};const title:React.CSSProperties={fontSize:24,margin:"8px 0"};const copy:React.CSSProperties={fontSize:13,lineHeight:1.6,color:"#8b747d"};const detail:React.CSSProperties={whiteSpace:"pre-wrap",fontSize:11,textAlign:"left",padding:12,borderRadius:14,background:"#fff4f6",color:"#995368",overflow:"auto"};
