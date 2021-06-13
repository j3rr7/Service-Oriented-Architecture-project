const db = require('./database');

async function Middleware_APIKEY_FETCH( req, res, next ) {
    if (!req.header("x-api-key")) {
        return res.status(401).send({
            status  : res.statusCode,
            message : "Missing API-KEY"
        });
    }

    let connection = await db.connection();

    let query_user = await db.executeQuery(connection,
        `SELECT * FROM users WHERE apiKey = :apiKey`,
        { apiKey : req.header("x-api-key") });

    if (query_user.length < 1) {
        await db.release(connection);
        return res.status(404).json({ status : res.statusCode , message: "User Not Found" });
    }

    if ( parseInt(query_user[0].isbanned) === 1) {
        await db.release(connection);
        return res.status(403).json({ status : res.statusCode , message: "User Banned" });
    }

    await db.release(connection);
    req.USER_DATA = query_user[0];
    req.user = query_user[0];
    next();
}

module.exports = {
    FETCH_APIKEY : Middleware_APIKEY_FETCH,

};