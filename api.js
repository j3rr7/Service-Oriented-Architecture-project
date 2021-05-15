const express = require('express');
const router = express.Router();

const db = require('./database');

// Works as ENUM in Visual Studio (workaround for js)
const ERROR_REASON = Object.freeze({
    MissingKeyError         : -1,
    InvalidKeyError         : 0,
    ExpiredKeyError         : 1,
    BillingNotEnabledError  : 2,
    ApiNotActivatedError    : 3,
    OverQuotaError          : 4
})

// ToDo : Seperate File for utils function (- maybe not needed)
function GenerateApiKey( length ) {
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.apply(0, Array(length)).map(function() {
        return (
            function(charset){
                return charset.charAt(Math.floor(Math.random() * charset.length))
            }(characters)
        );
    }).join('');
}

/*
<summary>
    MIDDLEWARE FOR FETCHING USER API-KEY FROM HEADER
    if there's no x-api-key found in header return JSON object contains status error and status message
    if x-api-key is found -> get user data based on provided x-api-key
</summary>
 */
async function Middleware_APIKEY_FETCH( req, res, next ) {
    // x-api-key is missing return error message
    if (!req.header("x-api-key")) {
        return res.status(401).send({
            status  : res.statusCode,
            //reason  : ERROR_REASON.MissingKeyError, /* OPTIONAL using enum to explain and show error message instead of hard coded string */
            message : "Missing API-KEY"
        });
    }
}

// Home page api route.
router.get('/', (req, res) => {
    res.status(403).send('API HOME PAGE');
});

// About page api route.
router.get('/about',  (req, res) => {
    res.status(403).send('API ABOUT PAGE');
});

// SIGN UP
router.post('/signup', async (req, res) => {
    let username    = req.body.username;
    let email       = req.body.email;
    let password    = req.body.password;
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
});

// SIGN IN
router.post('/signin', async (req, res) => {
    let email       = req.body.email;
    let password    = req.body.password;

    let connection = await db.connection();

    let query_user = await db.executeQuery(connection,
        `SELECT * FROM users WHERE email = :email`,
        { email : email });

    if (query_user.length < 1) {
        await db.release(connection);
        return res.status(404).json({ status : res.statusCode , message: "User Not Found" });
    }

    await db.release(connection);

    // ToDo Add Hashing
    if (query_user[0].password === password) {
        req.session.currentUser = {
            data : {
                id          : query_user[0].id,
                username    : query_user[0].username,
                email       : query_user[0].email,
                type        : query_user[0].type,
                apiKey      : query_user[0].apiKey,
                lastActive  : query_user[0].lastActive,
                isBanned    : query_user[0].isbanned,
                picture     : query_user[0].picture,
            }
        };
        return res.status(200).json({ status : 200 , message: "User Logged in", data : query_user[0].username });
    }

    return res.status(400).json({ status : 400 , message: "Wrong Password"});
});

// SIGN OUT
router.post('/signout', async (req, res) => {
    if (req.session.currentUser) {
        req.session.destroy();
        return res.status(200).json({ status : res.statusCode , message: "User Logged Out"});
    }
    return res.status(400).json({ status : res.statusCode , message: "User not signed in"});
});

// GET POKEMON
router.get('/pokemon', (req, res) => {

});

//#region BATTLE API
//region BATTLE API
/*
    BATTLE
    <summary>
        Each battle will be assigned unique battle id at first
        Each battle is unique to p1-pokemon vs p2-pokemon as it is 1vs1 pokemon battle
        User must pass API-KEY(header), p1-pokemon, p2-pokemon
        the function will take those API-KEY and compare that to system-generated API-KEY in database
        Each turn will be determined based on returned JSON object
        Battle will have its own status whether its ongoing, finished or dropped
    </summary>
 */

// start of battle, history battle will be recorded based on this
router.post('/battle', Middleware_APIKEY_FETCH, async (req, res) => {

})

//endregion
//#endregion

//#region MULTER API
//region MULTER API
/*
    MULTER SECTION
 */
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function(req,file,callback){
        callback(null,'./public/uploads');
    },
    filename: function(req,file,callback){
        const extension = file.originalname.split('.')[file.originalname.split('.').length-1];
        const filename = req.session.currentUser.data.id;
        callback(null,(filename+'.'+extension));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
        let fileext = file.originalname.split('.')[file.originalname.split('.').length-1];
        if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
            callback(null, true);
        } else {
            //callback(null, false);
            return callback(new Error('Upload Failed'));
        }
    }
});

router.post('/profile/upload', (req, res) => {
    if (!req.session.currentUser) {
        return res.status(403).send('Forbidden, Session not found');
    }

    let USER = req.session.currentUser.data

    // if user not free
    if (USER.type > 0) {

        upload.single('picture')(req, res, async (err) => {
            if (err) {
                return res.status(400).send({
                    status : res.statusCode,
                    message : err.message
                })
            }

            //ToDo Add update
            let connection = await db.connection()
            let query_update = await db.executeQuery(connection,
                `UPDATE users SET users.picture = :pic WHERE users.id = :id`,
                {
                    pic : req.file.filename,
                    id : USER.id
                }
            )

            return res.status(200).send({
                status : res.statusCode,
                message : "Upload Success"
            })
        })

    } else {
        return res.status(401).send('Subscription not found');
    }
})
//endregion
//#endregion

module.exports = router;