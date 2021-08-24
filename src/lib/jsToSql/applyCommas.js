const R = require('ramda');
const formatRanges = require('../../constants/formatRanges');
const makeDecimalCodeString = require('./makeDecimalCodeString');

const applyCommas = R.curry(({ hasCommas, decimalPoints }, colId) =>
  hasCommas
    ? `TO_CHAR("${value}", '${formatRanges.withCommas}${makeDecimalCodeString(
        decimalPoints,
      )}')`
    : colId,
);

module.exports = applyCommas;
