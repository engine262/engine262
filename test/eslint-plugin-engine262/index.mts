import noUseInDef from './no-use-in-def.mjs';
import mathematicalValue from './mathematical-value.mjs';
import safeFunctionWithQ from './safe-function-with-q.mjs';
import noFloatingGenerator from './no-floating-generator.mjs';

export const rules = {
  'no-use-in-def': noUseInDef,
  'mathematical-value': mathematicalValue,

  'safe-function-with-q': safeFunctionWithQ,
  'no-floating-generator': noFloatingGenerator,
};
