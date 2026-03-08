export function abs(x: number): number
export function abs(x: bigint): bigint
export function abs(x: bigint | number): bigint | number {
  if (x < 0) {
    return -x;
  }
  return x;
}

export function clamp(lower: bigint, x: bigint, upper: bigint): bigint
export function clamp(lower: number, x: number, upper: number): number
export function clamp(lower: number | bigint, x: number | bigint, upper: number | bigint): number | bigint {
  if (x < lower) return lower;
  if (x > upper) return upper;
  return x;
}

/** https://tc39.es/ecma262/#eqn-modulo */
export function modulo(x: bigint, y: bigint): bigint
export function modulo(x: number, y: number): number
export function modulo(x: number | bigint, y: number | bigint): number | bigint {
  return (((x as bigint) % (y as bigint)) + (y as bigint)) % (y as bigint);
}

export function remainder(x: number, y: number): number {
  return Math.sign(x) * Math.abs(modulo(x, y));
}
