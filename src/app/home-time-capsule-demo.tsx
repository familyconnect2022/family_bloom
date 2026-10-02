import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { TimeCapsuleRevealPrototype } from "../features/home/timeCapsule/TimeCapsuleRevealPrototype";

export default function HomeTimeCapsuleDemoScreen() {
  const router = useRouter();
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" style="light" />
      <TimeCapsuleRevealPrototype onBack={() => router.back()} />
    </>
  );
}
