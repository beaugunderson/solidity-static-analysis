'use strict';

const Compiler = require('./compiler.js');
const request = require('request');
const swarmgw = require('swarmgw');
const StaticAnalysisRunner = require('./staticAnalysisRunner.js');

const filesProviders = {};

function fileProviderOf (file) {
  var provider = file.match(/[^/]*/);

  if (provider !== null) {
    return filesProviders[provider[0]];
  }

  return null;
}

function handleGithubCall (root, path, cb) {
  request.get({
    url: 'https://api.github.com/repos/' + root + '/contents/' + path,
    json: true
  }, (err, response, data) => {
    if (err) {
      return cb(err || 'Unknown transport error');
    }

    if ('content' in data) {
      cb(null, new Buffer((data.content, 'base64').toString('ascii')));
    } else {
      cb('Content not received');
    }
  });
}

function handleSwarmImport (url, cb) {
  swarmgw.get(url, cb);
}

function handleIPFS (url, cb) {
  // replace ipfs:// with /ipfs/
  url = url.replace(/^ipfs:\/\/?/, 'ipfs/');

  request.get({
    url: 'https://gateway.ipfs.io/' + url
  }, (err, response, data) => {
    if (err) {
      return cb(err || 'Unknown transport error');
    }

    cb(null, data);
  });
}

function handleImportCall (url, cb) {
  var provider = fileProviderOf(url);

  if (provider && provider.exists(url)) {
    return provider.get(url, cb);
  }

  var handlers = [
    {
      match: /^(https?:\/\/)?(www.)?github.com\/([^/]*\/[^/]*)\/(.*)/,
      handler: function (match, handlerCb) {
        handleGithubCall(match[3], match[4], handlerCb);
      }
    },
    {
      match: /^(bzz[ri]?:\/\/?.*)$/,
      handler: function (match, handlerCb) {
        handleSwarmImport(match[1], handlerCb);
      }
    },
    {
      match: /^(ipfs:\/\/?.+)/,
      handler: function (match, handlerCb) {
        handleIPFS(match[1], handlerCb);
      }
    }
  ];

  var found = false;

  handlers.forEach(function (handler) {
    if (found) {
      return;
    }

    var match = handler.match.exec(url);

    if (match) {
      found = true;

      handler.handler(match, function (err, content) {
        if (err) {
          cb('Unable to import "' + url + '": ' + err);
          return;
        }

        // FIXME: at some point we should invalidate the cache
        // filesProviders['browser'].addReadOnly(url, content);

        cb(null, content);
      });
    }
  });

  if (found) {
    return;
  } else if (/^[^:]*:\/\//.exec(url)) {
    cb('Unable to import "' + url + '": Unsupported URL schema');
  } else {
    cb('Unable to import "' + url + '": File not found');
  }
}

function staticAnalysis(cb) {
  this.compiler = new Compiler(handleImportCall);
  this.compiler.loadVersion();

  this.runner = new StaticAnalysisRunner();

  this.compiler.event.register('compilationFinished', (success, compilationResult) => {
    if (!success) {
      throw new Error();
    }

    console.log(this.compiler.lastCompilationResult.data.errors);
    console.log();

    this.run(compilationResult, cb);
  });
}

staticAnalysis.prototype.run = function (compilationResult, cb) {
  var selected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  var warnings = [];

  this.runner.run(compilationResult, selected, function (results) {
    results.map(function (result) {
      result.report.map(function (item) {
        var location = '';

        if (item.location !== undefined) {
          console.log('XXX', item.location);

          var split = item.location.split(':');
          var file = split[2];

          location = {
            start: parseInt(split[0], 10),
            length: parseInt(split[1], 10)
          };

          location = self.appAPI.offsetToLineColumn(location, file);

          location = compilationResult.sourceList[file] + ':' +
            (location.start.line + 1) + ':' +
            (location.start.column + 1) + ':';
        }

        warnings.push({
          location: location,
          item: item
        });
      });
    });

    cb(warnings);
  });
};

module.exports = staticAnalysis;
