const jsToSql = require('./index');

const formatNumber = (
  { format, currencyCode, decimalPoints = 2, commas = true },
  colId,
) => {
  if (currencyCode) {
    return jsToSql.toCurrency(currencyCode, colId);
  }

  return jsToSql.applyCommasAndDecimals(
    {
      hasCommas: commas,
      decimalPoints,
      format,
    },
    colId,
  );
};

module.exports = formatNumber;
