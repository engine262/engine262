#!/bin/bash

set -x

npm run test:test262 -- --run-long
npm run test:json
npm run test:supplemental
