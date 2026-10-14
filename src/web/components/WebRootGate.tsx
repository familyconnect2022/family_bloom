import { Slot } from "expo-router";
import { WebLoginScreen } from "./WebLoginScreen";
import { useWebAuth } from "../context/WebAuthContext";
import { useWebFamily } from "../context/WebFamilyContext";
import { WebFamilyGateway } from "./WebFamilyManager";

export function WebRootGate() {
  const auth = useWebAuth();
  const family = useWebFamily();
  if (auth.loading) return <div style={splash}><div style={flower}>🌸</div><div>Đang mở Family Bloom…</div></div>;
  if (!auth.user) return <WebLoginScreen />;
  if (family.loading) return <div style={splash}><div style={flower}>🌸</div><div>Đang nối với Nhà Mình…</div></div>;
  if (!family.memberships.length) return <WebFamilyGateway />;
  return <Slot />;
}

const splash: React.CSSProperties={minHeight:"100dvh",display:"flex",flexDirection:"column",gap:12,alignItems:"center",justifyContent:"center",fontFamily:"Inter,system-ui,sans-serif",color:"#5c444d",background:"#fffaf8",padding:24};
const flower: React.CSSProperties={fontSize:42};
const logoutBtn: React.CSSProperties={border:0,borderRadius:14,padding:"12px 18px",background:"#f3d9e2",color:"#9b4f67",fontWeight:800};
