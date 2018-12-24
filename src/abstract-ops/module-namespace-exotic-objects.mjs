import { Value, ModuleRecord, ModuleNamespaceExoticObjectValue } from '../value.mjs';
import { Assert } from './all.mjs';

// #sec-modulenamespacecreate
export function ModuleNamespaceCreate(module, exports) {
  Assert(module instanceof ModuleRecord);
  Assert(module.Namespace === Value.undefined);
  Assert(Array.isArray(exports));
  const M = new ModuleNamespaceExoticObjectValue();
  M.Module = module;
  const sortedExports = exports.sort((a, b) => a.stringValue().localeCompare(b.stringValue()));
  M.Exports = sortedExports;
  module.Namespace = M;
  return M;
}
