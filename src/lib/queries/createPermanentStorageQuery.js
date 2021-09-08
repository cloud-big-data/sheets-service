// for now, need to keep in sync with the function by the same name in the process-dataset
// lambda until I figure out a better code-sharing solution
const knex = require('../../utils/knex');

const createPermanentStorageTableQuery = (boardId, columns) =>
  knex.schema
    .createTable(`spectrum.${boardId}_working`, table => {
      table.string('id');
      columns.forEach(col => {
        switch (col.dataType) {
          case 'string':
            table.string(col._id);
            break;
          case 'number':
            table.float(col._id);
            break;
          case 'date':
            table.datetime(col._id);
            break;
          default:
            table.string(col._id);
        }
      });
    })
    .toString()
    .replace('create table', 'create external table') +
  `
    ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
    STORED AS TEXTFILE
    LOCATION 's3://skyvue-datasets/${boardId}/rows'
    TABLE PROPERTIES (
      'skip.header.line.count'= '1'
    )
  `.trim();

module.exports = createPermanentStorageTableQuery;
