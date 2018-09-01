import {
  HasName,
  IsFunctionDefinition_Expression,
} from './all.mjs';

// #sec-isanonymousfunctiondefinition
export function IsAnonymousFunctionDefinition(expr) {
  if (IsFunctionDefinition_Expression(expr) === false) {
    return false;
  }
  const hasName = HasName(expr);
  if (hasName === true) {
    return false;
  }
  return true;
}
