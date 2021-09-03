const { DATASET_QUEUE_BUCKET, DATASETS_BUCKET } = process.env;

const s3Buckets = {
  DATASETS_BUCKET,
  DATASET_QUEUE_BUCKET,
  DATASET_EXPORTS_BUCKET: 'skyvue-dataset-exports',
};

module.exports = s3Buckets;
