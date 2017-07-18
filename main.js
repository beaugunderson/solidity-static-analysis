'use strict';

const fs = require('fs');
const StaticAnalysis = require('./staticAnalysis.js');

const staticAnalysis = new StaticAnalysis((warnings) => {
  console.log(JSON.stringify(warnings, null, 2));
});

fs.readFile('./ballot.sol', 'utf8', (err, contents) => {
  staticAnalysis.compiler.compile({'ballot.sol': contents}, 'ballot.sol');
});
