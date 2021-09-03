const R = require('ramda');
const knex = require('../../utils/knex');
const lib = require('../index');
const loadCompiledDataset = require('../../services/loadCompiledDataset');

const makeExportQuery = async (datasetId, baseState) => {
  const { deletedObjects, columns } = baseState;
  const initialQuery = await loadCompiledDataset(datasetId, baseState, {
    onlyQuery: true,
  });
  console.log('initial_query', initialQuery);
  console.log(columns);

  const columnLookup = R.indexBy(R.prop('_id'), columns);
  const colIds = R.pipe(
    R.filter(
      col =>
        !col.isHidden &&
        !(deletedObjects ?? []).find(obj => obj.objectId === col._id),
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
        return `"${column._id}"`;
    }
  };

  return knex
    .with('initial_query', knex.raw(initialQuery))
    .select(
      ...colIds.map(colId => {
        const column = columnLookup[colId];
        const formatted = applyFormatting(column);
        console.log(column?.value, formatted);

        return knex.raw(`${formatted} as "${column?.value}"`);
      }),
    )
    .table('initial_query')
    .toString();
};

module.exports = makeExportQuery;
