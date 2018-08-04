export function Assert(invariant /* : boolean */) {
  if (!invariant) {
    throw new TypeError('Assert failed');
  }
}
