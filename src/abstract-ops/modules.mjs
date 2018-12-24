// 15.2.1.9 #sec-importedlocalnames
export function ImportedLocalNames(importEntries) {
  const localNames = [];
  for (const i of importEntries) {
    localNames.push(i.LocalName);
  }
  return localNames;
}
