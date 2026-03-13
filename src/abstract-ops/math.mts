export function abs(x: number): number
export function abs(x: bigint): bigint
export function abs(x: bigint | number): bigint | number {
  if (x < 0) {
    return -x;
  }
  return x;
}
