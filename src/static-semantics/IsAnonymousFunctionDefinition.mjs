import { IsFunctionDefinition, HasName } from './all.mjs';

// #sec-isanonymousfunctiondefinition
export function IsAnonymousFunctionDefinition(expr) {
  // 1. If IsFunctionDefinition of expr is false, return false.
  if (!IsFunctionDefinition(expr)) {
    return false;
  }
  // 1. Let hasName be HasName of expr.
  const hasName = HasName(expr);
  // 1. If hasName is true, return false.
  if (hasName) {
    return false;
  }
  // 1. Return true.
  return true;
}
