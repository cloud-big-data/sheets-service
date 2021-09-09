const aws = require('aws-sdk');
const R = require('ramda');

const makeBoardDataFromVersion = require('../lib/makeBoardDataFromVersion');
const sortDatasetByColumnOrder = require('../lib/sortDatasetByColumnOrder');
const makeSaveRowsQuery = require('../lib/queries/makeSaveRowsQuery');
const { makeImportQuery } = require('../lib/queries/makeImportQuery');
const makeUnloadQuery = require('../lib/queries/makeUnloadQuery');
const transformColumnSummaryResponse = require('../lib/transformColumnSummaryResponse');
const lib = require('../lib');

const skyvueFetch = require('../services/skyvueFetch');
const makeRedshift = require('../services/redshift');
const loadCompiledDataset = require('../services/loadCompiledDataset');
const saveColumnsToS3 = require('../services/saveColumnsToS3');

const addDiff = require('../utils/addDiff');
const addLayer = require('../utils/addLayer');
const stringifyJson = require('../utils/stringifyJson');

const constants = require('../constants');
const { MAX_IN_MEMORY_ROWS } = require('../constants/boardDataMetaConstants');
const exportService = require('../services/exportService');

const awsConfig = new aws.Config({
  region: 'us-east-2',
  accessKeyId: process.env.AWS_ACCESSKEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESSKEY,
});

const s3 = new aws.S3(awsConfig);

/**
 * @param {{
 *   columns: IColumn[];
 *   rows: IRow[]
 *   visibilitySettings: {
 *     owner: UserId;
 *     editors: UserId[];
 *     viewers: UserId[];
 *   }
 *  layers: {
 *    joins: [],
 *    filters: [],
 *    groupings: {},
 *    sort: [],
 *    formatting: [],
 *  }
 * }} boardData
 */

const initial_layers = {
  joins: {},
  filters: [],
  groupings: {},
  smartColumns: [],
  sortings: [],
  formatting: [],
};

const Dataset = async ({ datasetId, userId }) => {
  const redshift = await makeRedshift();
  // todo build authentication that validates a userId has edit privileges
  const s3Params = {
    Bucket: 'skyvue-datasets',
    Key: `${datasetId}/columns/0`,
  };

  let head;
  let baseState;
  let fnQueue;
  let lastSlice;
  let layers = initial_layers;
  let layerSnapshot = layers;
  let changeHistory = [];
  let lastAppend;
  let colOrder;
  // The archive for removed columns
  const removedColumns = {};

  return {
    get baseState() {
      return baseState;
    },
    get head() {
      return head;
    },
    get meta() {
      // todo this should query the id column and get the count
      return {
        rows: baseState?.rows.length,
      };
    },
    get layers() {
      return layers;
    },
    get lastAppend() {
      return lastAppend;
    },
    get lastSlice() {
      return lastSlice;
    },
    get datasetId() {
      return datasetId;
    },
    addDiff: async diff => {
      /*
        TODO this will be a big one.

        - If diff is a cell change, asynchronously update directly in Postgres. Client will only care about result if there is an error, in which case it will revert.
        - If diff is a column change, just update the columns in state and call saveColumnsToS3
        - If diff is a column removal, should we just toggle isDeleted? Idk. This will need to be accounted for in change history audits.
        - If diff is a row removal, basically same thing
      */
      // const initialBaseState = baseState;
      if (diff?.colDiff?.type === 'modification') {
        baseState = addDiff(diff, baseState);
      }

      // if (diff.colDiff?.type === 'removal') {
      //   const removedColumn = diff.colDiff.diff[0];
      //   if (!removedColumn) return;
      //   const colIndex = initialBaseState.columns.findIndex(
      //     col => col._id === removedColumn?._id,
      //   );
      //   const cellsInColumn = initialBaseState.rows.map(row => row.cells[colIndex]);
      //   removedColumns[removedColumn._id] = cellsInColumn;
      // }
    },
    // todo can we estimate csv size in a redshift query?
    addLayer: (layerKey, layer) => {
      baseState = R.assoc('layers', addLayer(layerKey, layer, layers))(baseState);
      layers = addLayer(layerKey, layer, layers);
      layerSnapshot = layers;
    },
    addToUnsavedChanges: change => {
      baseState = {
        ...baseState,
        unsavedChanges: {
          ...(baseState?.unsavedChanges ?? {}),
          ...change,
        },
      };
    },
    checkoutToVersion: (versionId, direction) => {
      // todo fix change history bc it sucks
      const changeHistoryItem =
        changeHistory.find(history => history.revisionId === versionId) ?? {};

      baseState = makeBoardDataFromVersion(
        changeHistoryItem,
        direction,
        baseState,
        removedColumns,
      );

      return baseState;
    },
    clearFuncQueue: () => {
      fnQueue = undefined;
    },
    clearLayers: () => {
      layers = initial_layers;
    },
    estCSVSize: async () => 205,
    getColumnSummary: async () =>
      R.pipe(
        () =>
          loadCompiledDataset(
            datasetId,
            baseState ? R.omit(['rows'], baseState) : undefined,
            { makeSummary: true },
          ),
        R.andThen(transformColumnSummaryResponse),
      )(),
    getSlice: async (start, end, { useCached = false } = {}) => {
      if (end > MAX_IN_MEMORY_ROWS) {
        console.log(
          'This is where I will need to query by offset/row number in Redshift',
        );
        return;
      }

      /* todo FUTURE APPROACH PSEUDO CODE
      
      get a list of layers that have changed since the last compilation. loadCompiledDataset will account for this.
      arrayOfLayersToRedo = diff(layers, layerSnapshot);
      
      Cache check should:
        - Check if rows selected are contained in the in-memory data. If so, return that slice.
        - If not, loadCompiledDataset({ future params that will allow us to set row indeces, using sql offset });
      
      In general, we want to avoid the insert & onConflict & merge calls that we are currently making every time. 
      If we can avoid these by tracking changes, that will pay dividends.
      */

      const returnValue = {
        ...baseState,
        layers,
        rows: baseState?.rows?.slice(start, end + 1) ?? [],
      };
      if (colOrder?.length > 0) {
        return sortDatasetByColumnOrder(colOrder, returnValue);
      }
      return returnValue;
    },
    /**
     * @param {{ columnMapping, dedupeSettings }} importSettings
     */
    importLastAppended: async importSettings => {
      if (!lastAppend) return;
      try {
        console.log(
          makeUnloadQuery(
            `s3://${constants.s3Buckets.DATASETS_BUCKET}/${datasetId}/rows/`,
            makeImportQuery(importSettings, baseState.baseColumns, datasetId),
          ),
        );
        await redshift.query(
          makeUnloadQuery(
            `s3://${constants.s3Buckets.DATASETS_BUCKET}/${datasetId}/rows/`,
            makeImportQuery(importSettings, baseState.baseColumns, datasetId),
          ),
        );
        await skyvueFetch.post('/datasets/append/log', {
          userId,
          datasetId,
          beginningRowCount: 100, // should use head.length,
          endingRowCount: 100 + lastAppend?.meta?.length ?? 0,
        });
      } catch (e) {
        console.error(e);
      }
    },
    load: async () => {
      try {
        baseState = await loadCompiledDataset(
          datasetId,
          baseState ? R.omit(['rows'], baseState) : undefined,
        );
        layers = baseState.layers;
        if (!baseState.colOrder && !colOrder) {
          colOrder = R.pluck('_id', baseState.underlyingColumns);
        }
      } catch (e) {
        console.log('error loading dataset from s3', s3Params, e);
      }

      return baseState;
    },
    exportDataset: async ({ maxFileSize, title, destination }) => {
      if (!baseState) return;
      const exportQuery = await lib.q.makeExportQuery(datasetId, baseState);
      const postUpload = await exportService(exportQuery)[destination]?.({
        maxFileSize,
        destinationKey: `${datasetId}/${title}/`,
        redshift,
        datasetId,
        userId,
      });

      const handleError = () => {
        throw new Error();
      };

      if (destination === 'csv') {
        const s3Keys = await postUpload({
          datasetId,
          title,
        });

        if (s3Keys.success === false) handleError();

        const presignedUrls = (s3Keys?.response ?? []).map(
          ({ newFileName, newFileKey }) =>
            s3.getSignedUrl('getObject', {
              Bucket: constants.s3Buckets.DATASET_EXPORTS_BUCKET,
              Key: newFileKey,
              ResponseContentDisposition: `attachment; filename="${newFileName}"`,
            }),
        );

        return ['downloadReady', presignedUrls];
      }
      if (destination === 'skyvue') {
        if (postUpload.success === false) handleError();
        return ['newDataset', postUpload.response];
      }
    },
    queueFunc: fn => {
      fnQueue = fn;
    },
    runQueuedFunc: () => {
      fnQueue?.();
    },
    saveAsNew: async newDatasetId => {
      // todo this will absolutely need to change
      const compiled = await getCompiled(layers, baseState);

      await s3
        .putObject({
          ...s3Params,
          ContentType: 'application/json',
          Key: newDatasetId,
          Body: await stringifyJson({
            ...compiled,
            layers: initial_layers,
          }),
        })
        .promise();

      return true;
    },
    saveHead: async () => {
      if (!baseState?.columns) return;
      const headToPersist = R.pipe(
        R.assoc('colOrder', colOrder),
        R.omit(['rows', 'underlyingColumns', 'baseColumns']),
        R.assoc('columns', baseState.baseColumns),
      )(baseState);

      await saveColumnsToS3(datasetId, headToPersist);
    },
    saveRows: async () => {
      if (
        Object.values(baseState?.unsavedChanges ?? {}).filter(
          change => change.targetType === 'cell',
        ).length === 0
      )
        return;

      // todo figure out why this line is occassionally causing spectrum scan error issues
      await redshift.query(
        `
          alter table spectrum."${datasetId}_working"
          SET TABLE PROPERTIES (
            'skip.header.line.count'= '0'
          )
        `.toString(),
      );
      await redshift.query(makeSaveRowsQuery(datasetId, baseState));

      baseState = {
        ...baseState,
        unsavedChanges: R.filter(change => change.targetType !== 'cell')(
          baseState?.unsavedChanges ?? {},
        ),
      };

      return true;
    },
    saveToHistory: change => {
      // todo rewrite change history overall. It's pretty garbage right now.
      changeHistory = [...changeHistory, change];
    },
    setColOrder: newColOrder => {
      colOrder = newColOrder;
    },
    setDeletedObjects: newDeletedObjects => {
      baseState = {
        ...baseState,
        deletedObjects: newDeletedObjects,
      };
    },
    setLastAppend: data => {
      console.log('last append set', data);
      lastAppend = data;
    },
    setLastSlice: (start, end) => {
      // todo I don't think we need this anymore?
      lastSlice = [start, end];
    },
    syncLayers: newLayers => {
      if (R.equals(layers, newLayers)) return;
      layers = newLayers;
    },
    toggleLayer: async (toggleKey, isVisible) => {
      baseState = {
        ...baseState,
        layerToggles: {
          ...baseState?.layerToggles,
          [toggleKey]: isVisible,
        },
      };

      return baseState;
    },
  };
};

module.exports = { Dataset, initial_layers };
