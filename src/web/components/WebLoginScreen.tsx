import { useState } from "react";
import { useWebAuth } from "../context/WebAuthContext";

export function WebLoginScreen() {
  const auth = useWebAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (job: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await job(); } finally { setBusy(false); }
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>🌸</div>
        <div style={styles.eyebrow}>FAMILY BLOOM · WEB</div>
        <h1 style={styles.title}>Nhà mình luôn ở gần</h1>
        <p style={styles.copy}>Bản web dành cho iPhone, iPad và máy tính. Dùng cùng tài khoản và cùng dữ liệu với Family Bloom trên Android.</p>
        <button style={styles.google} disabled={busy} onClick={() => void run(auth.signInGoogle)}>G&nbsp;&nbsp;Tiếp tục với Google</button>
        <div style={styles.or}><span />hoặc<span /></div>
        {!otpSent ? (
          <div style={styles.row}>
            <input style={styles.input} inputMode="tel" placeholder="Số điện thoại · 09..." value={phone} onChange={e => setPhone(e.target.value)} />
            <button id="bloom-phone-send" style={styles.softButton} disabled={busy || !phone.trim()} onClick={() => void run(async () => { await auth.sendPhoneCode(phone); setOtpSent(true); })}>Gửi mã</button>
          </div>
        ) : (
          <div style={styles.row}>
            <input style={styles.input} inputMode="numeric" placeholder="Mã OTP" value={otp} onChange={e => setOtp(e.target.value)} />
            <button style={styles.softButton} disabled={busy || otp.trim().length < 6} onClick={() => void run(() => auth.confirmPhoneCode(otp))}>Xác nhận</button>
          </div>
        )}
        {auth.error ? <p style={styles.error}>{auth.error}</p> : null}
        <p style={styles.note}>Trên iPhone/iPad, bạn có thể mở bằng Safari và chọn “Thêm vào Màn hình chính” để dùng Family Bloom như một ứng dụng web độc lập.</p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:{minHeight:"100dvh",display:"grid",placeItems:"center",padding:20,background:"radial-gradient(circle at 50% 0%,#ffe5ef 0,#fff7f3 44%,#fff 100%)",fontFamily:"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",color:"#432f36"},
  card:{width:"min(100%,430px)",background:"rgba(255,255,255,.84)",border:"1px solid rgba(232,138,166,.20)",boxShadow:"0 24px 70px rgba(120,70,88,.14)",borderRadius:32,padding:"34px 26px",backdropFilter:"blur(22px)"},
  logo:{width:76,height:76,borderRadius:25,display:"grid",placeItems:"center",fontSize:38,background:"#fde6ef",margin:"0 auto 18px"},
  eyebrow:{fontSize:11,letterSpacing:".18em",fontWeight:800,color:"#c36684",textAlign:"center"},
  title:{fontSize:32,lineHeight:1.08,margin:"10px 0 12px",textAlign:"center",letterSpacing:"-.04em"},
  copy:{fontSize:15,lineHeight:1.6,textAlign:"center",color:"#775d66",margin:"0 0 24px"},
  google:{width:"100%",border:0,borderRadius:16,padding:"15px 18px",fontSize:15,fontWeight:800,background:"#fff",color:"#46383d",boxShadow:"inset 0 0 0 1px #eadde1, 0 8px 20px rgba(99,70,80,.06)",cursor:"pointer"},
  or:{display:"flex",alignItems:"center",gap:10,fontSize:12,color:"#a58b94",margin:"18px 0"},
  row:{display:"flex",gap:9}, input:{minWidth:0,flex:1,border:"1px solid #eed9e1",background:"#fffafb",borderRadius:14,padding:"13px 14px",fontSize:14,outline:"none"},
  softButton:{border:0,borderRadius:14,padding:"0 16px",background:"#e98aa6",color:"white",fontWeight:800,cursor:"pointer"},
  error:{fontSize:12,lineHeight:1.5,color:"#b54762",background:"#fff0f3",borderRadius:12,padding:10,marginTop:12},
  note:{fontSize:12,lineHeight:1.5,color:"#9b858d",textAlign:"center",margin:"20px 10px 0"},
};
