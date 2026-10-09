export function WebGlobalStyles(){
  return <style>{`
    :root{
      --bloom-bg:#fff9f7;--bloom-paper:#fff;--bloom-ink:#432f36;--bloom-muted:#8f7780;
      --bloom-pink:#e98aa6;--bloom-pink-deep:#b85876;--bloom-pale:#fde8ef;--bloom-line:#efdce2;
      --bloom-shadow:0 18px 55px rgba(88,52,65,.10);--bloom-radius:24px;
      color-scheme:light;
    }
    *{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;background:var(--bloom-bg)}
    body{overscroll-behavior-y:none;-webkit-font-smoothing:antialiased}
    button,input,textarea,select{font:inherit}button{-webkit-tap-highlight-color:transparent}
    img,video{max-width:100%}
    @keyframes bloom-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
    @keyframes bloom-pop{0%{transform:scale(.94);opacity:0}100%{transform:scale(1);opacity:1}}
    @keyframes bloom-sheet{0%{transform:translateY(18px);opacity:0}100%{transform:translateY(0);opacity:1}}
    .bloom-shell{min-height:100dvh;background:linear-gradient(#fff9f7,#fff);color:var(--bloom-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    .bloom-header{position:sticky;top:0;z-index:40;height:calc(76px + env(safe-area-inset-top));display:flex;align-items:center;justify-content:space-between;gap:14px;padding:env(safe-area-inset-top) max(18px,env(safe-area-inset-right)) 0 max(18px,env(safe-area-inset-left));background:rgba(255,249,247,.90);backdrop-filter:blur(18px);border-bottom:1px solid rgba(226,184,197,.28)}
    .bloom-body{width:100%;margin:0 auto;padding:18px max(16px,env(safe-area-inset-right)) calc(104px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
    .bloom-nav{position:fixed;z-index:50;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);display:grid;grid-template-columns:repeat(5,1fr);width:min(calc(100% - 20px),540px);padding:7px;border-radius:25px;background:rgba(255,255,255,.94);backdrop-filter:blur(22px);box-shadow:0 16px 50px rgba(84,49,62,.16);border:1px solid rgba(231,195,206,.6)}
    .bloom-nav-link{min-height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;text-decoration:none;color:#9f8b91;font-size:10px;font-weight:750;transition:background .18s ease,color .18s ease,transform .18s ease}
    .bloom-nav-link[data-active='true']{background:#fbe5ec;color:#b85e79}
    .bloom-nav-icon{font-size:21px;line-height:24px}.bloom-nav-label{display:block}
    .bloom-page-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
    .bloom-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:14px}
    .bloom-two-pane{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
    .bloom-ipad-only{display:none}.bloom-phone-only{display:block}
    .bloom-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(48,31,38,.36);backdrop-filter:blur(3px);display:grid;place-items:center;padding:18px}
    .bloom-modal{width:min(100%,560px);max-height:min(86dvh,820px);overflow:auto;background:#fff;border:1px solid #f0dce3;border-radius:28px;box-shadow:0 24px 80px rgba(55,32,40,.25);padding:20px;animation:bloom-pop .18s ease-out}
    .bloom-sheet{width:min(100%,620px);align-self:end;border-radius:28px 28px 12px 12px;animation:bloom-sheet .2s ease-out}
    .bloom-field{width:100%;border:1px solid #edd8df;background:#fffafb;border-radius:15px;padding:12px 13px;color:#513d45;outline:none}
    .bloom-field:focus{border-color:#e08aa5;box-shadow:0 0 0 3px rgba(233,138,166,.12)}
    .bloom-textarea{min-height:108px;resize:vertical}
    .bloom-btn{border:0;border-radius:14px;padding:11px 15px;font-weight:850;cursor:pointer;transition:transform .12s ease,opacity .12s ease;background:#e98aa6;color:#fff}
    .bloom-btn:active{transform:scale(.98)}.bloom-btn:disabled{opacity:.5;cursor:default}.bloom-btn.secondary{background:#f8e8ed;color:#a4516c}.bloom-btn.ghost{background:transparent;color:#9c6074;border:1px solid #efdce2}.bloom-btn.danger{background:#fff0f3;color:#ae4d68}
    .bloom-chip{border:1px solid #efdce2;border-radius:999px;background:#fff;padding:8px 10px;font-size:12px;font-weight:750;color:#795f69;cursor:pointer}.bloom-chip[data-active='true']{background:#f8dfe7;color:#a44d69;border-color:#edbfd0}
    .bloom-section-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:10px 2px 4px}
    .bloom-empty{min-height:180px;display:grid;place-items:center;text-align:center;color:#8f7780;padding:26px}
    .bloom-game-board{touch-action:manipulation;user-select:none;-webkit-user-select:none}

    .bloom-connectivity{position:fixed;z-index:70;left:50%;top:calc(82px + env(safe-area-inset-top));transform:translateX(-50%);padding:8px 12px;border-radius:999px;font-size:11px;font-weight:800;box-shadow:0 8px 24px rgba(78,48,59,.12);pointer-events:none}.bloom-connectivity[data-tone='offline']{background:#fff0f3;color:#a64b67;border:1px solid #f1cad6}.bloom-connectivity[data-tone='soft']{background:#fff8ed;color:#8f6a45;border:1px solid #f0dec6}
    @media (min-width:768px){
      .bloom-shell{display:grid;grid-template-columns:calc(88px + env(safe-area-inset-left)) minmax(0,1fr);grid-template-rows:calc(76px + env(safe-area-inset-top)) minmax(0,1fr)}
      .bloom-header{grid-column:2;grid-row:1;padding:env(safe-area-inset-top) max(28px,env(safe-area-inset-right)) 0 28px}
      .bloom-body{grid-column:2;grid-row:2;max-width:1120px;padding:24px max(28px,env(safe-area-inset-right)) max(42px,env(safe-area-inset-bottom)) 28px}
      .bloom-nav{grid-column:1;grid-row:1 / span 2;position:sticky;left:auto;bottom:auto;top:0;transform:none;width:88px;height:100dvh;display:flex;flex-direction:column;justify-content:center;gap:7px;padding:12px 9px;border-radius:0;background:rgba(255,247,246,.94);border:0;border-right:1px solid #efdce2;box-shadow:none}
      .bloom-nav-link{width:70px;min-height:68px}.bloom-nav-icon{font-size:25px}.bloom-nav-label{font-size:9px}
      .bloom-page-grid{gap:20px}.bloom-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bloom-two-pane{grid-template-columns:minmax(0,1.3fr) minmax(280px,.7fr);align-items:start}.bloom-ipad-only{display:block}.bloom-phone-only{display:none}
      .bloom-modal-backdrop{padding:28px}.bloom-sheet{align-self:center;border-radius:30px}
    }
    @media (min-width:768px) and (max-width:1179px) and (orientation:landscape){
      .bloom-body{max-width:1180px;padding-top:20px}.bloom-two-pane{grid-template-columns:minmax(0,1.65fr) minmax(260px,.8fr)}.bloom-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bloom-nav-link{min-height:62px}
    }
    @media (min-width:1180px){
      .bloom-shell{grid-template-columns:190px minmax(0,1fr)}
      .bloom-nav{width:190px;align-items:stretch;padding:18px 14px}.bloom-nav-link{width:100%;min-height:54px;flex-direction:row;justify-content:flex-start;gap:12px;padding:0 14px;font-size:12px}.bloom-nav-icon{width:28px;text-align:center}.bloom-nav-label{font-size:12px}
      .bloom-body{max-width:1260px;padding:28px 34px 48px}.bloom-card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    }
    @media (display-mode:standalone){body{background:#fff9f7}.bloom-shell{min-height:100svh}}
  `}</style>;
}
