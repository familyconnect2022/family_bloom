import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { BloomConfirmDialog } from "./BloomConfirmDialog";

type BloomDialogIcon = keyof typeof Ionicons.glyphMap;

type BaseDialogOptions = {
  eyebrow?: string;
  title: string;
  message: string;
  icon?: BloomDialogIcon;
};

type ConfirmDialogOptions = BaseDialogOptions & {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type InfoDialogOptions = BaseDialogOptions & {
  dismissLabel?: string;
};

type DialogRequest =
  | ({ kind: "confirm" } & ConfirmDialogOptions & { resolve: (value: boolean) => void })
  | ({ kind: "info" } & InfoDialogOptions & { resolve: () => void });

type BloomDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  inform: (options: InfoDialogOptions) => Promise<void>;
};

const BloomDialogContext = createContext<BloomDialogContextValue | null>(null);

export function useBloomDialog() {
  const value = useContext(BloomDialogContext);
  if (!value) throw new Error("useBloomDialog phải được bọc trong BloomDialogProvider");
  return value;
}

/**
 * Bloom Supper dialog layer.
 *
 * Product confirmations/info should use this instead of React Native Alert.alert
 * so the visual language stays consistent on Android/iOS. OS permission prompts
 * remain native by design; the explanatory step around them is Bloom-styled.
 */
export function BloomDialogProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<DialogRequest | null>(null);
  const queueRef = useRef<DialogRequest[]>([]);

  const presentNext = useCallback(() => {
    setCurrent((active) => {
      if (active) return active;
      return queueRef.current.shift() ?? null;
    });
  }, []);

  const enqueue = useCallback((request: DialogRequest) => {
    setCurrent((active) => {
      if (!active) return request;
      queueRef.current.push(request);
      return active;
    });
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => new Promise<boolean>((resolve) => {
    enqueue({ kind: "confirm", ...options, resolve });
  }), [enqueue]);

  const inform = useCallback((options: InfoDialogOptions) => new Promise<void>((resolve) => {
    enqueue({ kind: "info", ...options, resolve });
  }), [enqueue]);

  const closeAndContinue = useCallback((result: boolean) => {
    const active = current;
    if (!active) return;
    if (active.kind === "confirm") active.resolve(result);
    else active.resolve();
    setCurrent(null);
    requestAnimationFrame(presentNext);
  }, [current, presentNext]);

  const value = useMemo(() => ({ confirm, inform }), [confirm, inform]);

  return (
    <BloomDialogContext.Provider value={value}>
      {children}
      <BloomConfirmDialog
        visible={!!current}
        eyebrow={current?.eyebrow ?? "FAMILY BLOOM"}
        title={current?.title ?? "Bloom nhắn bạn một điều"}
        message={current?.message ?? ""}
        icon={current?.icon ?? (current?.kind === "confirm" ? "flower-outline" : "information-circle-outline")}
        cancelLabel={current?.kind === "confirm" ? (current.cancelLabel ?? "Giữ lại") : (current?.dismissLabel ?? "Đã hiểu")}
        confirmLabel={current?.kind === "confirm" ? (current.confirmLabel ?? "Xác nhận") : undefined}
        destructive={current?.kind === "confirm" ? !!current.destructive : false}
        onCancel={() => closeAndContinue(false)}
        onConfirm={current?.kind === "confirm" ? () => closeAndContinue(true) : undefined}
      />
    </BloomDialogContext.Provider>
  );
}
