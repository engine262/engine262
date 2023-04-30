// @ts-nocheck
import { HasInitializer } from './all.mjs';

export function ExpectedArgumentCount(FormalParameterList) {
  if (FormalParameterList.length === 0) {
    return 0;
  }

  let count = 0;
  for (const FormalParameter of FormalParameterList.slice(0, -1)) {
    const BindingElement = FormalParameter;
    if (HasInitializer(BindingElement)) {
      return count;
    }
    count += 1;
  }

  const last = FormalParameterList[FormalParameterList.length - 1];
  if (last.type === 'BindingRestElement') {
    return count;
  }
  if (HasInitializer(last)) {
    return count;
  }
  return count + 1;
}
