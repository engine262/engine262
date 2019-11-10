'use strict';

/* global api */
/* global print */
/* eslint-disable no-restricted-globals */

const source = api.readFile(api.argv[0]);

try {
  JSON.parse(source);
  print('0');
} catch (e) {
  print(e.stack || e);
  print('1');
}
