// 13.1.4 #sec-static-semantics-declarationpart
//   HoistableDeclaration : FunctionDeclaration
//   HoistableDeclaration : GeneratorDeclaration
//   HoistableDeclaration : AsyncFunctionDeclaration
//   HoistableDeclaration : AsyncGeneratorDeclaration
//   Declaration : ClassDeclaration
//   Declaration : LexicalDeclaration
//
// (implicit)
//   Declaration : HoistableDeclaration
//
// What a weird set of static semantics…
export function DeclarationPart_Declaration(Declaration) {
  return Declaration;
}

export const DeclarationPart_HoistableDeclaration = DeclarationPart_Declaration;
export const DeclarationPart_FunctionDeclaration = DeclarationPart_Declaration;
export const DeclarationPart_GeneratorDeclaration = DeclarationPart_Declaration;
export const DeclarationPart_AsyncFunctionDeclaration = DeclarationPart_Declaration;
export const DeclarationPart_AsyncGeneratorDeclaration = DeclarationPart_Declaration;
export const DeclarationPart_ClassDeclaration = DeclarationPart_Declaration;
export const DeclarationPart_LexicalDeclaration = DeclarationPart_Declaration;
