import { Assert } from '../abstract-ops/notational-conventions.mjs';
import { OutOfRange } from '../helpers.mjs';

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   NoSubstitutionTemplate ::
//     `\`` `\``
//     `\`` TemplateCharacters `\``
export function TRV_NoSubstitutionTemplate(NoSubstitutionTemplate) {
  if (NoSubstitutionTemplate.quasis.length !== 1) {
    throw new OutOfRange('TRV_NoSubstitutionTemplate', NoSubstitutionTemplate);
  }
  return TRV_TemplateCharacters(NoSubstitutionTemplate.quasis[0]);
}

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateCharacters ::
//     TemplateCharacter
//     TemplateCharacter TemplateCharacters
export function TRV_TemplateCharacters(TemplateCharacters) {
  Assert(typeof TemplateCharacters.value.raw === 'string');
  return TemplateCharacters.value.raw;
}

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateHead ::
//     `\`` `${`
//     `\`` TemplateCharacters `${`
export const TRV_TemplateHead = TRV_TemplateCharacters;

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateMiddle ::
//     `}` `${`
//     `}` TemplateCharacters `${`
export const TRV_TemplateMiddle = TRV_TemplateCharacters;

// 11.8.6.1 #sec-static-semantics-tv-and-trv
//   TemplateTail ::
//     `}` `\``
//     `}` TemplateCharacters `\``
export const TRV_TemplateTail = TRV_TemplateCharacters;
