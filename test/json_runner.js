'use strict';

/* global api */
/* eslint-disable no-restricted-globals */

const source = api.readFile(api.argv[0]);

JSON.parse(source);
