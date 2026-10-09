import { WebRootGate } from "../web/components/WebRootGate";
import { WebAuthProvider } from "../web/context/WebAuthContext";
import { WebFamilyProvider } from "../web/context/WebFamilyContext";
import { WebGlobalStyles } from "../web/styles/WebGlobalStyles";
import { WebGameSocketProvider } from "../web/games/WebGameSocketContext";
import { WebRuntimeBoundary } from "../web/components/WebRuntimeBoundary";

export default function WebRootLayout() {
  return <><WebGlobalStyles/><WebRuntimeBoundary><WebAuthProvider><WebFamilyProvider><WebGameSocketProvider><WebRootGate /></WebGameSocketProvider></WebFamilyProvider></WebAuthProvider></WebRuntimeBoundary></>;
}
