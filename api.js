const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const db = require('./database');

// Home page route.
router.get('/', function (req, res) {
    res.status(403).send('API HOME PAGE');
})

// About page route.
router.get('/about', function (req, res) {
    res.status(403).send('API ABOUT PAGE');
})

// SIGN UP
router.post('/signup', async (req, res) => {
    let username    = req.body.username;
    let email       = req.body.email;
    let password    = req.body.password;

    if (!username.toString().includes("#")) {
        return res.status(400).json({ status : 400, message : "Please include tag ex. JereID#2525" });
    }

    let connection = await db.connection();

    let query_username = await db.executeQuery(connection,
        `SELECT COUNT(*) AS count FROM users WHERE username = :username`, { username : username });

    if (query_username[0].count > 0) {
        await db.release(connection);
        return res.status(400).json({ status : 400, message : "Username is already registered use another" });
    }

    let query_email = await db.executeQuery(connection,
        `SELECT COUNT(*) AS count FROM users WHERE email = :email`, { email : email });

    if (query_email[0].count > 0) {
        await db.release(connection);
        return res.status(400).json({ status : 400, message : "Email is already registered please use another email" });
    }

    try {
        let query_insert = await db.executeQuery(connection,
            `INSERT INTO users(username,password,email) VALUES(:username,:password,:email)`,
            { username : username, password : password, email : email })

        return res.status(201).json({ status : 201, message : "User registered" });
    } catch (err) {
        return res.status(400).json({ status : 400, message : "Something Wrong" });
    }
    finally {
        await db.release(connection);
    }
})

// SIGN IN
router.post('/signin', async (req, res) => {
    let username    = req.body.username;
    let connection = await db.connection();

    let query_user = await db.executeQuery(connection,
        `SELECT * FROM users WHERE username = :username`,
        { username : username })

    if (query_user.length < 1) {
        await db.release(connection);
        return res.status(404).json({ status : 404 , message: "User Not Found"})
    }

    await db.release(connection);
    return res.status(200).json({ status : 200 , message: "User Logged in", data : query_user[0].username })
})

module.exports = router;