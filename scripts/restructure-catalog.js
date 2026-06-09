#!/usr/bin/env node

const path = require('path');

const serverDir = path.resolve(__dirname, '..', 'server');
process.chdir(serverDir);

require(require.resolve('ts-node/register', { paths: [serverDir] }));
require(path.join(serverDir, 'src', 'scripts', 'restructureCatalog.ts'));
