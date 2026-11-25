import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {File} from 'expo-file-system';
const MAX=2*1024*1024;
// The bridge sends one bounded image at a time, never an Android content/file URI.
export async function chooseEditorImages(send:(index:number,total:number,mime:string,data:string,error:string)=>void,active:()=>boolean){
 const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:20,quality:1});
 if(!active())return;
 if(result.canceled){send(0,0,'','','CANCELLED');return;}
 const assets=result.assets.slice(0,20);if(!assets.length){send(0,0,'','','');return;}
 for(let i=0;i<assets.length;i++){
  if(!active())return;const asset=assets[i];let file=new File(asset.uri),mime=asset.mimeType||'',temp:File|null=null;
  try{
   if(!asset.width||!asset.height||asset.width*asset.height>60_000_000||file.size>20*1024*1024)throw Error('IMAGE_LIMIT');
   if(!/^image\/(jpeg|png|webp|gif)$/.test(mime)||file.size>MAX){if(mime==='image/gif')throw Error('GIF_LIMIT');const format=mime==='image/png'?ImageManipulator.SaveFormat.PNG:ImageManipulator.SaveFormat.JPEG;const scale=Math.min(1,1920/Math.max(asset.width,asset.height));const out=await ImageManipulator.manipulateAsync(asset.uri,scale<1?[{resize:{width:Math.max(1,Math.round(asset.width*scale)),height:Math.max(1,Math.round(asset.height*scale))}}]:[],{format,compress:.82});temp=new File(out.uri);file=temp;mime=format===ImageManipulator.SaveFormat.PNG?'image/png':'image/jpeg';}
   if(!file.size||file.size>MAX)throw Error('IMAGE_LIMIT');const data=await file.base64();if(!data||data.length>2796204)throw Error('IMAGE_LIMIT');if(!active())return;send(i,assets.length,mime,data,'');
  }finally{if(temp&&temp.uri!==asset.uri){try{temp.delete();}catch{/* cache cleanup only */}}}
 }
}
