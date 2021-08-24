const makeDecimalCodeString = decimalPoints =>
  `D${[...Array(decimalPoints)].map(() => '9').join('')}`;

module.exports = makeDecimalCodeString;
