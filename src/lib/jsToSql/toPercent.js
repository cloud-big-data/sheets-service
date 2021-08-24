const R = require('ramda');
const formatRanges = require('../../constants/formatRanges');
const makeDecimalCodeString = require('./makeDecimalCodeString');

const toPercent = R.curry(({ isPercent, hasCommas, decimalPoints }, colId) =>
  isPercent
    ? hasCommas
      ? `TO_CHAR("${colId}" * 100, '${
          formatRanges.withCommas
        }${makeDecimalCodeString(decimalPoints)}')`
      : `TO_CHAR("${colId}" * 100, '${
          formatRanges.withoutCommas
        }${makeDecimalCodeString(decimalPoints)}')`
    : colId,
);

module.exports = toPercent;
