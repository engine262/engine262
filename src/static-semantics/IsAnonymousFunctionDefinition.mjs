import {
  HasName_Expression,
  IsFunctionDefinition_Expression,
} from './all.mjs';

// 14.1.10 #sec-isanonymousfunctiondefinition
export function IsAnonymousFunctionDefinition(expr) {
  if (IsFunctionDefinition_Expression(expr) === false) {
    return false;
  }
  const hasName = HasName_Expression(expr);
  if (hasName === true) {
    return false;
  }
  return true;
}
