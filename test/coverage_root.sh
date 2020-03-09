#!/bin/bash

set -ex

npm run test:test262
npm run test:supplemental
npm run test:json
