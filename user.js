const express = require('express');
const router = express.Router();

const db = require('./database');

// Home page user route.
router.get('/',  async (req, res) => {
    res.setHeader('Content-Type', 'text/html')
    if (req.session.currentUser) {

        // GET USER DATA FROM DATABASE
        /*
        let connection = await db.connection();
        let query_user = await db.executeQuery(connection,
            `SELECT * FROM users WHERE users.id = :id`,
            { id : req.session.currentUser.data.id });
        await db.release(connection);
         */

        if ( req.session.currentUser.data.type === -1 ) {

            res.render("pages/admin-page", { user : req.session.currentUser.data })

        } else {

            // RENDER USER PAGE , with user params as identifier
            res.render("pages/user-page", { user : req.session.currentUser.data })
            //res.write('<p>expires in: ' + (req.session.cookie.maxAge / 1000) + 's</p>')
            //res.end('user signed in')

        }
    } else {
        res.redirect('../')
    }
})

router.post('/updateProfile', async (req,res) => {
    let username    = req.body.username;
    let email       = req.body.email;
    
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

    let validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    try {

        if (validateEmail(email)) {
            // ToDo Add Hashing
            let query_insert = await db.executeQuery(connection,
                `INSERT INTO users(username,password,email,apiKey) VALUES(:username,:password,:email,:apiKey)`,
                { username : username, password : password, email : email, apiKey: GenerateApiKey(32) })

            return res.status(201).json({ status : 201, message : "User registered" });
        } else {
            return res.status(400).json({ status : 400, message : "Email format is wrong" });
        }

    } catch (err) {
        return res.status(400).json({ status : 400, message : "Something Wrong" });
    }
    finally {
        await db.release(connection);
    }
})

module.exports = router