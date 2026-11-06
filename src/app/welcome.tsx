import React from "react";
import { Redirect } from "expo-router";

/** Legacy deep links must enter the public, data-free anchor. The verified
 * Welcome presentation now lives as a guarded sibling of the Root Stack.
 * It must NOT mount a separate native screen after Google sign-in. */
export default function DeprecatedWelcomeRoute() {
  return <Redirect href="/session-gate" />;
}
