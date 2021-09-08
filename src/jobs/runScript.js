const pRetry = require('p-retry');

const retries = 1;
/**
 * Util for running a job in the /jobs folder.
 * @constructor
 * @param {() => Promise<void>} script The script to be executed. MUST BE A PROMISE.
 */
const runScript = async script =>
  pRetry(script, {
    onFailedAttempt: error => {
      console.info(
        `Attempt ${error.attemptNumber} of ${script.name} failed. There are ${error.retriesLeft} retries left.\nError: ${error}`,
      );
    },
    retries,
  })
    .then(response => {
      console.info(
        `${script.name} has finished 😎\nresponse: ${JSON.stringify(
          response,
          null,
          2,
        )}`,
      );

      return {
        success: true,
        response,
      };
    })
    .catch(error => {
      if (error.retriesLeft === 0) {
        console.info(
          `Unable to execute ${script.name}😞\nerror: ${JSON.stringify(
            error,
            null,
            2,
          )}`,
        );
        return {
          success: false,
          error,
        };
      }
    });

module.exports = runScript;
