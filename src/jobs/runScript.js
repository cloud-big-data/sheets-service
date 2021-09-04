const pRetry = require('p-retry');

/**
 * Util for running a job in the /jobs folder.
 * @constructor
 * @param {() => Promise<void>} script The script to be executed. MUST BE A PROMISE.
 */
const runScript = async script => {
  const res = await pRetry(script, {
    onFailedAttempt: error => {
      console.info(
        `Attempt ${error.attemptNumber} of ${script.name} failed. There are ${error.retriesLeft} retries left.\nError: ${error}`,
      );
    },
    retries: 5,
  });

  console.info(
    `${script.name} has finished 😎\nresponse: ${JSON.stringify(res, null, 2)}`,
  );

  return res;
};

module.exports = runScript;
