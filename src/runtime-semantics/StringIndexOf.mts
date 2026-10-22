import type { Integer } from '#self';

// https://tc39.es/proposal-string-replaceall/#sec-stringindexof
export function StringIndexOf(string: string, searchValue: string, fromIndex: Integer): Integer | 'not-found' {
  const length = BigInt(string.length);
  if (searchValue === '' && fromIndex <= length) {
    return fromIndex;
  }
  const searchLength = BigInt(searchValue.length);
  // 4. For each integer i such that fromIndex ≤ i ≤ length - searchLength, in ascending order, do
  for (let i = fromIndex; i <= length - searchLength; i += 1n) {
    const candidate = string.substring(Number(i), Number(i + searchLength));
    if (candidate === searchValue) {
      return i;
    }
  }
  return 'not-found';
}
