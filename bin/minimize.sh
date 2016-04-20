#!/bin/bash
pushd "`dirname $0`/.."
uglifyjs -m -c --screw-ie8 --preamble "/*! Javascript DNA v1.0 | (c) Daniel Ševčík | www.webdevelopers.eu | MIT license | https://github.com/webdevelopers-eu/javascript-dna */" --lint dna.js -o dna.min.js --source-map dna.min.map
popd
