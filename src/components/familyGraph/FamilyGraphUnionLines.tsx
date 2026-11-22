/** GRAPH-LINE-01: native connectors shared by Main Tree and Focus.
 * Read-only scene geometry. Never persists invented parent/child links.
 */
import { memo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { FamilyGraphPrototypePerson } from "./familyGraphPrototypeData";
import type { FamilyGraphPartnerUnitGeometry } from "./familyGraphGeometry";
import {
  androidSiblingCorridor,
  androidSiblingGlyphVisible,
  androidSiblingJunctionX,
  androidUnionLineStyle,
} from "./familyGraphLineCorridor";

const CARD_WIDTH = 132;
const CARD_HEIGHT = 176;
const SLOT_WIDTH = 144;

type SegmentProps = { x1: number; y1: number; x2: number; y2: number; color: string; thickness: number; dashed?: boolean };
const Segment = memo(function Segment({ x1,y1,x2,y2,color,thickness,dashed=false }:SegmentProps) {
  const horizontal = Math.abs(y2-y1)<0.5;
  const length = Math.max(0, horizontal ? Math.abs(x2-x1) : Math.abs(y2-y1));
  if (length < 0.6) return null;
  const base = {
    position: "absolute" as const,
    left: horizontal ? Math.min(x1,x2) : x1-thickness/2,
    top: horizontal ? y1-thickness/2 : Math.min(y1,y2),
    backgroundColor: color,
    borderRadius: 3,
  };
  if (!dashed) return <View pointerEvents="none" style={[base, {width: horizontal ? length : thickness,height:horizontal ? thickness : length}]}/>;
  const dash=7,gap=5,count=Math.ceil(length/(dash+gap));
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {Array.from({length:count},(_,i)=>{
      const displacement=i*(dash+gap);
      const visible=Math.min(dash,length-displacement);
      return visible>0?<View key={i} style={{...base,
        left:base.left+(horizontal?displacement:0),top:base.top+(horizontal?0:displacement),
        width:horizontal?visible:thickness,height:horizontal?thickness:visible}}/>:null;
    })}
  </View>;
});

const Glyph = memo(function Glyph({x,y,kind}:{x:number;y:number;kind:"rings"|"heart"|"siblings"}){
  const size=kind==="siblings"?30:32;
  const backgroundColor=kind==="rings"?"#FFF2D9":kind==="heart"?"#FCE6ED":"#E6F1FE";
  return <View pointerEvents="none" style={{position:"absolute",left:x-size/2,top:y-size/2,
    width:size,height:size,borderRadius:size/2,backgroundColor,alignItems:"center",justifyContent:"center"}}>
    {kind==="rings"?
      <View style={{width:27,height:20}} pointerEvents="none">
        <View style={{position:"absolute",left:2,top:2,width:17,height:17,borderRadius:9,borderWidth:3,borderColor:"#C18C31"}}/>
        <View style={{position:"absolute",left:11,top:2,width:17,height:17,borderRadius:9,borderWidth:3,borderColor:"#DBAD5D"}}/>
      </View>
      :<Ionicons name={kind==="heart"?"heart":"people"} size={kind==="heart"?21:20}
          color={kind==="heart"?"#E53E60":"#15518E"}/>
    }
  </View>;
});

const center=(p:FamilyGraphPrototypePerson)=>p.x+SLOT_WIDTH/2;
export type FamilyGraphUnionLinesProps={
  partnerA:FamilyGraphPrototypePerson;
  partnerB:FamilyGraphPrototypePerson;
  children:FamilyGraphPrototypePerson[];
  unit:FamilyGraphPartnerUnitGeometry;
  active:boolean;
  color:string;
  thickness?:number;
};

export const FamilyGraphUnionLines=memo(function FamilyGraphUnionLines({
  partnerA,partnerB,children,unit,active,color,thickness=1.8,
}:FamilyGraphUnionLinesProps){
  const aX=center(partnerA),bX=center(partnerB);
  const left=Math.min(aX,bX)+CARD_WIDTH/2;
  const right=Math.max(aX,bX)-CARD_WIDTH/2;
  const unionX=(aX+bX)/2;
  const unionY=(partnerA.y+partnerB.y)/2+CARD_HEIGHT/2;
  const kind=androidUnionLineStyle(unit.partnerStatus);
  const dashed=kind==="dashed";
  const childCenters=children.map(center);
  const maxBottom=Math.max(partnerA.y,partnerB.y)+CARD_HEIGHT;
  const childTop=Math.min(...children.map((child)=>child.y));
  const corridor=children.length ? androidSiblingCorridor(maxBottom,childTop) : null;
  // The scene builder guarantees at least the Android minimum row step. If a
  // malformed row does not have enough room, do not put the sibling icon in a card.
  const safeJunction=corridor && corridor.requiredExtra===0 ? corridor.y : null;
  const junctionX=androidSiblingJunctionX(unionX,childCenters);
  const turnY=safeJunction === null ? maxBottom+28 : safeJunction;
  const trunkTop=unionY+16;
  const doglegY=maxBottom+23;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {right>left?<Segment x1={left} x2={right} y1={unionY} y2={unionY} color={color} thickness={thickness}/>:null}
    {active && kind!=="unknown"?<Glyph x={unionX} y={unionY} kind={kind==="solid"?"rings":"heart"}/>:null}
    {children.length>0? <>
      <Segment x1={unionX} y1={trunkTop} x2={unionX} y2={Math.abs(junctionX-unionX)>1?doglegY:turnY}
        color={color} thickness={thickness} dashed={dashed}/>
      {Math.abs(junctionX-unionX)>1?<>
        <Segment x1={unionX} y1={doglegY} x2={junctionX} y2={doglegY} color={color} thickness={thickness} dashed={dashed}/>
        <Segment x1={junctionX} y1={doglegY} x2={junctionX} y2={turnY} color={color} thickness={thickness} dashed={dashed}/>
      </>:null}
      {children.length>1? <Segment x1={Math.min(...childCenters)} x2={Math.max(...childCenters)}
        y1={turnY} y2={turnY} color={color} thickness={thickness} dashed={dashed}/>:null}
      {children.map(child=><Segment key={child.id} x1={center(child)} y1={turnY} x2={center(child)} y2={child.y}
        color={color} thickness={thickness} dashed={dashed}/>)}
      {safeJunction!==null && active && androidSiblingGlyphVisible(children.length)?
        <Glyph x={junctionX} y={safeJunction} kind="siblings"/>:null}
    </>:null}
  </View>;
});

/** Visual annotation only. This is not a persisted child subtype. */
export const FamilyGraphPrivateChildLabel=memo(function FamilyGraphPrivateChildLabel({
  child,parent,
}:{child:FamilyGraphPrototypePerson;parent:FamilyGraphPrototypePerson}){
  const given=parent.displayName.trim().split(/\s+/u).slice(-2).join(" ");
  const label=`Con riêng của ${given}`;
  return <View pointerEvents="none" style={{position:"absolute",left:child.x+SLOT_WIDTH/2+7,
    top:child.y-27,paddingHorizontal:7,paddingVertical:3,borderRadius:10,
    backgroundColor:"#EAF0FA",maxWidth:158,zIndex:5}}>
    <Text allowFontScaling={false} numberOfLines={1} style={{fontSize:10,color:"#38577F",fontWeight:"600"}}>{label}</Text>
  </View>;
});
