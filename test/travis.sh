#!/bin/bash
set -e

# For PRs
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
  echo -e "\e[36m\e[1mTest triggered for PR #${TRAVIS_PULL_REQUEST}."
fi

# Figure out the source of the test
if [ -n "$TRAVIS_TAG" ]; then
  echo -e "\e[36m\e[1mTest triggered for tag \"${TRAVIS_TAG}\"."
else
  echo -e "\e[36m\e[1mTest triggered for branch \"${TRAVIS_BRANCH}\"."
fi

npm run lint
npm run build
npm run test
