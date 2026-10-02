import { useCallback } from "react";
import { useBloomToast } from "../components/ui/BloomToast";
import { parseAppError } from "../constants/errorConstants";

export interface BloomTaskToastCopy {
  title: string;
  message?: string;
}

export const useBloomTaskToast = () => {
  const { showToast } = useBloomToast();

  const startTask = useCallback((copy: BloomTaskToastCopy) => {
    showToast({
      type: "notification",
      title: copy.title,
      message: copy.message,
      autoHide: false,
      showProgressBar: false,
      position: "top",
      animationType: "fade",
      enableQueue: false,
      compact: true,
      loading: true,
    });
  }, [showToast]);

  const finishTask = useCallback((copy: BloomTaskToastCopy, duration = 2200) => {
    showToast({
      type: "success",
      title: copy.title,
      message: copy.message,
      duration,
      showProgressBar: false,
      position: "top",
      animationType: "fade",
      enableQueue: false,
      compact: true,
    });
  }, [showToast]);

  const failTask = useCallback((error: unknown, copy?: Partial<BloomTaskToastCopy>) => {
    const friendly = parseAppError(error);
    showToast({
      type: friendly.type,
      title: copy?.title || friendly.title,
      message: copy?.message || friendly.message,
      duration: 4200,
      showProgressBar: false,
      position: "top",
      animationType: "fade",
      enableQueue: false,
      compact: true,
    });
  }, [showToast]);

  return { startTask, finishTask, failTask };
};
