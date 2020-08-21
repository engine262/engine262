'use strict';

let features;
try {
  features = require('../..').FEATURES.map((f) => f.flag);
} catch {}

function isFeatureCall(node) {
  return node.callee.type === 'MemberExpression'
    && node.callee.computed === false
    && node.callee.property.name === 'feature';
}

module.exports = {
  create(context) {
    return {
      CallExpression(node) {
        if (!isFeatureCall(node)) {
          return;
        }
        if (node.arguments.length !== 1) {
          context.report(node, 'Invalid arguments passed to feature()');
          return;
        }
        const featureName = node.arguments[0].value;
        if (!features.includes(featureName)) {
          context.report(node.arguments[0], `'${featureName}' is not a valid feature. Check src/engine.mjs.`);
        }
      },
    };
  },
};
