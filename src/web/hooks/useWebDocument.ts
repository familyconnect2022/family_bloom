import { doc,onSnapshot } from "firebase/firestore";
import { useEffect,useState } from "react";
import { webDb } from "../firebaseWeb";
export function useWebDocument<T extends object>(path:string|null){const [data,setData]=useState<T|null>(null);const [loading,setLoading]=useState(!!path);const [error,setError]=useState<string|null>(null);useEffect(()=>{setData(null);setLoading(!!path);setError(null);if(!path)return;return onSnapshot(doc(webDb,path),snap=>{setData(snap.exists()?({id:snap.id,...snap.data()} as T):null);setLoading(false)},err=>{setError(err.message);setLoading(false)})},[path]);return{data,loading,error}}
