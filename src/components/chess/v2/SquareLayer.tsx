import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BoardOrientation } from "./coordinateMapper";

const FILES = ["a","b","c","d","e","f","g","h"] as const;

export const SquareLayer = React.memo(function SquareLayer({
  squareSize,
  boardSize,
  orientation,
  onPressSquare,
}: {
  squareSize: number;
  boardSize: number;
  orientation: BoardOrientation;
  onPressSquare: (square: string) => void;
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
  return (
    <View style={{ width: boardSize, height: boardSize }}>
      {squares}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {squares.map((node, index) => {
          const visualRow = Math.floor(index / 8);
          const visualCol = index % 8;
          const logicalCol = orientation === "white" ? visualCol : 7 - visualCol;
          const logicalRow = orientation === "white" ? visualRow : 7 - visualRow;
          const square = `${FILES[logicalCol]}${8 - logicalRow}`;
          return <Pressable key={`hit-${square}`} onPress={() => onPressSquare(square)} style={{ position:"absolute", left:visualCol*squareSize, top:visualRow*squareSize, width:squareSize, height:squareSize }} />;
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  square: { position:"absolute" },
  light: { backgroundColor:"#F4E5D5" },
  dark: { backgroundColor:"#B77A68" },
  rank: { position:"absolute", left:4, top:3, fontSize:9, fontWeight:"800" },
  file: { position:"absolute", right:4, bottom:2, fontSize:9, fontWeight:"800" },
  labelLight: { color:"#9A6256" },
  labelDark: { color:"#F8E9DE" },
});
