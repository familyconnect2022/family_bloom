import { useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";

/**
 * Mount the expensive native board only after the navigation transition has
 * settled. On blur we release it immediately instead of scheduling a large
 * teardown on the destination screen (which was the source of the post-game
 * hitch seen on Android).
 *
 * Runtime/listener suspension still belongs to the caller and should happen as
 * soon as focus is lost; this hook only owns the heavy visual surface.
 */
export function useDeferredGameSurface(focused: boolean, enterFallbackMs = 420) {
  const [mounted, setMounted] = useState(false);
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;

    if (!focused) {
      // Important: do not defer this teardown with InteractionManager. Doing so
      // moves the expensive image/native-node release onto the next screen and
      // makes the rest of Family Bloom feel laggy after leaving a game.
      setMounted(false);
      return undefined;
    }

    let committed = false;
    let frame: number | null = null;
    const commit = () => {
      if (committed || generationRef.current !== generation) return;
      committed = true;
      frame = requestAnimationFrame(() => {
        if (generationRef.current === generation) setMounted(true);
      });
    };

    // Navigation animations register as interactions on Android. Let the route
    // finish first, then mount the 32-piece board on the next frame. A bounded
    // fallback prevents an OEM/gesture edge case from leaving the board absent.
    const task = InteractionManager.runAfterInteractions(commit);
    const fallback = setTimeout(commit, enterFallbackMs);

    return () => {
      generationRef.current += 1;
      task.cancel?.();
      clearTimeout(fallback);
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, [enterFallbackMs, focused]);

  return mounted;
}
