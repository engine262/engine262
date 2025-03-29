#!/bin/bash

set -x

E=0

npm run test:json || E=$?
npm run test:supplemental || E=$?
npm run test:inspector || E=$?
npm run test:test262 || E=$?

exit $E
