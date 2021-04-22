const path = require('path');
/**
 * Express Module
 */
const express = require('express');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const app = express();

const PORT = process.env.PORT || 5000;

/**
 * Discord.js Module
 */
const Discord = require('discord.js');
const client = new Discord.Client();

/**
 * Load Configuration file inside root folder
 */
const config = require('./config');

/**
 * Some Extra Variable to help / UTILS
 */
const api = require('./api');

let SetActivityTimer;
// Set Activity as described but loop it forever
let funcSetActivityTimer = () => {
    let rnd_status = [
        "...",
        "Pikachu I Choose You",
        "Let's play together!",
        "Custom Drop is coming",
        "Gotta Catch them all!",
        "WOW!",
        "Prepare for Battle!",
        "Make it doubles!",
        "Team Rocket is coming"
    ];
    client.user.setPresence({
        status: "online",
        activity: {
            type: "STREAMING",
            name : rnd_status[Math.floor(Math.random() * rnd_status.length)],
            url : "https://discord.gg/4vB2RU5E6Z"
        }
    })
};

/**
 * @ BEGIN DISCORD FUNCTION
 */
client.on('ready', () => {
    console.log('Logged in as', client.user.username);

    /**
     * CHANGE BOT APPEARANCE ON DISCORD
     * type : PLAYING,STREAMING,LISTENING,WATCHING,CUSTOM_STATUS,COMPETING
     */
    SetActivityTimer = setInterval(funcSetActivityTimer,10000);
})

client.on('message', (message) => {
    // Ignore personal message
    if (!message.guild) return;

    // Catch all message with ping
    if (message.content === ".ping") {
        // Using console.time() to get specific time
        // to run a function for internal debugging purposes
        console.time('ping function');

        // Send Pong with timestamp difference for ping purposes
        const timeTaken = Date.now() - message.createdTimestamp;
        message.channel.send(`Pong! , latency : ${timeTaken}ms`);
        console.log(message.author);
        message.channel.send(`User : ${ message.author }`);

        console.timeEnd('ping function');
    }
})

/**
 * @ BEGIN EXPRESS FUNCTION
 */
app
    .use(bodyParser.urlencoded({ extended: true }))
    .use(bodyParser.json())
    .use(express.static(path.join(__dirname, 'public')))

    .use(favicon(path.join(__dirname,'/public/favicon.png')))
    .set('views',path.join(__dirname,'views'))
    .set('view engine', 'ejs')

    .get('/', (req, res) => res.render('pages/index', { data : null }))
    .use('/api/', api)

    .listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
        // Start discord client here
        client.login(config.BOT_TOKEN);
        //client.destroy();
    });
