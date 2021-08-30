const R = require('ramda');
const knex = require('../../utils/knex');
const lib = require('../index');
const loadCompiledDataset = require('../../services/loadCompiledDataset');

const makeExportQuery = async (datasetId, { columns, deletedObjects = [] }) => {
  const initialQuery = await loadCompiledDataset(datasetId, undefined, {
    onlyQuery: true,
  });
  console.log('initialquery', initialQuery);
  console.log(columns);

  const columnLookup = R.indexBy(R.prop('_id'), columns);
  const colIds = R.pipe(
    R.filter(
      col => !col.isHidden && !deletedObjects.find(obj => obj.objectId === col._id),
    ),
    R.pluck('_id'),
  )(columns);

  const applyFormatting = column => {
    const { dataType, formatSettings, format, _id } = column;
    const formatting = {
      ...formatSettings,
      format,
    };

    switch (dataType) {
      case 'number':
        return lib.sql.formatNumber(formatting, _id);
      default:
        return `"column._id"`;
    }
  };

  // make cte using results from initialQuery
  return knex
    .select(
      ...colIds.map(colId => {
        const column = columnLookup[colId];
        const formatted = applyFormatting(column);

        return knex.raw(`${formatted} as ${column?.value}`);
      }),
    )
    .table(lib.makeTableName(datasetId))
    .toString();
};

module.exports = makeExportQuery;
