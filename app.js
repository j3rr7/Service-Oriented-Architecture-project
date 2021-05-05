const path = require('path');
/**
 * Express Module
 */
const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const session = require('express-session');
const app = express();

const PORT = process.env.PORT || 5000;

/**
 * Bot Module
 */
const bot = require('./bot');

/**
 * Load Configuration file inside root folder
 */
const config = require('./config');

/**
 * Some Extra Variable to help / UTILS
 */
const api = require('./api');
const user = require('./user');
const admin = require('./admin');

/**
 * @ BEGIN EXPRESS FUNCTION
 */
app
    .use(session({ secret: config.App_ID || process.env.App_ID, resave: false, saveUninitialized: true, cookie: { maxAge: 1000 * 60 } }))
    .use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json())
    .use(express.static(path.join(__dirname, 'public')))

    .use(favicon(path.join(__dirname,'/public/favicon.png')))
    .set('views',path.join(__dirname,'views'))
    .set('view engine', 'ejs')

    .get('/', (req, res) => {
        if (req.session.currentUser) { return res.redirect('/users') } // if session is found redirect to page user
        res.render('pages/index', { data : null })
    })
    .use('/api/', api)
    .use('/users/', user)
    .use('/admin/',admin)

    .listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
        // Start discord client here
        // bot.login(config.BOT_TOKEN);
        // bot.destroy();
    });