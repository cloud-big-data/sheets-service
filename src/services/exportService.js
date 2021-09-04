const lib = require('../lib');
const constants = require('../constants');
const prepS3ObjectForExport = require('../jobs/prepS3ObjectForExport');

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
});

module.exports = exportService;
