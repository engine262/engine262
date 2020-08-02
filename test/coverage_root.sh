#!/bin/bash

set -x

E=0

npm run test:test262 || E=$?
npm run test:json || E=$?
npm run test:supplemental || E=$?

exit $E
