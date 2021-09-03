const R = require('ramda');
const formatRanges = require('../../constants/formatRanges');
const makeDecimalCodeString = require('./makeDecimalCodeString');

const prefixMap = {
  // todo clean this up for punt this
  percent: '%',
};

const applyCommasAndDecimals = R.curry(
  ({ hasCommas, decimalPoints, format }, colId) => {
    const value = format === 'percent' ? `"${colId}" * 100` : `"${colId}"`;

    return `TO_CHAR(${value}, '${
      hasCommas ? formatRanges.withCommas : formatRanges.withoutCommas
    }${makeDecimalCodeString(decimalPoints)}')${
      format === 'percent' ? `||'${prefixMap[format]}'` : ''
    }`;
  },
);

module.exports = applyCommasAndDecimals;
