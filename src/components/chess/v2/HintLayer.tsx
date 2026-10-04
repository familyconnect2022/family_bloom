import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, View } from "react-native";
import { indexToSquare } from "./moveMask";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";

export type ChessHintTarget = {
  index: number;
  capture: boolean;
};

export type ChessHintController = {
  show: (targets: ChessHintTarget[], premove: boolean) => void;
  clear: () => void;
};

type HintSnapshot = { targets: ChessHintTarget[]; premove: boolean } | null;

/**
 * V4J sparse + isolated hint renderer.
 *
 * This component owns its tiny hint state internally and is updated through an
 * imperative ref. Selecting/clearing hints therefore does NOT re-render
 * ChessBoard/PieceLayer while a move is starting. It renders only the current
 * legal destinations and contains zero Reanimated worklets.
 */
export const HintLayer = React.memo(forwardRef<ChessHintController, {
  squareSize: number;
  orientation: BoardOrientation;
}>(function HintLayer({ squareSize, orientation }, ref) {
  const [snapshot, setSnapshot] = useState<HintSnapshot>(null);

  useImperativeHandle(ref, () => ({
    show(targets, premove) {
      setSnapshot(targets.length ? { targets, premove } : null);
    },
    clear() {
      setSnapshot(null);
    },
  }), []);

  if (!snapshot?.targets.length) return null;

  const quietSize = Math.max(8, squareSize * 0.22);
  const quietInset = (squareSize - quietSize) / 2;
  const ringInset = squareSize * 0.08;
  const ringSize = squareSize - ringInset * 2;
  const ringWidth = Math.max(2, squareSize * 0.055);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {snapshot.targets.map((target) => {
        const square = indexToSquare(target.index);
        if (!square) return null;
        const position = squareToPosition(square, squareSize, orientation);
        return (
          <View
            key={`${target.index}:${target.capture ? "c" : "q"}`}
            pointerEvents="none"
            style={[
              styles.slot,
              {
                left: position.x,
                top: position.y,
                width: squareSize,
                height: squareSize,
              },
            ]}
          >
            {target.capture ? (
              <View
                style={[
                  styles.capture,
                  {
                    left: ringInset,
                    top: ringInset,
                    width: ringSize,
                    height: ringSize,
                    borderRadius: ringSize / 2,
                    borderWidth: ringWidth,
                    borderColor: snapshot.premove ? "rgba(111,96,188,.70)" : "rgba(128,68,93,.45)",
                  },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.quiet,
                  {
                    left: quietInset,
                    top: quietInset,
                    width: quietSize,
                    height: quietSize,
                    borderRadius: quietSize / 2,
                    backgroundColor: snapshot.premove ? "rgba(119,104,190,.54)" : "rgba(123,66,90,.42)",
                  },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}));

const styles = StyleSheet.create({
  slot: { position: "absolute" },
  quiet: { position: "absolute" },
  capture: { position: "absolute", backgroundColor: "transparent" },
});
