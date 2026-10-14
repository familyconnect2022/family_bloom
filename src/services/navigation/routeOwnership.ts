/**
 * Phase P2 — navigation ownership contract.
 * Navigation answers "what is the user looking at?"; stores own durable data.
 */
export type RouteOwnershipKind = "persistent_surface" | "transient_route" | "global_overlay";

export type RouteOwnershipContract = {
  id: string;
  kind: RouteOwnershipKind;
  ownsData: boolean;
  ownsListener: "none" | "scoped" | "model";
  ownsEngine: boolean;
  ownsVisualState: boolean;
};

const CONTRACTS: RouteOwnershipContract[] = [
  { id: "tabs.home", kind: "persistent_surface", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "tabs.moments", kind: "persistent_surface", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "tabs.planner", kind: "persistent_surface", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "tabs.family", kind: "persistent_surface", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "tabs.play", kind: "persistent_surface", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "game.chess", kind: "persistent_surface", ownsData: false, ownsListener: "model", ownsEngine: true, ownsVisualState: true },
  { id: "game.xiangqi", kind: "persistent_surface", ownsData: false, ownsListener: "model", ownsEngine: true, ownsVisualState: true },
  { id: "detail.moment", kind: "transient_route", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "detail.event", kind: "transient_route", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "detail.member", kind: "transient_route", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "family.graph", kind: "transient_route", ownsData: false, ownsListener: "scoped", ownsEngine: true, ownsVisualState: true },
  { id: "settings", kind: "transient_route", ownsData: false, ownsListener: "scoped", ownsEngine: false, ownsVisualState: true },
  { id: "overlay.toast", kind: "global_overlay", ownsData: false, ownsListener: "none", ownsEngine: false, ownsVisualState: true },
  { id: "overlay.challenge", kind: "global_overlay", ownsData: false, ownsListener: "model", ownsEngine: false, ownsVisualState: true },
  { id: "overlay.game_result", kind: "global_overlay", ownsData: false, ownsListener: "model", ownsEngine: false, ownsVisualState: true },
  { id: "overlay.sheet", kind: "global_overlay", ownsData: false, ownsListener: "none", ownsEngine: false, ownsVisualState: true },
  { id: "overlay.modal", kind: "global_overlay", ownsData: false, ownsListener: "none", ownsEngine: false, ownsVisualState: true },
];

export const routeOwnershipContracts = Object.freeze(CONTRACTS);

export const getRouteOwnership = (id: string) => CONTRACTS.find((item) => item.id === id) ?? null;

export const assertRouteDoesNotOwnFeatureData = (id: string) => {
  const contract = getRouteOwnership(id);
  return !contract || contract.ownsData === false;
};
