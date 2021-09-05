const runScript = require('./runScript');
const s3 = require('../services/aws');
const constants = require('../constants');

const prepS3ObjectForExport = fileType => async ({ datasetId, title }) =>
  runScript(async function PrepS3ObjectForExport() {
    const BUCKET_NAME = constants.s3Buckets.DATASET_EXPORTS_BUCKET;
    const s3ObjectPrefix = `${datasetId}/${title}/`;
    const params = {
      Bucket: BUCKET_NAME,
      Delimiter: '/',
      Prefix: s3ObjectPrefix,
    };

    const { Contents } = await s3.listObjectsV2(params).promise();
    if (!Contents) throw new Error(`Contents of ${params.Bucket} do not exist`);

    return Promise.all(
      Contents.map(async (item, index) => {
        if (item.size === 0) {
          return;
        }

        const newFileName = encodeURIComponent(
          `${title}${index ? ` (${index})` : ''}${fileType}`,
        );
        const newFileKey = `${datasetId}/processed-dataset/${newFileName}`;

        return s3
          .copyObject({
            Bucket: BUCKET_NAME,
            CopySource: `${BUCKET_NAME}/${item.Key}`,
            Key: newFileKey,
            ContentDisposition: `attachment; filename="${newFileName}`,
          })
          .promise()
          .then(() =>
            // Delete the old object
            s3
              .deleteObject({
                Bucket: BUCKET_NAME,
                Key: item.Key,
              })
              .promise()
              .then(() => ({ newFileName, newFileKey })),
          );
      }),
    );
  });

module.exports = prepS3ObjectForExport;
