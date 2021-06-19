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
 * Load Configuration file inside root folder
 */
const config = require('./config');

/**
 * Some Extra Variable to help / UTILS
 */
const api = require('./routes/api');
const user = require('./routes/user');
const admin = require('./routes/admin');

/**
 * Attempt to cache pokemon stats from rapidAPI
 */
let CachePokemonData = () => {
    let fs = require('fs');
    let axios = require('axios');
    let options = {
        method: 'GET',
        url: 'https://pokemon-go1.p.rapidapi.com/pokemon_stats.json',
        headers: {
            'x-rapidapi-key': 'c3da140abamsh49ffb2e98f067d7p14bb56jsn157f3859ac67',
            'x-rapidapi-host': 'pokemon-go1.p.rapidapi.com'
        }
    };
    axios.request(options).then(function (response) {
        fs.writeFile('pokemon_stats.json', response.data, function (err) {
            if (err) return console.log(err);
            console.info('Data Cached');
        });
    }).catch(function (error) {
        console.error(error);
    });
}

/**
 * @ MAIN FUNCTION
 */

app.get('/getAPI',function(req,res){
    let apiKey = utils.GenerateApiKey(32)
    return res.send(apiKey)
})



app
    .use(session({ secret: config.App_ID || process.env.App_ID, resave: false, saveUninitialized: true, cookie: { maxAge: 1000 * 60 * 60 } }))
    .use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json())
    .use(express.static(path.join(__dirname, 'public')))

    .use(favicon(path.join(__dirname,'/public/favicon.png')))
    .set('views',path.join(__dirname,'views'))
    .set('view engine', 'ejs')

    .get('/', (req, res) => {

        // req.session.currentUser = {
        //     data : {
        //         id          : 0,
        //         username    : '',
        //         email       : -1,
        //         type        : -1,
        //         apiKey      : '',
        //         lastActive  : '',
        //         isBanned    : '',
        //         picture     : ''
        //     }
        // };
        if (req.session.currentUser) { return res.redirect('/users') } // if session is found redirect to page user
        res.render('pages/index', { data : null })
    })

    /**
     * Routes
     */
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