// #sec-static-semantics-constructormethod
//   ClassElementList :
//     ClassElement
//     ClassElementList ClassElement
function ConstructorMethod_ClassElementList(ClassElementList) {
  return ClassElementList.find((ClassElement) => ClassElement.kind === 'constructor');
}

// (implicit)
//   ClassBody : ClassElementList
export const ConstructorMethod_ClassBody = ConstructorMethod_ClassElementList;
