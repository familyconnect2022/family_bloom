import type { ReactNode } from "react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  type KeyboardEvent,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

type BloomKeyboardScreenProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewStyle?: StyleProp<ViewStyle>;
  rootStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  keyboardVerticalOffset?: number;
};

type KeyboardFocusContextValue = {
  revealInput: (input: TextInput | null, extraGap?: number) => void;
};

const KeyboardFocusContext = createContext<KeyboardFocusContextValue>({
  revealInput: () => undefined,
});

/** Ask the nearest BloomKeyboardScreen to keep a focused input visible. */
export const useBloomKeyboardFocus = () => useContext(KeyboardFocusContext);

/**
 * Keyboard-safe form surface used across the app.
 *
 * Important Android behavior:
 * - keep `softwareKeyboardLayoutMode: resize` as the native first line of defence;
 * - never translate the whole screen by keyboard height;
 * - measure only the focused input and scroll just enough to reveal it;
 * - keep a hidden scroll reserve while the keyboard is open so this still works
 *   on devices/transparent modals where Android does not resize the window well.
 */
export function BloomKeyboardScreen({
  children,
  contentContainerStyle,
  scrollViewStyle,
  rootStyle,
  showsVerticalScrollIndicator = false,
  keyboardVerticalOffset = 0,
}: BloomKeyboardScreenProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const focusedRef = useRef<{ input: TextInput | null; gap: number }>({ input: null, gap: 22 });
  const [viewportHeight, setViewportHeight] = useState(0);
  const [keyboardReserve, setKeyboardReserve] = useState(0);

  const revealMeasuredInput = useCallback((input: TextInput | null, extraGap = 22) => {
    if (!input || keyboardTopRef.current == null) return;

    // Wait a frame so Android can finish any adjustResize layout pass first.
    requestAnimationFrame(() => {
      input.measureInWindow((_x, y, _width, height) => {
        const keyboardTop = keyboardTopRef.current;
        if (keyboardTop == null) return;

        const safeBottom = keyboardTop - extraGap;
        const inputBottom = y + height;
        const overlap = inputBottom - safeBottom;
        if (overlap > 0) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + overlap + 8),
            animated: true,
          });
        }
      });
    });
  }, []);

  const revealInput = useCallback((input: TextInput | null, extraGap = 22) => {
    focusedRef.current = { input, gap: extraGap };
    if (keyboardTopRef.current != null) {
      setTimeout(() => revealMeasuredInput(input, extraGap), Platform.OS === "android" ? 45 : 20);
    }
  }, [revealMeasuredInput]);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const frame = event.endCoordinates;
      const screenHeight = Dimensions.get("screen").height;
      // A few Android keyboards report screenY=0 while resizing. Height is a stable fallback.
      keyboardTopRef.current = frame.screenY > 0
        ? frame.screenY
        : Math.max(0, screenHeight - frame.height);

      // Reserve scroll room without moving the whole layout. This matters most in
      // transparent modals and OEM keyboards that overlay instead of resizing.
      setKeyboardReserve(Platform.OS === "android" ? Math.min(Math.max(frame.height, 0), 380) : 0);

      const { input, gap } = focusedRef.current;
      setTimeout(() => revealMeasuredInput(input, gap), Platform.OS === "android" ? 75 : 25);
    };

    const onHide = () => {
      keyboardTopRef.current = null;
      setKeyboardReserve(0);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subscriptions = [
      Keyboard.addListener(showEvent, onShow),
      Keyboard.addListener(hideEvent, onHide),
    ];

    if (Platform.OS === "ios") {
      subscriptions.push(Keyboard.addListener("keyboardWillChangeFrame", onShow));
    }

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [revealMeasuredInput]);

  return (
    <KeyboardFocusContext.Provider value={{ revealInput }}>
      <KeyboardAvoidingView
        style={[styles.root, rootStyle]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          ref={scrollRef}
          style={scrollViewStyle}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          scrollEventThrottle={16}
          onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
        >
          <View
            style={[
              styles.body,
              viewportHeight > 0 && { minHeight: viewportHeight },
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
          {keyboardReserve > 0 && (
            <View pointerEvents="none" style={{ height: keyboardReserve }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardFocusContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { flexGrow: 1, paddingBottom: 28 },
});
