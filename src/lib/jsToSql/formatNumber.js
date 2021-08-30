const jsToSql = require('./index');

const formatNumber = ({ format, decimalPoints, currencyCode, commas }, colId) => {
  if (currencyCode) {
    return jsToSql.toCurrency(currencyCode, colId);
  }

  if (commas) {
    return jsToSql.applyCommas({ decimalPoints }, colId);
  }

  if (!commas) {
    return jsToSql.applyCommas({ hasCommas: false, decimalPoints }, colId);
  }

  return colId;
};

module.exports = formatNumber;
