import { useState } from "react";
import { useWebAuth } from "../context/WebAuthContext";

export function WebLoginScreen() {
  const auth = useWebAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (job: () => Promise<void>) => { if (busy) return; setBusy(true); try { await job(); } finally { setBusy(false); } };

  return <main className="bloom-login"><div className="bloom-login-wrap">
    <section className="bloom-login-story"><div className="bloom-eyebrow" style={{color:"rgba(255,255,255,.8)"}}>FAMILY BLOOM</div><h2>Nhà mình luôn ở gần.</h2><p>Kỷ niệm, Phả hệ, lịch hẹn, những lời thì thầm và cả một ván cờ đang chờ — giờ có thể mở ngay trên iPhone, iPad hay máy tính.</p><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:24}}>{["♡ Kỷ niệm","✿ Phả hệ","♟ Trò chơi","🎁 Hộp thời gian"].map(x=><span key={x} style={{padding:"8px 11px",borderRadius:99,background:"rgba(255,255,255,.18)",fontSize:11,fontWeight:800}}>{x}</span>)}</div></section>
    <section className="bloom-login-card"><div className="bloom-login-logo">🌸</div><div className="bloom-eyebrow" style={{textAlign:"center"}}>FAMILY BLOOM · WEB</div><h1>Về Nhà Mình</h1><p className="bloom-login-copy">Đăng nhập bằng tài khoản Family Bloom để tiếp tục cùng gia đình.</p><button className="bloom-google" disabled={busy} onClick={() => void run(auth.signInGoogle)}>G&nbsp;&nbsp; Tiếp tục với Google</button><div className="bloom-or">hoặc</div>{!otpSent?<div className="bloom-login-row"><input className="bloom-field" inputMode="tel" placeholder="Số điện thoại · 09..." value={phone} onChange={e=>setPhone(e.target.value)}/><button id="bloom-phone-send" className="bloom-btn" disabled={busy||!phone.trim()} onClick={()=>void run(async()=>{await auth.sendPhoneCode(phone);setOtpSent(true)})}>Gửi mã</button></div>:<div className="bloom-login-row"><input className="bloom-field" inputMode="numeric" placeholder="Mã OTP" value={otp} onChange={e=>setOtp(e.target.value)}/><button className="bloom-btn" disabled={busy||otp.trim().length<6} onClick={()=>void run(()=>auth.confirmPhoneCode(otp))}>Xác nhận</button></div>}{auth.error?<p className="bloom-login-error">{auth.error}</p>:null}<p className="bloom-login-note">Trên iPhone/iPad, mở bằng Safari rồi chọn “Thêm vào Màn hình chính” để Family Bloom ở cạnh bạn như một ứng dụng.</p></section>
  </div></main>;
}
