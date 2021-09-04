const knex = require('../../utils/knex');

const makeUnloadQuery = (
  destination,
  selectQuery,
  { withHeader = false, maxFileSize },
) =>
  knex
    .raw(
      `
        UNLOAD (?)
        TO '${destination}'
        iam_role '${process.env.REDSHIFT_IAM_ROLE}'
        ${withHeader ? 'HEADER' : ''}
        ${maxFileSize ? 'maxfilesize = ? gb' : ''}
        ALLOWOVERWRITE
        format as CSV
      `,
      selectQuery,
      maxFileSize,
    )
    .toString();

module.exports = makeUnloadQuery;
