#!/bin/bash
pushd "`dirname $0`/.."
uglifyjs -m -c --screw-ie8 --comments --lint dna.js -o dna.min.js --source-map dna.min.map
#git commit -m "New minimized version." dna.min.*
popd
