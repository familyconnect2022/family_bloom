import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  CHESS_EVENTS,
  CHESS_TIME_CONTROLS,
  applyChessMoveDelta,
  type ChessColor,
  type ChessGameState,
  type ChessInvite,
  type ChessMoveDelta,
  type ChessPromotionPiece,
  type ChessTimeControl,
} from "../../types/chess";
import {
  XIANGQI_EVENTS,
  XIANGQI_TIME_CONTROLS,
  type XiangqiMoveDelta,
  type XiangqiRealtimeState,
  type XiangqiTimeControl,
} from "../../types/xiangqiRealtime";
import { getXiangqiLegalMovesForColor } from "../../games/xiangqi/xiangqiEngine";
import { useWebAuth } from "../context/WebAuthContext";
import { useWebFamily } from "../context/WebFamilyContext";
import { WebCard } from "../components/WebPrimitives";
import { WebModal } from "../components/WebOverlay";
import { useWebGameSocket } from "./WebGameSocketContext";
import { useWebGameAudio, type WebGameSound } from "./webGameAudio";

type GameKind = "chess" | "xiangqi";
type Presence = { uid: string; status: string };
type ChessPremove = { from: string; to: string; promotion?: ChessPromotionPiece };
type XiangqiPremove = { pieceId: string; to: { col: number; row: number } };
const req = () => crypto.randomUUID();

export function WebRealtimeGames() {
  const gameNet = useWebGameSocket();
  const [kind, setKind] = useState<GameKind>(gameNet.requestedKind);
  useEffect(() => setKind(gameNet.requestedKind), [gameNet.requestedKind]);
  const pick = (next: GameKind) => { setKind(next); gameNet.setRequestedKind(next); };
  return <div style={wrap}>
    <div style={switcher}>
      <button style={{ ...seg, ...(kind === "chess" ? activeSeg : null) }} onClick={() => pick("chess")}>♟ Cờ vua</button>
      <button style={{ ...seg, ...(kind === "xiangqi" ? activeSeg : null) }} onClick={() => pick("xiangqi")}>帥 Cờ tướng</button>
    </div>
    {kind === "chess" ? <ChessWebArena /> : <XiangqiWebArena />}
  </div>;
}

function ChessWebArena() {
  const { user } = useWebAuth();
  const family = useWebFamily();
  const net = useWebGameSocket();
  const audio = useWebGameAudio();
  const [state, setState] = useState<ChessGameState | null>(null);
  const stateRef = useRef<ChessGameState | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [premove, setPremove] = useState<ChessPremove | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Sẵn sàng chơi Cờ vua cùng Nhà Mình.");
  const [timeControl, setTimeControl] = useState<ChessTimeControl>(CHESS_TIME_CONTROLS[2].value);
  const [promotion, setPromotion] = useState<{ from: string; to: string; premove: boolean } | null>(null);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const readyRef = useRef(new Set<string>());
  const premoveSending = useRef(false);
  const resultAcked = useRef(new Set<string>());

  const applyState = useCallback((next: ChessGameState) => {
    const previous = stateRef.current;
    stateRef.current = next; setState(next); setReceivedAt(Date.now());
    if (previous?.status !== "active" && next.status === "active") audio.play("game-start", .75);
    if (previous?.status !== "finished" && next.status === "finished") window.setTimeout(() => audio.play("game-end", .75), 90);
  }, [audio]);

  useEffect(() => {
    const socket = net.socket;
    if (!socket) return;
    const onState = (x: ChessGameState) => applyState(x);
    const onMove = (delta: ChessMoveDelta) => {
      const current = stateRef.current;
      if (!current || current.gameId !== delta.gameId) return;
      const mine = (current.whiteUid === user?.uid ? "w" : current.blackUid === user?.uid ? "b" : null) as ChessColor | null;
      const sound: WebGameSound = delta.move.promotion ? "promote" : /[kq]/.test(delta.move.flags) ? "castle" : delta.checkSquare ? "move-check" : delta.move.captured ? "capture" : delta.move.color === mine ? "move-self" : "move-opponent";
      const next = applyChessMoveDelta(current, delta);
      stateRef.current = next; setState(next); setReceivedAt(Date.now());
      requestAnimationFrame(() => requestAnimationFrame(() => audio.play(sound)));
      if (delta.status === "finished") window.setTimeout(() => audio.play("game-end", .75), 120);
    };
    socket.on(CHESS_EVENTS.gameState, onState);
    socket.on(CHESS_EVENTS.gameMoveApplied, onMove);
    return () => { socket.off(CHESS_EVENTS.gameState, onState); socket.off(CHESS_EVENTS.gameMoveApplied, onMove); };
  }, [applyState, audio, net.socket, user?.uid]);

  const recover = useCallback(async () => {
    if (!family.activeFamilyId) return;
    const result = await net.emitAck<any>(CHESS_EVENTS.sessionRecover, { familyId: family.activeFamilyId });
    if (!result.ok || result.data?.kind === "none") return;
    const joined = await net.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId: family.activeFamilyId, gameId: result.data.gameId });
    if (joined.ok) { applyState(joined.data); setMsg(result.data.kind === "finished_unseen" ? "Kết quả ván trước đã được khôi phục." : "Đã khôi phục ván Cờ vua."); }
  }, [applyState, family.activeFamilyId, net]);

  useEffect(() => { if (net.connected && !stateRef.current) void recover(); }, [net.connected, recover]);
  useEffect(() => { stateRef.current = null; setState(null); setSelected(null); setPremove(null); readyRef.current.clear(); resultAcked.current.clear(); }, [family.activeFamilyId]);

  useEffect(() => {
    if (!state || state.status !== "waiting" || readyRef.current.has(state.gameId)) return;
    readyRef.current.add(state.gameId);
    void net.emitAck<ChessGameState>(CHESS_EVENTS.gameReady, { gameId: state.gameId, requestId: req() }).then(r => { if (r.ok) applyState(r.data); else readyRef.current.delete(state.gameId); });
  }, [applyState, net, state]);

  useEffect(() => {
    if (!state || state.status !== "finished" || resultAcked.current.has(state.gameId) || !family.activeFamilyId) return;
    resultAcked.current.add(state.gameId);
    const timer = window.setTimeout(() => void net.emitAck(CHESS_EVENTS.gameResultAck, { familyId: family.activeFamilyId, gameId: state.gameId }), 700);
    return () => window.clearTimeout(timer);
  }, [family.activeFamilyId, net, state]);

  useBoardPresence(state?.gameId ?? null, CHESS_EVENTS.gameBoardPresence, net.emitAck);

  const myColor = state ? (state.whiteUid === user?.uid ? "w" : state.blackUid === user?.uid ? "b" : null) : null;
  const game = useMemo(() => state ? safeChess(state.fen) : null, [state?.fen]);
  const displayGame = game;
  const pseudoGame = useMemo(() => {
    if (!state || !myColor || state.turn === myColor) return game;
    const parts = state.fen.split(" "); parts[1] = myColor;
    return safeChess(parts.join(" "));
  }, [game, myColor, state]);
  const moveSource = state?.turn === myColor ? game : pseudoGame;
  const legal = useMemo(() => chessMoves(moveSource, selected), [moveSource, selected]);
  const legalTargets = useMemo(() => new Set(legal.map(x => x.to)), [legal]);

  const sendMove = useCallback(async (move: ChessPremove, expectedVersion: number) => {
    if (!stateRef.current) return false;
    const r = await net.emitAck<any>(CHESS_EVENTS.gameMove, { gameId: stateRef.current.gameId, clientMoveId: req(), expectedVersion, from: move.from, to: move.to, promotion: move.promotion ?? null });
    if (!r.ok) { audio.play("illegal", .55); setMsg(r.message || r.errorCode || "Nước đi chưa hợp lệ."); return false; }
    return true;
  }, [audio, net]);

  useEffect(() => {
    const current = state;
    if (!current || !premove || !myColor || current.status !== "active" || current.turn !== myColor || premoveSending.current) return;
    const g = safeChess(current.fen);
    const valid = chessMoves(g, premove.from).some(m => m.to === premove.to && (!premove.promotion || m.promotion === premove.promotion));
    if (!valid) { setPremove(null); audio.play("illegal", .45); setMsg("Premove không còn hợp lệ sau nước của đối thủ."); return; }
    premoveSending.current = true;
    void sendMove(premove, current.revision).finally(() => { premoveSending.current = false; setPremove(null); });
  }, [audio, myColor, premove, sendMove, state]);

  const chooseDestination = async (from: string, to: string, premoveMode: boolean, promotionPiece?: ChessPromotionPiece) => {
    const options = legal.filter(m => m.to === to);
    if (!options.length) return;
    if (options.some(m => m.promotion) && !promotionPiece) { setPromotion({ from, to, premove: premoveMode }); return; }
    const selectedMove = options.find(m => !promotionPiece || m.promotion === promotionPiece) || options[0];
    const intent: ChessPremove = { from, to, ...(selectedMove.promotion ? { promotion: selectedMove.promotion as ChessPromotionPiece } : {}) };
    setPromotion(null); setSelected(null);
    if (premoveMode) { setPremove(intent); audio.play("premove", .55); setMsg("Đã xếp premove. Bloom sẽ kiểm tra lại khi tới lượt bạn."); return; }
    const current = stateRef.current; if (current) await sendMove(intent, current.revision);
  };

  const tap = async (square: string) => {
    audio.unlock();
    const current = stateRef.current;
    if (!current || !displayGame || current.status !== "active" || !myColor) return;
    const p = (current.turn === myColor ? displayGame : pseudoGame)?.get(square as any);
    if (!selected) { if (p?.color === myColor) setSelected(square); return; }
    if (square === selected) { setSelected(null); return; }
    if (legalTargets.has(square)) { await chooseDestination(selected, square, current.turn !== myColor); return; }
    if (p?.color === myColor) setSelected(square); else setSelected(null);
  };

  const beginBot = async () => {
    if (!family.activeFamilyId || busy) return; audio.unlock(); setBusy(true);
    try {
      const inv = await net.emitAck<any>(CHESS_EVENTS.testBotInvite, { familyId: family.activeFamilyId, timeControl, requestId: req(), delayMs: 0 });
      if (!inv.ok) throw new Error(inv.message || inv.errorCode || "Không tạo được Bloom Bot.");
      const accepted = await net.emitAck<any>(CHESS_EVENTS.inviteAccept, { inviteId: inv.data.inviteId, requestId: req() });
      if (!accepted.ok) throw new Error(accepted.message || accepted.errorCode || "Không tạo được ván Cờ vua.");
      applyState(accepted.data.state); setMsg("Bloom Bot nghĩ khoảng 3 giây, hoặc 5 giây khi chuẩn bị chiếu.");
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const challenge = async (toUid: string) => {
    if (!family.activeFamilyId) return; audio.unlock();
    const r = await net.emitAck<ChessInvite>(CHESS_EVENTS.inviteCreate, { familyId: family.activeFamilyId, toUid, timeControl, requestId: req() });
    setMsg(r.ok ? "Đã gửi lời thách đấu. Bloom đang chờ người thân trả lời…" : (r.message || r.errorCode || "Không gửi được lời thách đấu."));
  };
  const resign = async () => { const current = stateRef.current; if (current) await net.emitAck(CHESS_EVENTS.gameResign, { gameId: current.gameId, requestId: req() }); };
  const rematch = async () => { const current = stateRef.current; if (!current) return; const r = await net.emitAck<any>(CHESS_EVENTS.gameRematch, { gameId: current.gameId, requestId: req() }); if (r.ok && r.data?.state) applyState(r.data.state); setMsg(r.ok && r.data?.waiting ? "Đang chờ người thân đồng ý tái đấu…" : "Đã tạo ván tái đấu."); };
  const draw = async (event: string) => { const current = stateRef.current; if (!current) return; const r = await net.emitAck<ChessGameState>(event, { gameId: current.gameId, requestId: req() }); if (r.ok) applyState(r.data); };

  const online = onlineMembers(family.members, net.chessPresence, user?.uid);
  return <GameFrame title="Cờ vua realtime" connected={net.connected} status={msg} error={net.error}>
    {!state ? <LobbyPanel members={online} timeControls={CHESS_TIME_CONTROLS} value={timeControl} onChange={setTimeControl} onBot={beginBot} onChallenge={challenge} busy={busy} gameLabel="Cờ vua" /> : <>
      <PlayerStrip members={family.members} meUid={user?.uid || ""} topUid={myColor === "w" ? state.blackUid : state.whiteUid} bottomUid={user?.uid || ""} />
      <ClockRow leftLabel="Bạn" leftMs={myColor === "w" ? state.whiteRemainingMs : state.blackRemainingMs} rightLabel={state.testBotUid ? "Bloom Bot" : "Đối thủ"} rightMs={myColor === "w" ? state.blackRemainingMs : state.whiteRemainingMs} leftActive={state.status === "active" && state.turn === myColor} rightActive={state.status === "active" && state.turn !== myColor} receivedAt={receivedAt} onTenSeconds={() => audio.play("tenseconds", .7)} />
      {displayGame ? <ChessBoard game={displayGame} orientation={myColor || "w"} selected={selected} legal={legalTargets} premove={premove} onTap={tap} lastMove={state.lastMove} checkSquare={state.checkSquare} /> : null}
      <div style={actionRow}>
        {state.status === "active" ? <><button className="bloom-btn secondary" onClick={() => void draw(CHESS_EVENTS.drawOffer)}>Xin hòa</button><button className="bloom-btn danger" onClick={() => void resign()}>Xin thua</button></> : null}
        {state.status === "finished" ? <><button className="bloom-btn primary" onClick={() => void rematch()}>Tái đấu</button><button className="bloom-btn secondary" onClick={() => { setState(null); stateRef.current = null; setPremove(null); setSelected(null); }}>Về sảnh</button></> : null}
      </div>
      {state.drawOfferByUid && state.drawOfferByUid !== user?.uid && state.status === "active" ? <div style={offerBox}>Đối thủ đề nghị hòa.<div style={actionRow}><button className="bloom-btn secondary" onClick={() => void draw(CHESS_EVENTS.drawReject)}>Từ chối</button><button className="bloom-btn primary" onClick={() => void draw(CHESS_EVENTS.drawAccept)}>Đồng ý</button></div></div> : null}
      {state.status === "finished" ? <Result result={state.result} reason={state.finishReason} mine={myColor === "w" ? "white" : "black"} /> : null}
    </>}
    <PromotionModal open={!!promotion} onChoose={piece => { if (promotion) void chooseDestination(promotion.from, promotion.to, promotion.premove, piece); }} onClose={() => setPromotion(null)} />
  </GameFrame>;
}

function XiangqiWebArena() {
  const { user } = useWebAuth(); const family = useWebFamily(); const net = useWebGameSocket(); const audio = useWebGameAudio();
  const [state, setState] = useState<XiangqiRealtimeState | null>(null); const stateRef = useRef<XiangqiRealtimeState | null>(null);
  const [selected, setSelected] = useState<string | null>(null); const [premove, setPremove] = useState<XiangqiPremove | null>(null); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("Sẵn sàng chơi Cờ tướng cùng Nhà Mình."); const [timeControl, setTimeControl] = useState<XiangqiTimeControl>(XIANGQI_TIME_CONTROLS[2].value); const [receivedAt, setReceivedAt] = useState(Date.now());
  const readyRef = useRef(new Set<string>()); const premoveSending = useRef(false); const resultAcked = useRef(new Set<string>());
  const applyState = useCallback((next: XiangqiRealtimeState) => { const prev = stateRef.current; stateRef.current = next; setState(next); setReceivedAt(Date.now()); if (prev?.status !== "active" && next.status === "active") audio.play("game-start", .75); if (prev?.status !== "finished" && next.status === "finished") window.setTimeout(() => audio.play("game-end", .75), 90); }, [audio]);
  useEffect(() => { const socket = net.socket; if (!socket) return; const onState = (x: XiangqiRealtimeState) => applyState(x); const onMove = (d: XiangqiMoveDelta) => { const current = stateRef.current; if (!current || current.gameId !== d.gameId) return; const mine = current.redUid === user?.uid ? "red" : current.blackUid === user?.uid ? "black" : null; const moving = current.board.pieces.find(p => p.id === d.move.pieceId); const sound: WebGameSound = d.board.inCheck ? "move-check" : d.move.capturedId ? "capture" : moving?.color === mine ? "move-self" : "move-opponent"; const next = { ...current, board: d.board, revision: d.version, redRemainingMs: d.redRemainingMs, blackRemainingMs: d.blackRemainingMs, status: d.status, result: d.result, finishReason: d.finishReason, serverNowMs: d.serverNowMs, endedAt: d.endedAt } as XiangqiRealtimeState; stateRef.current = next; setState(next); setReceivedAt(Date.now()); requestAnimationFrame(() => requestAnimationFrame(() => audio.play(sound))); if (d.status === "finished") window.setTimeout(() => audio.play("game-end", .75), 120); }; socket.on(XIANGQI_EVENTS.gameState, onState); socket.on(XIANGQI_EVENTS.gameMoveApplied, onMove); return () => { socket.off(XIANGQI_EVENTS.gameState, onState); socket.off(XIANGQI_EVENTS.gameMoveApplied, onMove); }; }, [applyState, audio, net.socket, user?.uid]);
  const recover = useCallback(async () => { if (!family.activeFamilyId) return; const r = await net.emitAck<any>(XIANGQI_EVENTS.sessionRecover, { familyId: family.activeFamilyId }); if (!r.ok || r.data?.kind === "none") return; const joined = await net.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin, { familyId: family.activeFamilyId, gameId: r.data.gameId }); if (joined.ok) { applyState(joined.data); setMsg("Đã khôi phục ván Cờ tướng."); } }, [applyState, family.activeFamilyId, net]);
  useEffect(() => { if (net.connected && !stateRef.current) void recover(); }, [net.connected, recover]);
  useEffect(() => { stateRef.current = null; setState(null); setSelected(null); setPremove(null); readyRef.current.clear(); resultAcked.current.clear(); }, [family.activeFamilyId]);
  useEffect(() => { if (!state || state.status !== "waiting" || readyRef.current.has(state.gameId)) return; readyRef.current.add(state.gameId); void net.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameReady, { gameId: state.gameId, requestId: req() }).then(r => { if (r.ok) applyState(r.data); else readyRef.current.delete(state.gameId); }); }, [applyState, net, state]);
  useEffect(() => { if (!state || state.status !== "finished" || resultAcked.current.has(state.gameId) || !family.activeFamilyId) return; resultAcked.current.add(state.gameId); const timer = window.setTimeout(() => void net.emitAck(XIANGQI_EVENTS.gameResultAck, { familyId: family.activeFamilyId, gameId: state.gameId }), 700); return () => window.clearTimeout(timer); }, [family.activeFamilyId, net, state]);
  useBoardPresence(state?.gameId ?? null, XIANGQI_EVENTS.gameBoardPresence, net.emitAck);
  const myColor = state ? (state.redUid === user?.uid ? "red" : state.blackUid === user?.uid ? "black" : null) : null;
  const legal = useMemo(() => selected && state && myColor ? getXiangqiLegalMovesForColor({ pieces: state.board.pieces, gameOver: state.board.gameOver }, selected, myColor) : [], [myColor, selected, state]);
  const legalTargets = useMemo(() => new Set(legal.map(x => `${x.col}:${x.row}`)), [legal]);
  const sendMove = useCallback(async (intent: XiangqiPremove, expectedVersion: number) => { const current = stateRef.current; if (!current) return false; const r = await net.emitAck<any>(XIANGQI_EVENTS.gameMove, { gameId: current.gameId, clientMoveId: req(), expectedVersion, pieceId: intent.pieceId, to: intent.to }); if (!r.ok) { audio.play("illegal", .55); setMsg(r.message || r.errorCode || "Nước đi không hợp lệ."); return false; } return true; }, [audio, net]);
  useEffect(() => { const current = state; if (!current || !premove || !myColor || current.status !== "active" || current.board.turn !== myColor || premoveSending.current) return; const targets = getXiangqiLegalMovesForColor({ pieces: current.board.pieces, gameOver: current.board.gameOver }, premove.pieceId, myColor); if (!targets.some(x => x.col === premove.to.col && x.row === premove.to.row)) { setPremove(null); audio.play("illegal", .45); setMsg("Premove Cờ tướng không còn hợp lệ."); return; } premoveSending.current = true; void sendMove(premove, current.revision).finally(() => { premoveSending.current = false; setPremove(null); }); }, [audio, myColor, premove, sendMove, state]);
  const tap = async (col: number, row: number) => { audio.unlock(); const current = stateRef.current; if (!current || current.status !== "active" || !myColor) return; const piece = current.board.pieces.find(p => p.col === col && p.row === row); if (!selected) { if (piece?.color === myColor) setSelected(piece.id); return; } if (piece?.id === selected) { setSelected(null); return; } if (legalTargets.has(`${col}:${row}`)) { const intent = { pieceId: selected, to: { col, row } }; setSelected(null); if (current.board.turn !== myColor) { setPremove(intent); audio.play("premove", .55); setMsg("Đã xếp premove Cờ tướng."); } else await sendMove(intent, current.revision); return; } if (piece?.color === myColor) setSelected(piece.id); else setSelected(null); };
  const beginBot = async () => { if (!family.activeFamilyId || busy) return; audio.unlock(); setBusy(true); try { const inv = await net.emitAck<any>(XIANGQI_EVENTS.testBotInvite, { familyId: family.activeFamilyId, timeControl, requestId: req() }); if (!inv.ok) throw new Error(inv.message || inv.errorCode || "Không tạo được Bloom Bot."); const accepted = await net.emitAck<any>(XIANGQI_EVENTS.inviteAccept, { inviteId: inv.data.inviteId, requestId: req() }); if (!accepted.ok) throw new Error(accepted.message || accepted.errorCode || "Không tạo được ván Cờ tướng."); applyState(accepted.data.state); setMsg("Bloom Bot Cờ tướng nghĩ 3 giây, hoặc 5 giây khi chuẩn bị chiếu."); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } };
  const challenge = async (toUid: string) => { if (!family.activeFamilyId) return; audio.unlock(); const r = await net.emitAck<any>(XIANGQI_EVENTS.inviteCreate, { familyId: family.activeFamilyId, toUid, timeControl, requestId: req() }); setMsg(r.ok ? "Đã gửi lời thách đấu Cờ tướng." : (r.message || r.errorCode || "Không gửi được lời thách đấu.")); };
  const resign = async () => { const current = stateRef.current; if (current) await net.emitAck(XIANGQI_EVENTS.gameResign, { gameId: current.gameId, requestId: req() }); };
  const rematch = async () => { const current = stateRef.current; if (!current) return; const r = await net.emitAck<any>(XIANGQI_EVENTS.gameRematch, { gameId: current.gameId, requestId: req() }); if (r.ok && r.data?.state) applyState(r.data.state); setMsg(r.ok && r.data?.waiting ? "Đang chờ tái đấu…" : "Đã tạo ván tái đấu."); };
  const online = onlineMembers(family.members, net.xiangqiPresence, user?.uid);
  return <GameFrame title="Cờ tướng realtime" connected={net.connected} status={msg} error={net.error}>
    {!state ? <LobbyPanel members={online} timeControls={XIANGQI_TIME_CONTROLS} value={timeControl} onChange={setTimeControl} onBot={beginBot} onChallenge={challenge} busy={busy} gameLabel="Cờ tướng" /> : <>
      <PlayerStrip members={family.members} meUid={user?.uid || ""} topUid={myColor === "red" ? state.blackUid : state.redUid} bottomUid={user?.uid || ""} />
      <ClockRow leftLabel="Bạn" leftMs={myColor === "red" ? state.redRemainingMs : state.blackRemainingMs} rightLabel={state.testBotUid ? "Bloom Bot" : "Đối thủ"} rightMs={myColor === "red" ? state.blackRemainingMs : state.redRemainingMs} leftActive={state.status === "active" && state.board.turn === myColor} rightActive={state.status === "active" && state.board.turn !== myColor} receivedAt={receivedAt} onTenSeconds={() => audio.play("tenseconds", .7)} />
      <XiangqiBoard state={state} orientation={myColor || "red"} selected={selected} legal={legalTargets} premove={premove} onTap={tap} />
      <div style={actionRow}>{state.status === "active" ? <button className="bloom-btn danger" onClick={() => void resign()}>Xin thua</button> : null}{state.status === "finished" ? <><button className="bloom-btn primary" onClick={() => void rematch()}>Tái đấu</button><button className="bloom-btn secondary" onClick={() => { stateRef.current = null; setState(null); setPremove(null); setSelected(null); }}>Về sảnh</button></> : null}</div>
      {state.status === "finished" ? <Result result={state.result} reason={state.finishReason} mine={myColor || undefined} /> : null}
    </>}
  </GameFrame>;
}

function useBoardPresence(gameId: string | null, event: string, emitAck: <T>(event: string, payload: unknown, timeout?: number) => Promise<any>) {
  useEffect(() => {
    if (!gameId) return;
    let last: boolean | null = null;
    const send = (visible: boolean) => {
      if (last === visible) return;
      last = visible;
      void emitAck(event, { gameId, visible }, 6_000);
    };
    const sync = () => send(!document.hidden && document.visibilityState === "visible");
    const onPageHide = () => send(false);
    const onPageShow = () => sync();
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onPageShow);
    window.addEventListener("blur", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onPageShow);
      window.removeEventListener("blur", onPageHide);
      send(false);
    };
  }, [emitAck, event, gameId]);
}

function LobbyPanel<T extends ChessTimeControl | XiangqiTimeControl>({ members, timeControls, value, onChange, onBot, onChallenge, busy, gameLabel }: { members: Array<any>; timeControls: Array<{ id: string; label: string; value: T }>; value: T; onChange: (v: T) => void; onBot: () => Promise<void>; onChallenge: (uid: string) => Promise<void>; busy: boolean; gameLabel: string }) {
  return <div style={lobbyGrid}>
    <div style={lobbyMain}>
      <div style={kicker}>THỜI GIAN</div>
      <div style={tcGrid}>{timeControls.map(item => <button key={item.id} style={{ ...tcButton, ...(sameTc(item.value, value) ? tcActive : null) }} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>
      <button className="bloom-btn primary" style={{ width: "100%", marginTop: 12 }} onClick={() => void onBot()} disabled={busy}>{busy ? "Đang kết nối…" : `Chơi ${gameLabel} với Bloom Bot`}</button>
      <div style={helper}>Bot chạy server-authoritative: nước thường khoảng 3 giây, nước chuẩn bị chiếu khoảng 5 giây.</div>
    </div>
    <div style={lobbySide}><div style={kicker}>NGƯỜI NHÀ ĐANG ONLINE</div>{members.length ? <div style={{ display: "grid", gap: 8, marginTop: 10 }}>{members.map(member => <div key={member.uid} style={memberRow}><MemberIdentity member={member} /><button className="bloom-btn secondary" onClick={() => void onChallenge(member.uid)}>Thách đấu</button></div>)}</div> : <div style={emptyLobby}>Chưa có người thân nào online. Bạn vẫn có thể test với Bloom Bot.</div>}</div>
  </div>;
}

function PlayerStrip({ members, topUid, bottomUid }: { members: any[]; meUid: string; topUid: string; bottomUid: string }) {
  const top = members.find(x => x.uid === topUid) || { uid: topUid, displayName: "Bloom Bot" };
  const bottom = members.find(x => x.uid === bottomUid) || { uid: bottomUid, displayName: "Bạn" };
  return <div style={players}><MemberIdentity member={top} /><div style={{ fontSize: 11, color: "#a08790" }}>VS</div><MemberIdentity member={bottom} /></div>;
}
function MemberIdentity({ member }: { member: any }) { return <div style={identity}><div style={{ ...memberAvatar, background: member.color || "#e98aa6" }}>{member.avatarUrl ? <img src={member.avatarUrl} alt="" style={memberImg} /> : String(member.shortName || member.displayName || "?").slice(0, 1)}</div><div><b style={{ fontSize: 12 }}>{member.displayName || member.shortName || "Thành viên"}</b><div style={{ fontSize: 10, color: "#9a838b" }}>{member.statusLabel || "Nhà Mình"}</div></div></div>; }

function ClockRow({ leftLabel, leftMs, rightLabel, rightMs, leftActive, rightActive, receivedAt, onTenSeconds }: { leftLabel: string; leftMs: number | null; rightLabel: string; rightMs: number | null; leftActive: boolean; rightActive: boolean; receivedAt: number; onTenSeconds: () => void }) {
  const warned = useRef(false);
  useEffect(() => { warned.current = false; }, [receivedAt]);
  return <div style={clockRow}><LiveClock label={leftLabel} baseMs={leftMs} active={leftActive} receivedAt={receivedAt} onTick={ms => { if (leftActive && ms != null && ms <= 10_000 && ms > 0 && !warned.current) { warned.current = true; onTenSeconds(); } }} /><LiveClock label={rightLabel} baseMs={rightMs} active={rightActive} receivedAt={receivedAt} /></div>;
}
function LiveClock({ label, baseMs, active, receivedAt, onTick }: { label: string; baseMs: number | null; active: boolean; receivedAt: number; onTick?: (ms: number | null) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!active || baseMs == null) { setNow(Date.now()); return; } const t = window.setInterval(() => setNow(Date.now()), 100); return () => window.clearInterval(t); }, [active, baseMs, receivedAt]);
  const ms = baseMs == null ? null : Math.max(0, baseMs - (active ? Math.max(0, now - receivedAt) : 0));
  useEffect(() => { onTick?.(ms); }, [ms, onTick]);
  return <div style={{ ...clock, ...(active ? clockActive : null) }}><span>{label}</span><b>{fmt(ms)}</b></div>;
}

function ChessBoard({ game, orientation, selected, legal, premove, onTap, lastMove, checkSquare }: { game: Chess; orientation: ChessColor; selected: string | null; legal: Set<string>; premove: ChessPremove | null; onTap: (square: string) => Promise<void>; lastMove: ChessGameState["lastMove"]; checkSquare: string | null }) {
  const cells = []; const files = orientation === "w" ? ["a","b","c","d","e","f","g","h"] : ["h","g","f","e","d","c","b","a"]; const ranks = orientation === "w" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  for (let ri=0; ri<8; ri++) for (let fi=0; fi<8; fi++) { const sq = `${files[fi]}${ranks[ri]}`; const p = game.get(sq as any); const dark = (ri+fi)%2===1; const isLast = lastMove && (lastMove.from===sq || lastMove.to===sq); const isPre = premove && (premove.from===sq || premove.to===sq); cells.push(<button key={sq} aria-label={sq} onClick={() => void onTap(sq)} style={{ ...square, background: dark?"#d9a2ad":"#f7e8e7", ...(isLast?lastSquare:null), ...(selected===sq?selectedSq:null), ...(legal.has(sq)?legalSq:null), ...(isPre?premoveSq:null), ...(checkSquare===sq?checkSq:null) }}>{p ? <span style={{ ...piece, color: p.color === "w" ? "#fff" : "#4a3940", textShadow: p.color === "w" ? "0 1px 2px #674d55" : "none" }}>{chessChar[p.color+p.type]}</span> : null}</button>); }
  return <div style={chessBoard}>{cells}</div>;
}

function XiangqiBoard({ state, orientation, selected, legal, premove, onTap }: { state: XiangqiRealtimeState; orientation: "red"|"black"; selected: string|null; legal: Set<string>; premove: XiangqiPremove|null; onTap: (col:number,row:number)=>Promise<void> }) {
  const rows = orientation === "red" ? [0,1,2,3,4,5,6,7,8,9] : [9,8,7,6,5,4,3,2,1,0]; const cols = orientation === "red" ? [0,1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1,0]; const cells=[];
  for (const row of rows) for (const col of cols) { const p=state.board.pieces.find(x=>x.row===row&&x.col===col); const pre=premove&&(premove.pieceId===p?.id||(premove.to.col===col&&premove.to.row===row)); cells.push(<button key={`${col}:${row}`} onClick={()=>void onTap(col,row)} style={{...xqCell,...(legal.has(`${col}:${row}`)?xqLegal:null),...(p?.id===selected?xqSelected:null),...(pre?premoveSq:null)}}>{p?<span style={{...xqPiece,color:p.color==="red"?"#b54655":"#4f4a4a"}}>{xqChar[p.color+p.type]}</span>:null}</button>); }
  return <div style={xqBoard}>{cells}</div>;
}

function PromotionModal({ open, onChoose, onClose }: { open: boolean; onChoose: (p: ChessPromotionPiece)=>void; onClose: ()=>void }) { return <WebModal open={open} onClose={onClose} title="Phong cấp"><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{(["q","r","b","n"] as ChessPromotionPiece[]).map(p=><button className="bloom-btn secondary" style={{fontSize:30,padding:16}} key={p} onClick={()=>onChoose(p)}>{chessChar[`w${p}`]}</button>)}</div></WebModal>; }
function GameFrame({ title, connected, status, error, children }: { title:string; connected:boolean; status:string; error?:string|null; children:React.ReactNode }) { return <WebCard><div style={gameHead}><div><div style={gameTitle}>{title}</div><div style={serverLine}><span style={{...dot,background:connected?"#5db184":"#d98a9e"}}/> {connected?"Render realtime đang nối":"Đang kết nối lại…"}</div></div></div>{error?<div style={errorBox}>{error}</div>:null}<div style={message}>{status}</div>{children}</WebCard>; }
function Result({ result, reason, mine }: { result:string|null; reason:string|null; mine?:string }) { const win=result&&mine&&result===mine; const draw=result==="draw"; return <div style={resultBox}><b>{draw?"Hòa":win?"Bạn thắng 🌸":"Ván đấu đã kết thúc"}</b><span>{reason||result||"Hoàn tất"}</span></div>; }

function onlineMembers(members:any[], presence:Presence[], myUid?:string){ const map=new Map(presence.map(x=>[x.uid,x.status])); return members.filter(m=>m.uid!==myUid&&["online_app","in_lobby"].includes(map.get(m.uid)||"")).map(m=>({...m,statusLabel:map.get(m.uid)})); }
function sameTc(a:any,b:any){ return a.kind===b.kind&&a.initialMs===b.initialMs&&a.incrementMs===b.incrementMs; }
function safeChess(fen:string){ try{return new Chess(fen)}catch{return null} }
function chessMoves(game:Chess|null, square:string|null){ if(!game||!square)return[] as any[]; try{return game.moves({square:square as any,verbose:true}) as any[]}catch{return[]} }
const fmt=(ms:number|null)=>ms==null?"∞":`${Math.max(0,Math.floor(ms/60000))}:${String(Math.max(0,Math.floor(ms/1000))%60).padStart(2,"0")}`;
const chessChar:Record<string,string>={wp:"♙",wn:"♘",wb:"♗",wr:"♖",wq:"♕",wk:"♔",bp:"♟",bn:"♞",bb:"♝",br:"♜",bq:"♛",bk:"♚"};
const xqChar:Record<string,string>={redgeneral:"帥",redadvisor:"仕",redelephant:"相",redhorse:"傌",redchariot:"俥",redcannon:"炮",redsoldier:"兵",blackgeneral:"將",blackadvisor:"士",blackelephant:"象",blackhorse:"馬",blackchariot:"車",blackcannon:"砲",blacksoldier:"卒"};

const wrap:React.CSSProperties={display:"flex",flexDirection:"column",gap:12};
const switcher:React.CSSProperties={display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,padding:5,background:"#f8e8ed",borderRadius:18};
const seg:React.CSSProperties={border:0,borderRadius:14,padding:"11px 12px",background:"transparent",color:"#927984",fontWeight:850,cursor:"pointer"};
const activeSeg:React.CSSProperties={background:"white",color:"#ad5873",boxShadow:"0 4px 14px rgba(122,73,91,.08)"};
const gameHead:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}; const gameTitle:React.CSSProperties={fontSize:18,fontWeight:900}; const serverLine:React.CSSProperties={fontSize:11,color:"#958089",marginTop:4}; const dot:React.CSSProperties={display:"inline-block",width:8,height:8,borderRadius:99};
const errorBox:React.CSSProperties={marginTop:10,padding:10,borderRadius:12,background:"#fff0f3",color:"#ad4967",fontSize:12}; const message:React.CSSProperties={fontSize:12,color:"#806970",margin:"10px 0"}; const actionRow:React.CSSProperties={display:"flex",gap:8,flexWrap:"wrap",marginTop:10}; const offerBox:React.CSSProperties={marginTop:10,padding:12,borderRadius:14,background:"#fff6e9",fontSize:12};
const lobbyGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"minmax(0,1.2fr) minmax(220px,.8fr)",gap:12}; const lobbyMain:React.CSSProperties={padding:12,borderRadius:18,background:"#fff7f9"}; const lobbySide:React.CSSProperties={padding:12,borderRadius:18,background:"#fffaf4"}; const kicker:React.CSSProperties={fontSize:10,fontWeight:900,letterSpacing:".13em",color:"#b86a80"}; const tcGrid:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:7,marginTop:10}; const tcButton:React.CSSProperties={border:"1px solid #efdce2",background:"white",color:"#7d656e",borderRadius:12,padding:"9px 8px",fontSize:11,fontWeight:800,cursor:"pointer"}; const tcActive:React.CSSProperties={background:"#e98aa6",borderColor:"#e98aa6",color:"white"}; const helper:React.CSSProperties={fontSize:10,color:"#9a858c",lineHeight:1.5,marginTop:8}; const emptyLobby:React.CSSProperties={padding:"22px 8px",fontSize:12,color:"#9a858c",lineHeight:1.5}; const memberRow:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:"1px solid #f1e5e9"}; const identity:React.CSSProperties={display:"flex",alignItems:"center",gap:8,minWidth:0}; const memberAvatar:React.CSSProperties={width:34,height:34,borderRadius:12,overflow:"hidden",display:"grid",placeItems:"center",color:"white",fontWeight:900,flex:"0 0 auto"}; const memberImg:React.CSSProperties={width:"100%",height:"100%",objectFit:"cover"}; const players:React.CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 2px 10px"};
const clockRow:React.CSSProperties={display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}; const clock:React.CSSProperties={padding:"10px 12px",borderRadius:12,background:"#f8f0f2",fontWeight:850,fontVariantNumeric:"tabular-nums",fontSize:12,display:"flex",justifyContent:"space-between"}; const clockActive:React.CSSProperties={background:"#e98aa6",color:"white"};
const resultBox:React.CSSProperties={marginTop:10,padding:13,borderRadius:14,background:"#fff0f4",display:"flex",justifyContent:"space-between",gap:12,fontSize:12};
const chessBoard:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(8,1fr)",width:"min(100%,540px)",aspectRatio:"1",margin:"0 auto",overflow:"hidden",borderRadius:18,border:"1px solid #e8cbd4"}; const square:React.CSSProperties={border:0,display:"grid",placeItems:"center",fontSize:"clamp(28px,7vw,48px)",padding:0,cursor:"pointer",position:"relative"}; const selectedSq:React.CSSProperties={boxShadow:"inset 0 0 0 4px rgba(207,86,124,.65)"}; const legalSq:React.CSSProperties={backgroundImage:"radial-gradient(circle,rgba(188,80,112,.5) 0 16%,transparent 18%)"}; const premoveSq:React.CSSProperties={boxShadow:"inset 0 0 0 4px rgba(92,126,196,.5)"}; const checkSq:React.CSSProperties={backgroundImage:"radial-gradient(circle,rgba(204,61,79,.52),transparent 70%)"}; const lastSquare:React.CSSProperties={filter:"brightness(.94) saturate(1.1)"}; const piece:React.CSSProperties={lineHeight:1,userSelect:"none"};
const xqBoard:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(9,1fr)",width:"min(100%,540px)",aspectRatio:"9/10",margin:"0 auto",borderRadius:18,overflow:"hidden",border:"1px solid #e2caa7",background:"#f4dfb7"}; const xqCell:React.CSSProperties={border:"1px solid rgba(131,91,49,.25)",background:"transparent",padding:0,display:"grid",placeItems:"center",cursor:"pointer"}; const xqPiece:React.CSSProperties={width:"82%",aspectRatio:"1",borderRadius:"50%",display:"grid",placeItems:"center",background:"#f7e7c5",border:"2px solid currentColor",fontSize:"clamp(17px,4.5vw,30px)",fontWeight:800,boxShadow:"0 2px 4px rgba(83,55,27,.15)",userSelect:"none"}; const xqLegal:React.CSSProperties={background:"rgba(225,126,153,.18)"}; const xqSelected:React.CSSProperties={boxShadow:"inset 0 0 0 3px #df809d"};
