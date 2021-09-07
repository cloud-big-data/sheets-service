const express = require('express');

const router = express.router();

const jobs = require('../../jobs');

const AVAILABLE_JOBS = {
  duplicateDataset: jobs.duplicateDataset,
  prepS3ObjectForExport: jobs.prepS3ObjectForExport,
};

router.post('/:jobKey', async (req, res) => {
  const job = AVAILABLE_JOBS[req.params.jobKey];
  if (!job) {
    return res.sendStatus(404);
  }
  const execution = await job(req.body);
  return res.json(execution);
});

module.exports = router;
