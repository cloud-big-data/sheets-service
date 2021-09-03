// values and column names
// // hidden
// // commas
// // decimals
// // currency
// date formats - blocked by EMR stuff

// select to_number('$12,454.8', 'L99G999D9'); - remove commas
// TO_CHAR("904e6a7e-60ce-4cf2-b16d-9f2c2c27576f", 'l99999D99') - add dollar sign (maybe should just concatenate)
// thousands separator (with commas) TO_CHAR(num, '999,999,999D99')
// thousands separator (w/o commas) TO_CHAR(num, '999,999,999')

module.exports.toCurrency = require('./toCurrency');
module.exports.toPercent = require('./toPercent');
module.exports.applyCommasAndDecimals = require('./applyCommasAndDecimals');
module.exports.formatNumber = require('./formatNumber');
