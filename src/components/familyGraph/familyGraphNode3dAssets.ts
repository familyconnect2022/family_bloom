/** Visual-only family tree decorations. Gender colors intentionally ignore app theme.
 * Both graph modes use the same 3D assets; never stretch their transparent PNGs.
 */
export const FAMILY_GRAPH_NODE_3D = {
  female: {
    top: require("../../../assets/images/family-tree/node-3d/female-top.png"),
    bottom: require("../../../assets/images/family-tree/node-3d/female-bottom.png"),
    bg: "#FFFDF9", edge: "#D9A27D", accent: "#B64D7D", text: "#523243",
  },
  male: {
    top: require("../../../assets/images/family-tree/node-3d/male-top.png"),
    bottom: require("../../../assets/images/family-tree/node-3d/male-bottom.png"),
    bg: "#F8FCF7", edge: "#327947", accent: "#27683B", text: "#274233",
  },
  unknown: {
    top: require("../../../assets/images/family-tree/node-3d/unknown-top.png"),
    bottom: require("../../../assets/images/family-tree/node-3d/unknown-bottom.png"),
    bg: "#FCF9FF", edge: "#9962B3", accent: "#8753A7", text: "#40324F",
  },
} as const;
export const familyGraphNodeGender = (gender?: string | null): keyof typeof FAMILY_GRAPH_NODE_3D =>
  gender === "male" ? "male" : gender === "female" ? "female" : "unknown";

/** Matches the main tree's R4 ornament geometry (px/UI units, not screen percent). */
export const FAMILY_GRAPH_ORNAMENT_WIDTH = 136;
export const FAMILY_GRAPH_ORNAMENT_TOP_HEIGHT = FAMILY_GRAPH_ORNAMENT_WIDTH * 143 / 480;
export const FAMILY_GRAPH_ORNAMENT_BOTTOM_HEIGHT = FAMILY_GRAPH_ORNAMENT_WIDTH * 156 / 480;
export const FAMILY_GRAPH_ORNAMENT_OUTSIDE_RATIO = 0.4;
