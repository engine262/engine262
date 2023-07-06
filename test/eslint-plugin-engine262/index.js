'use strict';

module.exports = {
  rules: {
    'no-use-in-def': require('./no-use-in-def'),
    'valid-feature': require('./valid-feature'),
    'valid-throw': require('./valid-throw'),
    'number-value': require('./number-value'),
    'bigint-value': require('./bigint-value'),
    'mathematical-value': require('./mathematical-value'),
  },
};
