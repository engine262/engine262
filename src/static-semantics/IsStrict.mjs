import { isStrictModeCode } from '../abstract-ops/all.mjs';

export function IsStrict(node) {
  return isStrictModeCode(node);
}
