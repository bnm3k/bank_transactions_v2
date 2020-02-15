const db = require("../../lib/db");
const { debounceTx, logger } = require("./transferUtils");
const { insertTransfer } = require("./transferDAL");
const { validate } = require("./transferDetailsValidator");

const handleTransfer = (() => {
    const checkDBClientErrs = runSQL => client =>
        new Promise((resolve, reject) => {
            client.on("error", reject);
            runSQL(client)
                .then(resolve)
                .catch(reject)
                .finally(() => client.release());
        });

    //on errors resulting from transfer details eg insufficient balance
    //users are informed, otherwise, the error is thrown and either
    //handled by middleware or centrally
    const handleTransferErr = err => {
        if (!err.isTransferErr) throw err;
        logger.info({ transferError: err.transferErrCode });

        return Promise.resolve({ transferError: err.transferErrCode });
    };

    return details =>
        validate(details)
            .then(debounceTx)
            .then(db.getClient)
            .then(checkDBClientErrs(insertTransfer(details)))
            .catch(handleTransferErr);
})();

module.exports = { handleTransfer };
