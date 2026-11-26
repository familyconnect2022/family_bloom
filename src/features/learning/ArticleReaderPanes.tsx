import React,{useEffect} from 'react';
import {BackHandler,View,StyleSheet} from 'react-native';
export function ArticleReaderPanes({list,reader,background,onBack}:{list:React.ReactNode;reader:React.ReactNode|null;background:string;onBack:()=>void}){const reading=reader!==null;
 useEffect(()=>{if(!reading)return;const sub=BackHandler.addEventListener('hardwareBackPress',()=>{onBack();return true;});return()=>sub.remove();},[reading,onBack]);
 return <View style={{flex:1,minHeight:0}}><View pointerEvents={reading?'none':'auto'} importantForAccessibility={reading?'no-hide-descendants':'auto'} accessibilityElementsHidden={reading} style={{flex:1,minHeight:0,opacity:reading?0:1}}>{list}</View>{reading&&<View style={[StyleSheet.absoluteFillObject,{backgroundColor:background}]}>{reader}</View>}</View>;
}
