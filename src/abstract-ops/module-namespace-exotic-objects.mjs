import { X } from '../completion.mjs';
import { AbstractModuleRecord } from '../modules.mjs';
import {
  wellKnownSymbols,
  Value,
  ModuleNamespaceExoticObjectValue,
  Descriptor,
} from '../value.mjs';
import {
  Assert,
  SortCompare,
} from './all.mjs';

// 9.4.6.11 #sec-modulenamespacecreate
export function ModuleNamespaceCreate(module, exports) {
  Assert(module instanceof AbstractModuleRecord);
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
  const sortedExports = [...exports].sort((x, y) => {
    const result = X(SortCompare(x, y, Value.undefined));
    return result.numberValue();
  });
  M.Exports = sortedExports;
  module.Namespace = M;
  return M;
}
