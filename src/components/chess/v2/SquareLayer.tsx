import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BoardOrientation } from "./coordinateMapper";

const FILES = ["a","b","c","d","e","f","g","h"] as const;

/** Pure visual board background. Interaction is owned by InteractionLayer. */
export const SquareLayer = React.memo(function SquareLayer({
  squareSize,
  boardSize,
  orientation,
}: {
  squareSize: number;
  boardSize: number;
  orientation: BoardOrientation;
}) {
  const squares: React.ReactNode[] = [];
  for (let visualRow = 0; visualRow < 8; visualRow += 1) {
    for (let visualCol = 0; visualCol < 8; visualCol += 1) {
      const logicalCol = orientation === "white" ? visualCol : 7 - visualCol;
      const logicalRow = orientation === "white" ? visualRow : 7 - visualRow;
      const file = FILES[logicalCol];
      const rank = 8 - logicalRow;
      const square = `${file}${rank}`;
      const light = (logicalCol + rank) % 2 === 1;
      squares.push(
        <View key={square} style={[styles.square, { left: visualCol * squareSize, top: visualRow * squareSize, width: squareSize, height: squareSize }, light ? styles.light : styles.dark]}>
          {visualCol === 0 ? <Text style={[styles.rank, light ? styles.labelLight : styles.labelDark]}>{rank}</Text> : null}
          {visualRow === 7 ? <Text style={[styles.file, light ? styles.labelLight : styles.labelDark]}>{file}</Text> : null}
        </View>,
      );
    }
  }
  return <View pointerEvents="none" style={{ width: boardSize, height: boardSize }}>{squares}</View>;
});

const styles = StyleSheet.create({
  square: { position:"absolute" },
  light: { backgroundColor:"#FBEFF4" },
  dark: { backgroundColor:"#C98BA7" },
  rank: { position:"absolute", left:4, top:3, fontSize:9, fontWeight:"800" },
  file: { position:"absolute", right:4, bottom:2, fontSize:9, fontWeight:"800" },
  labelLight: { color:"#A65B79" },
  labelDark: { color:"#FFF6FA" },
});
