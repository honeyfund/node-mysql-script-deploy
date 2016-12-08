var async = require('async');

module.exports = function(db) {
    function obtainLock(lockCode, localIp, callback) {
        var sql = 'update DBDeploy_lock set lastLockedAt = now(), lockedWith = ?, lastLockedByIp = ? where lockedWith is null;';

        db.query(sql, [lockCode, localIp], function(err, result) {
            if (err) {
                return callback(err);
            }

            if (result.affectedRows === 0) {
                return callback(new Error('Unable to obtain lock'));
            }

            callback();
        });
    }

    function releaseLock(lockCode, callback) {
        var sql = 'update DBDeploy_lock set lockedWith = null where lockedWith = ?';
        db.query(sql, [lockCode], function(err, result) {
            if (err) {
                return callback(err);
            }

            if (result.affectedRows === 0) {
                return callback(new Error('Unable to release lock'));
            }

            callback();
        });
    }

    return {
        obtainLock: obtainLock,
        releaseLock: releaseLock
    };
};
