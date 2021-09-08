const runScript = require('./runScript');
const constants = require('../constants');
const s3 = require('../services/aws');
const makeRedshift = require('../services/redshift');
const createPermanentStorageTableQuery = require('../lib/queries/createPermanentStorageQuery');

const duplicateDataset = async ({ oldDatasetId, newDatasetId }) =>
  runScript(async function DuplicateDataset() {
    const Bucket = constants.s3Buckets.DATASETS_BUCKET;
    const redshift = await makeRedshift();
    const columnsRes = await s3
      .getObject({
        Bucket,
        Key: `${oldDatasetId}/columns/0`,
      })
      .promise();
    const { columns } = JSON.parse(columnsRes.Body);

    const handlePath = async pathKey => {
      const s3ObjectPrefix = `${oldDatasetId}/${pathKey}/`;
      const params = {
        Bucket,
        Delimiter: '/',
        Prefix: s3ObjectPrefix,
      };

      const { Contents } = await s3.listObjectsV2(params).promise();

      if (!Contents || !Contents.length) {
        throw new Error(`Contents of ${params.Bucket} do not exist`);
      }

      return Promise.all(
        Contents.map(async item => {
          if (item.size === 0) {
            return;
          }

          const fileName = item.Key.replace(`${oldDatasetId}/`, '').replace(
            `${pathKey}/`,
            '',
          );

          return s3
            .copyObject({
              Bucket,
              CopySource: `${Bucket}/${oldDatasetId}/${pathKey}/${fileName}`,
              Key: `${newDatasetId}/${pathKey}/${fileName}`,
            })
            .promise()
            .then(res => ({ pathKey, res }));
        }),
      );
    };

    const s3Execution = await Promise.all(['rows', 'columns'].map(handlePath));
    try {
      console.log(columns);
      await redshift.query(createPermanentStorageTableQuery(newDatasetId, columns));
    } catch (e) {
      console.log(e);
    }
    return s3Execution;
  });

module.exports = duplicateDataset;
