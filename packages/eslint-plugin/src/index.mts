import type { ESLint, Linter } from 'eslint';
import qMacro from './q-macro.mjs';
import noFloatingEvaluator from './no-floating-evaluator.mjs';
import gcMarkComplete from './gc-mark-complete.mjs';
import recordClass from './record-class.mjs';
import gcCaptures from './gc-captures-auto.mjs';
import gcCapturesManual from './gc-captures-manual.mjs';

export const rules = {
  'gc-captures-manual': gcCapturesManual,
  'gc-captures': gcCaptures,
  'gc-mark-complete': gcMarkComplete,
  'no-floating-evaluator': noFloatingEvaluator,
  'q-macro': qMacro,
  'record-class': recordClass,
};

const plugin: ESLint.Plugin = {
  meta: {
    name: '@engine262/eslint-plugin',
    version: '0.0.0',
  },
  rules,
  get configs() {
    return configs;
  },
};

export const configs: Record<'recommended', Linter.Config> = {
  recommended: {
    name: '@engine262/recommended',
    plugins: {
      '@engine262': plugin,
    },
    rules: Object.fromEntries(
      Object.keys(rules).map((name) => [`@engine262/${name}`, 'error']),
    ),
  },
};

export default plugin;
