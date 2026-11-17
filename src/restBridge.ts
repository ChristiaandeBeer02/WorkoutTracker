let starter: () => void = () => {};

/** RestBar registers the same action as its Start button. */
export function setRestStarter(fn: () => void): () => void {
  starter = fn;
  return () => {
    if (starter === fn) starter = () => {};
  };
}

/** Start a rest only when one is not already counting down. */
export function startRestIfIdle(): void {
  starter();
}
