export function Assert(invariant) {
  if (!invariant) {
    throw new TypeError('Assert failed');
  }
}
