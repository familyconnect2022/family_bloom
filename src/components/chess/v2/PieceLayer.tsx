import React from "react";
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
  onTapPiece: (id:string)=>void;
  onDragStart: (id:string)=>void;
  onDragCancel: (id:string)=>void;
  onDrop: (id:string,centerX:number,centerY:number)=>void;
};

export const PieceLayer = React.memo(function PieceLayer({ pieces, squareSize, orientation, myColor, boardLocked, motionFxEnabled, register, onTapPiece, onDragStart, onDragCancel, onDrop }: Props) {
  return (
    <View pointerEvents="box-none" collapsable={false} style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => {
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
            onTapPiece={onTapPiece}
            onDragStart={onDragStart}
            onDragCancel={onDragCancel}
            onDrop={onDrop}
          />
        );
      })}
    </View>
  );
});
