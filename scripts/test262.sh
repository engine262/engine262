#/bin/bash
node --enable-source-maps ./lib-src/node/bin.mts --test262-harness test/test262/test262/test/$1
echo "Test run finished with exit code $?"
