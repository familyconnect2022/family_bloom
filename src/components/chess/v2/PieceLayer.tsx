import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { ChessPiece, type ChessPieceController } from "./ChessPiece";
import { squareToPosition, type BoardOrientation } from "./coordinateMapper";
import type { PieceDescriptor } from "./pieceIdentity";

type Props = {
  pieces: PieceDescriptor[];
  squareSize: number;
  orientation: BoardOrientation;
  myColor: "w"|"b";
  boardLocked: SharedValue<number>;
  motionFxEnabled: boolean;
  register: (id:string,controller:ChessPieceController|null)=>void;
  onDragStart: (id:string)=>void;
  onDragCancel: (id:string)=>void;
  onDrop: (id:string,centerX:number,centerY:number)=>void;
  onAssetReady?: (id: string) => void;
};

export const PieceLayer = React.memo(function PieceLayer({ pieces, squareSize, orientation, myColor, boardLocked, motionFxEnabled, register, onDragStart, onDragCancel, onDrop, onAssetReady }: Props) {
  // Entry performance: do not ask Android to create/decode all 32 native image
  // nodes in the same commit as the board shell. The preparing shield remains
  // above the board, so we can spread native creation across a few frames and
  // still only dismiss Ready after every controller/image has reported ready.
  const [renderCount, setRenderCount] = useState(() => Math.min(8, pieces.length));

  useEffect(() => {
    let frame1: number | null = null;
    let frame2: number | null = null;
    let frame3: number | null = null;
    setRenderCount(Math.min(8, pieces.length));
    frame1 = requestAnimationFrame(() => {
      setRenderCount(Math.min(18, pieces.length));
      frame2 = requestAnimationFrame(() => {
        setRenderCount(Math.min(26, pieces.length));
        frame3 = requestAnimationFrame(() => setRenderCount(pieces.length));
      });
    });
    return () => {
      if (frame1 != null) cancelAnimationFrame(frame1);
      if (frame2 != null) cancelAnimationFrame(frame2);
      if (frame3 != null) cancelAnimationFrame(frame3);
    };
  }, [pieces.length]);

  return (
    <View pointerEvents="box-none" collapsable={false} style={styles.layer}>
      {pieces.slice(0, renderCount).map((piece) => {
        const p = squareToPosition(piece.square, squareSize, orientation);
        return (
          <ChessPiece
            key={piece.id}
            ref={(controller) => register(piece.id, controller)}
            id={piece.id}
            initialPieceKey={piece.pieceKey}
            initialX={p.x}
            initialY={p.y}
            squareSize={squareSize}
            owned={piece.pieceKey[0] === myColor}
            boardLocked={boardLocked}
            motionFxEnabled={motionFxEnabled}
            onDragStart={onDragStart}
            onDragCancel={onDragCancel}
            onDrop={onDrop}
            onAssetReady={onAssetReady}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 30 },
});
