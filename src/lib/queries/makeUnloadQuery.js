const knex = require('../../utils/knex');

const makeUnloadQuery = (destination, selectQuery, { withHeader = false }) =>
  knex
    .raw(
      `
    UNLOAD (?)
    TO '${destination}'
    iam_role '${process.env.REDSHIFT_IAM_ROLE}'
    ${withHeader ? 'HEADER' : ''}
    ALLOWOVERWRITE
    format as CSV
  `,
      selectQuery,
    )
    .toString();

module.exports = makeUnloadQuery;
