const express = require('express');
const router = express.Router();

const db = require('./database');

// Home page user route.
router.get('/',  (req, res) => {
    //res.status(403).send('USER HOME PAGE');
    res.setHeader('Content-Type', 'text/html')
    if (req.session.currentUser) {
        res.render("pages/user-page", { data : null })
        //res.write('<p>expires in: ' + (req.session.cookie.maxAge / 1000) + 's</p>')
        //res.end('user signed in')
    } else {
        res.redirect('../')
    }
})

module.exports = router