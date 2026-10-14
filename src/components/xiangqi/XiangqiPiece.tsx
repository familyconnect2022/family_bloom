import React, { useCallback, useRef } from "react";
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

export type XiangqiColor = "red" | "black";
export type XiangqiPieceType = "general" | "advisor" | "elephant" | "chariot" | "horse" | "cannon" | "soldier";
export type XiangqiPieceState = "normal" | "selected" | "hint" | "drag" | "disabled";

const PIECE_IMAGES: Record<XiangqiColor, Record<XiangqiPieceType, ImageSourcePropType>> = {
  red: {
    general: require("../../../assets/xiangqi/red_general.webp"),
    advisor: require("../../../assets/xiangqi/red_advisor.webp"),
    elephant: require("../../../assets/xiangqi/red_elephant.webp"),
    chariot: require("../../../assets/xiangqi/red_chariot.webp"),
    horse: require("../../../assets/xiangqi/red_horse.webp"),
    cannon: require("../../../assets/xiangqi/red_cannon.webp"),
    soldier: require("../../../assets/xiangqi/red_soldier.webp"),
  },
  black: {
    general: require("../../../assets/xiangqi/black_general.webp"),
    advisor: require("../../../assets/xiangqi/black_advisor.webp"),
    elephant: require("../../../assets/xiangqi/black_elephant.webp"),
    chariot: require("../../../assets/xiangqi/black_chariot.webp"),
    horse: require("../../../assets/xiangqi/black_horse.webp"),
    cannon: require("../../../assets/xiangqi/black_cannon.webp"),
    soldier: require("../../../assets/xiangqi/black_soldier.webp"),
  },
};

type Props = {
  color: XiangqiColor;
  type: XiangqiPieceType;
  size: number;
  state?: XiangqiPieceState;
  style?: StyleProp<ViewStyle>;
  onAssetReady?: () => void;
};

export const XiangqiPiece = React.memo(function XiangqiPiece({ color, type, size, state = "normal", style, onAssetReady }: Props) {
  const haloSize = size * 1.12;
  const isSelected = state === "selected";
  const isHint = state === "hint";
  const isDrag = state === "drag";
  const isDisabled = state === "disabled";
  const assetReadyRef = useRef(false);
  const handleAssetReady = useCallback(() => {
    if (assetReadyRef.current) return;
    assetReadyRef.current = true;
    onAssetReady?.();
  }, [onAssetReady]);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        { width: size, height: size },
        isDrag && styles.drag,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {(isSelected || isHint) && (
        <View
          style={[
            styles.halo,
            {
              width: haloSize,
              height: haloSize,
              borderRadius: haloSize / 2,
              left: (size - haloSize) / 2,
              top: (size - haloSize) / 2,
            },
            isSelected ? styles.selectedHalo : styles.hintHalo,
          ]}
        />
      )}
      <Image
        source={PIECE_IMAGES[color][type]}
        contentFit="contain"
        transition={0}
        cachePolicy="memory"
        style={{ width: size, height: size }}
        onLoadEnd={handleAssetReady}
      />
    </View>
  );
});

export const XIANGQI_PIECE_IMAGES = PIECE_IMAGES;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  halo: {
    position: "absolute",
    borderWidth: 2,
  },
  selectedHalo: {
    backgroundColor: "rgba(232, 79, 143, 0.16)",
    borderColor: "rgba(232, 79, 143, 0.8)",
    shadowColor: "#E84F8F",
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  hintHalo: {
    backgroundColor: "rgba(244, 192, 77, 0.20)",
    borderColor: "rgba(220, 160, 35, 0.82)",
    shadowColor: "#DCA023",
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  drag: {
    transform: [{ scale: 1.12 }],
    shadowColor: "#5C3428",
    shadowOpacity: 0.34,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
  },
  disabled: {
    opacity: 0.38,
  },
});
