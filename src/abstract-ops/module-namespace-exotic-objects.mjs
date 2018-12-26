import {
  wellKnownSymbols,
  Value,
  ModuleRecord,
  ModuleNamespaceExoticObjectValue,
  Descriptor,
} from '../value.mjs';
import { Assert } from './all.mjs';

// 9.4.6.11 #sec-modulenamespacecreate
export function ModuleNamespaceCreate(module, exports) {
  Assert(module instanceof ModuleRecord);
  Assert(module.Namespace === Value.undefined);
  Assert(Array.isArray(exports));
  const M = new ModuleNamespaceExoticObjectValue();
  M.properties.set(wellKnownSymbols.toStringTag, Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
    Value: new Value('Module'),
  }));
  M.Module = module;
  const sortedExports = exports.sort((x, y) => {
    // 22.1.3.25.1 #sec-sortcompare
    const xString = x.stringValue();
    const yString = y.stringValue();
    const xSmaller = xString < yString;
    if (xSmaller) {
      return -1;
    }
    const ySmaller = yString < xString;
    if (ySmaller) {
      return 1;
    }
    return 0;
  });
  M.Exports = sortedExports;
  module.Namespace = M;
  return M;
}
