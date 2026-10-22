#/bin/bash
node --enable-source-maps ./lib/node/bin.mjs --test262-harness test/test262/test262/test/$1
echo "Test run finished with exit code $?"
