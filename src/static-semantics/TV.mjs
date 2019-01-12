import { OutOfRange } from '../helpers.mjs';

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   NoSubstitutionTemplate ::
//     `\`` `\``
//     `\`` TemplateCharacters `\``
export function TV_NoSubstitutionTemplate(NoSubstitutionTemplate) {
  if (NoSubstitutionTemplate.quasis.length !== 1) {
    throw new OutOfRange('TV_NoSubstitutionTemplate', NoSubstitutionTemplate);
  }
  return TV_TemplateCharacters(NoSubstitutionTemplate.quasis[0]);
}

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateCharacters ::
//     TemplateCharacter
//     TemplateCharacter TemplateCharacters
export function TV_TemplateCharacters(TemplateCharacters) {
  if (TemplateCharacters.value.cooked === null) {
    return undefined;
  }
  return TemplateCharacters.value.cooked;
}

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateHead ::
//     `\`` `${`
//     `\`` TemplateCharacters `${`
export const TV_TemplateHead = TV_TemplateCharacters;

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateMiddle ::
//     `}` `${`
//     `}` TemplateCharacters `${`
export const TV_TemplateMiddle = TV_TemplateCharacters;

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateTail ::
//     `}` `\``
//     `}` TemplateCharacters `\``
export const TV_TemplateTail = TV_TemplateCharacters;
