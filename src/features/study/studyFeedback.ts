/** Friendly Super Bloom Study feedback. Do not expose provider errors in the UI. */
import type {ToastConfig} from '../../components/ui/BloomToast';

export type StudyToast = (config:ToastConfig)=>void;

export const studyErrorMessage = (error:unknown, action='lưu nội dung'):{title:string;message:string} => {
 const e=error as {code?:string;message?:string}|null;
 const raw=String(e?.code||'')+' '+String(e?.message||error||'');
 if(/permission-denied|insufficient.permissions|does not have permission/i.test(raw))return {
  title:'Bloom chưa thể lưu bài 🌸',
  message:'Firebase chưa cho phép thao tác này. Hãy kiểm tra Rules Hỏi đáp đã triển khai và tài khoản còn là thành viên của nhà nhé.',
 };
 if(/unavailable|network|timeout|offline|deadline-exceeded/i.test(raw))return {
  title:'Kết nối chưa ổn định',
  message:'Bạn kiểm tra Internet rồi thử lại nhé. Nội dung đang soạn vẫn được giữ lại.',
 };
 if(/unauthenticated/i.test(raw))return {
  title:'Cần đăng nhập lại',message:'Hãy đăng nhập Family Bloom rồi thử lại nhé.',
 };
 if(/resource-exhausted/i.test(raw))return {
  title:'Bloom đang bận một chút',message:'Bạn thử lại sau nhé. Nội dung vẫn được giữ lại.',
 };
 // Validation messages authored locally are safe to display; hide arbitrary server/provider errors.
 if(error instanceof Error && !/\[|firestore|firebase|https?:|\/|stack|Error:/i.test(error.message))return {
  title:`Chưa thể ${action}`,message:error.message.slice(0,160),
 };
 return {title:`Chưa thể ${action}`,message:'Bloom chưa hoàn tất thao tác. Bạn thử lại nhé.'};
};
export const showStudyError=(showToast:StudyToast,error:unknown,action?:string)=>{
 const content=studyErrorMessage(error,action);
 showToast({...content,type:'error',duration:4300,dedupeKey:'study:'+content.title});
};
