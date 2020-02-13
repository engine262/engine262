#!/bin/bash

set -x

npm run test:test262
npm run test:supplemental
npm run test:json
