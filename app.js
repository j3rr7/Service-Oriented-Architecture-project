const path = require('path');

/**
 * Modules
 */
const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const session = require('express-session');
const utils = require('./routes/utils');
const app = express();

const PORT = process.env.PORT || 5000;

/**
 * Some Extra Variable to help / UTILS
 */
const api = require('./routes/api');
const user = require('./routes/user');
const admin = require('./routes/admin');

/**
 * @ MAIN FUNCTION
 */

app.get('/getAPI',function(req,res){
    let apiKey = utils.GenerateApiKey(32)
    return res.send(apiKey)
})

app
    .use(session({ secret: "832197790984962048" || process.env.App_ID, resave: false, saveUninitialized: true, cookie: { maxAge: 1000 * 60 * 60 } }))
    .use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json())
    .use(express.static(path.join(__dirname, 'public')))

    .use(favicon(path.join(__dirname,'/public/favicon.png')))
    .set('views',path.join(__dirname,'views'))
    .set('view engine', 'ejs')

    /**
     * Routes
     */
    .get('/', (req, res) => {
        if (req.session.currentUser) { return res.redirect('/users') } // if session is found redirect to page user
        res.render('pages/index', { data : null })
    })
    .use('/api/', api)
    .use('/users/', user)
    .use('/admin',admin)

    /**
    * Error Handling
    * */
    .use((req, res, next) => {
        return res.status(404).json({error : 404, message: "Not Found"})
    })

    /**
     * Main Listener
     */
    .listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });