const runScript = require('./runScript');
const constants = require('../constants');
const s3 = require('../services/aws');

const duplicateDataset = fileType => async ({ oldDatasetId, newDatasetId }) =>
  runScript(async function DuplicateDataset() {
    const BUCKET_NAME = constants.s3Buckets.DATASETS_BUCKET;
    const s3ObjectPrefix = `${oldDatasetId}/`;
    const params = {
      Bucket: BUCKET_NAME,
      Delimiter: '/',
      Prefix: s3ObjectPrefix,
    };

    const { Contents } = await s3.listObjectsV2(params).promise();
    if (!Contents) throw new Error(`Contents of ${params.Bucket} do not exist`);

    return 'hello world';

    // return Promise.all(
    //   Contents.map(async (item, index) => {
    //     if (item.size === 0) {
    //       return;
    //     }

    //     // todo:
    //     /*
    //       - duplicate columns folder
    //       - duplicate rows folder
    //     */

    //     // const newFileKey = `${datasetId}/${newFileName}`;

    //     // return s3
    //     //   .copyObject({
    //     //     Bucket: BUCKET_NAME,
    //     //     CopySource: `${BUCKET_NAME}/${item.Key}`,
    //     //     Key: newFileKey,
    //     //     ContentDisposition: `attachment; filename="${newFileName}`,
    //     //   })
    //     //   .promise()
    //     //   .then(() =>
    //     //     // Delete the old object
    //     //     s3
    //     //       .deleteObject({
    //     //         Bucket: BUCKET_NAME,
    //     //         Key: item.Key,
    //     //       })
    //     //       .promise()
    //     //       .then(() => ({ newFileName, newFileKey })),
    //     //   );
    //   }),
  });

module.exports = duplicateDataset;
