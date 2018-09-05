export function Assert(invariant, source) {
  if (!invariant) {
    throw new TypeError(`Assert failed${source ? `: ${source}` : ''}`.trim());
  }
}
