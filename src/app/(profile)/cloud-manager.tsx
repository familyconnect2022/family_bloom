import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
/** Developer-only Cloudinary management. Does not switch quota accounts or mutate upload config. */
import {useRouter} from 'expo-router';
import {useEffect,useState} from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import {ScreenContainer} from '../../components/layout/ScreenContainer';
import {BloomHeroHeader} from '../../components/ui/BloomHeroHeader';
import {COLORS} from '../../constants/theme';
import {APP_CONFIG} from '../../constants/appPaths';
import {useAuth} from '../../context/AuthContext';
import {isVerifiedDeveloperAccount} from '../../constants/performanceTest';
import {listPublishedLessons} from '../../features/learning/publishedLessons';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';

export default function CloudManager(){
  const __a3Colors = useA3Theme().colors;
  const __a3_s = useA3LegacyStyles(s);

  
 const router=useRouter();const {user}=useAuth();const authorized=isVerifiedDeveloperAccount(user);
 const familyCloud=APP_CONFIG.CLOUDINARY.cloudName||'';
 const [contentCloud,setContentCloud]=useState(''),[loading,setLoading]=useState(false),[message,setMessage]=useState('');
 const check=async()=>{
  if(!authorized)return;setLoading(true);setMessage('');
  try{
   const {lessons}=await listPublishedLessons(undefined,10);
   const image=lessons.flatMap(x=>x.imageUrls).find(x=>/^https:\/\/res\.cloudinary\.com\//i.test(x));
   const name=image?.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\//i)?.[1];
   setContentCloud(name||'');setMessage(name?'Đã đọc được nguồn ảnh học liệu từ bài được duyệt.':'Đã truy vấn Firestore. Chưa có bài đã duyệt kèm ảnh Cloudinary để nhận diện kho học liệu.');
  }catch(e){setMessage('Không kiểm tra được kho học liệu: '+String((e as Error).message||e))}
  finally{setLoading(false)};
 };
 useEffect(()=>{if(authorized)void check()},[authorized]);
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
  <BloomHeroHeader variant="settings" compact roundedBottom eyebrow="QUẢN TRỊ NỘI BỘ" title="Bloom Cloud Manager" subtitle="Hai ứng dụng, hai kho media được phân tách" onBack={()=>router.back()}/>
  <ScrollView contentContainerStyle={__a3_s.body}>
   {!authorized?<View style={__a3_s.card}><Text style={__a3_s.alert}>Trang này chỉ dành cho tài khoản nhà phát triển đã xác minh.</Text></View>:<>
    <View style={__a3_s.card}><Text style={__a3_s.head}>🌸 Cloudinary A · Family Bloom</Text>
     <Text style={__a3_s.key}>Kho ảnh và video gia đình đang hoạt động</Text>
     <Text selectable style={__a3_s.value}>{familyCloud||'Chưa nhận được cloudName từ cấu hình APK'}</Text>
     <Text style={__a3_s.note}>Các ảnh cũ giữ nguyên URL và khóa ký. Không chuyển tự động khi đạt giới hạn.</Text>
    </View>
    <View style={__a3_s.card}><Text style={__a3_s.head}>📚 Cloudinary C · Content Studio</Text>
     <Text style={__a3_s.key}>Kho ảnh học liệu — Family Bloom chỉ đọc URL HTTPS</Text>
     <Text selectable style={__a3_s.value}>{contentCloud||'Chưa có ảnh xuất bản để nhận diện'}</Text>
     <Text style={__a3_s.note}>API Secret chỉ nằm ở Media Gateway của Studio. Family Bloom không cần biết khóa quản trị.</Text>
    </View>
    {loading?<ActivityIndicator color={__a3Colors.primary}/>:null}
    {!!message&&<Text style={__a3_s.note}>{message}</Text>}
    <Pressable style={__a3_s.button} onPress={()=>void check()} disabled={loading}><Text style={__a3_s.buttonText}>Kiểm tra nguồn đã kết nối</Text></Pressable>
    <Pressable style={[__a3_s.button,__a3_s.secondary]} onPress={()=>void Linking.openURL('https://console.cloudinary.com/')}><Text style={__a3_s.secondaryText}>Mở Cloudinary Console</Text></Pressable>
    <View style={__a3_s.card}><Text style={__a3_s.head}>🔐 Quy tắc sử dụng</Text>
     <Text style={__a3_s.note}>• Không đổi tài khoản chỉ để né giới hạn Free.
• Không lưu API Key/Secret trên điện thoại.
• Dung lượng/credits thực tế xem ở Cloudinary Console; ứng dụng không tự đoán.
• Cloudinary B chưa được kết nối.</Text>
    </View>
   </>}
  </ScrollView>
 </ScreenContainer>;
}
const s=createBloomStyles(() => StyleSheet.create({body:{padding:16,gap:13,paddingBottom:50},card:{padding:18,borderRadius:21,backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,gap:9},head:{fontSize:17,fontWeight:'900',color:COLORS.primary},key:{fontSize:13,color:COLORS.secondaryText},value:{fontSize:16,fontWeight:'800',color:COLORS.primaryText},note:{fontSize:12,color:COLORS.secondaryText,lineHeight:19},alert:{color:COLORS.primary,fontSize:14},button:{backgroundColor:COLORS.selectedBackground,borderRadius:16,alignItems:'center',padding:15},buttonText:{color:COLORS.white,fontWeight:'900'},secondary:{backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border},secondaryText:{color:COLORS.primary,fontWeight:'800'}}));
