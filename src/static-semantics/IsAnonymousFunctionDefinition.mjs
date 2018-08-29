import {
  IsFunctionDefinition,
  HasName,
} from './all.mjs';

export function IsAnonymousFunctionDefinition(expr) {
  if (IsFunctionDefinition(expr) === false) {
    return false;
  }
  const hasName = HasName(expr);
  if (hasName) {
    return true;
  }
  return false;
}
