#!/bin/bash

set -x

npm run test:test262
npm run test:json
npm run test:supplemental
