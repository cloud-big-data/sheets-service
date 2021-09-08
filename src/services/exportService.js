const lib = require('../lib');
const constants = require('../constants');
const { duplicateDataset, prepS3ObjectForExport } = require('../jobs');
const skyvueFetch = require('./skyvueFetch');

const postUpload = prepS3ObjectForExport;

const exportService = exportQuery => ({
  csv: async ({ destinationKey, maxFileSize, redshift }) => {
    await redshift.query(
      lib.q.makeUnloadQuery(
        `s3://${constants.s3Buckets.DATASET_EXPORTS_BUCKET}/${destinationKey}`,
        exportQuery,
        { withHeader: true, maxFileSize },
      ),
    );

    return postUpload('.csv');
  },
  skyvue: async ({ datasetId, userId }) => {
    const res = await skyvueFetch.post(`/datasets/duplicate/${datasetId}`, {
      userId,
    });
    return res.json;
  },
});

module.exports = exportService;
