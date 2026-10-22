#!/bin/bash

set -x

E=0

pnpm run test:supplemental || E=$?
pnpm run test:json || E=$?
pnpm run test:test262 || E=$?

exit $E
