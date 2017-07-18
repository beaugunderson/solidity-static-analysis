'use strict';

function errortype (message) {
  return message.match(/^(.*:[0-9]*:[0-9]* )?Warning: /) ? 'warning' : 'error';
}

function concatWithSeperator (list, seperator) {
  return list.reduce((sum, item) => sum + item + seperator, '').slice(0, -seperator.length);
}

function escapeRegExp (str) {
  return str.replace(/[-[\]/{}()+?.\\^$|]/g, '\\$&');
}

module.exports = {
  errortype: errortype,
  concatWithSeperator: concatWithSeperator,
  escapeRegExp: escapeRegExp
};
