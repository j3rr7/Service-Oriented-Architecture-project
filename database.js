const mysql = require('mysql');

/**
 * Load Configuration file inside root folder
 */
//const config = require('./config');

const dbConfig  = {
    /*connectionLimit : 10,waitForConnections: true,*/
    host            : process.env.SQL_HOST || 'remotemysql.com',
    user            : process.env.SQL_USER || 'TUxTDR4n15',
    password        : process.env.SQL_PASS || 'dC9HKc80v1',
    database        : process.env.SQL_DB   || 'TUxTDR4n15',
    port            : 3306
};

const pool = mysql.createPool(dbConfig);
const connection = () => {
    try {

        return new Promise((resolve, reject) => {
            pool.getConnection( (err, conn) => {
                if (err) { reject(err); }
                //console.log(`MYSQL pool connected: threadId=${ conn.threadId }`);

                conn.config.queryFormat = function (query, values) {
                    if (!values) return query;
                    return query.replace(/\:(\w+)/g, function (txt, key) {
                        if (values.hasOwnProperty(key)) {
                            return this.escape(values[key]);
                        }
                        return txt;
                    }.bind(this));
                };

                resolve(conn);
            })
        })

    } catch(err){
        console.log(err);
    }
}
const executeQuery = (conn, queryString, params = {}) => {
    try {

        return new Promise((resolve, reject) => {
            conn.query(queryString, params, (err, res) => {
                if (err) { reject(err); }
                resolve(res);
            })
        })

    } catch(err){
        console.log(err);
    }
}

const release = (conn) => {
    try {

        return new Promise((resolve, reject) => {
            //console.log("MySQL pool destroyed: threadId " + conn.threadId);
            // resolve(connection.release());
            resolve(conn.destroy());
        });

    } catch (err){
        console.log(err);
    }
}

module.exports = {
    connection,
    executeQuery,
    release
}