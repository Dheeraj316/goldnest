'use client';

import { useState } from 'react';

// Runs `close()` the moment `trigger` flips to true (e.g. a Server Action's
// `state.success`), without an effect. This is React's own documented
// pattern for adjusting state in response to a value changing during
// render ("You Might Not Need an Effect" — adjusting state when a prop
// changes) — calling setState directly in an effect body causes an extra
// commit/render pass that the effect-based version of this hook used to
// trigger, which is exactly what eslint-plugin-react-hooks now flags.
export function useAutoClose(trigger: boolean | undefined, close: () => void) {
  const [prev, setPrev] = useState(trigger);
  if (trigger !== prev) {
    setPrev(trigger);
    if (trigger) close();
  }
}
