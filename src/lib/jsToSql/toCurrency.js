const R = require('ramda');
const CURRENCY_CODES = require('../../constants/currencyCodes');
const makeDecimalCodeString = require('./makeDecimalCodeString');

// todo there is a mild bit of tech debt here in the case of the swiss franc.
// they are the only currency I know of that rounds on .25. So >=.26, round up. <=25, round down.
// Going to punt that for now.

const toCurrency = R.curry((currencyCode, colId) => {
  const currencyData = CURRENCY_CODES[currencyCode];
  if (!currencyData) return colId;
  const { decimal_digits, symbol_native } = currencyData;

  return `'${symbol_native}'||TO_CHAR("${value}", '999,999,999${makeDecimalCodeString(
    decimal_digits,
  )}')`;
});

module.exports = toCurrency;
