const express = require('express');
const router = express.Router();

const db = require('./database');
const middleware_APIKEY = require('./middleware');

const midtransClient = require('midtrans-client');
// Create Snap API instance

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

router.post('/subscription', middleware_APIKEY, async (req,res) =>{
    let userData =  req.USER_DATA;
    let buyPremorSupp = req.body.premsupp; // 1 for Premium , 2 For Support

    let snap = new midtransClient.Snap({
        isProduction : false,
        serverKey : 'SB-Mid-server-lG_QG_wufiOJpP0_ht0Wn29i',
        clientKey : 'SB-Mid-client-Uc2OOrA47W4PE5zX'
    });

    let parameter;
 
    if(userData.type != 0){
        return res.status(400).json({ status : res.statusCode, message : "Already a Premium Account!" });
    }
    if(parseInt(buyPremorSupp) == 1)
    {
        parameter = {
            "transaction_details": {
                "order_id": "test-transaction-123",
                "gross_amount": 150000
            }, "credit_card":{
                "secure" : true
            }
        };    
    }
    else if(parseInt(buyPremorSupp) == 2)
    {
        parameter = {
            "transaction_details": {
                "order_id": "test-transaction-123",
                "gross_amount": 750000
            }, "credit_card":{
                "secure" : true
            }
        };    
    }
    else{
        return res.status(400).json({ status : res.statusCode, message : "Wrong Subscription Type Entry!" });
    }

   
    snap.createTransaction(parameter)
        .then((transaction)=>{
            // transaction token
            let transactionToken = transaction.token;
            console.log('transactiondetail:',transaction);
            console.log('transactionToken:',transactionToken);

            // transaction redirect url
            let transactionRedirectUrl = transaction.redirect_url;
            console.log('transactionRedirectUrl:',transactionRedirectUrl);
        })
        .catch((e)=>{
            console.log('Error occured:',e.message);
        });
});

router.post('/updateProfile', async (req,res) => {
    let username    = req.body.username;
    let phone       = req.body.phone;
    let idUser      = req.body.userId;
    let isNumPhone = /^\d+$/.test(phone);
    
    let connection = await db.connection();

    if (isNumPhone) {
        // ToDo Add Hashing
        let query_insert = await db.executeQuery(connection,`UPDATE users SET username = '${username}', phone = '${phone}' WHERE id = ${idUser}`);

        if (req.session.currentUser) {
            req.session.destroy();
        }

        let query_user = await db.executeQuery(connection,`SELECT * FROM users WHERE id = ${idUser}`);
        await db.release(connection);
        req.session.currentUser = {
            data : {
                id          : query_user[0].id,
                username    : query_user[0].username,
                email       : query_user[0].email,
                phone       : query_user[0].phone,
                type        : query_user[0].type,
                apiKey      : query_user[0].apiKey,
                lastActive  : query_user[0].lastActive,
                isBanned    : query_user[0].isbanned,
                picture     : query_user[0].picture,
            }
        };
        return res.status(201).json({ status : 201, message : "User Profile Updated" });
    } else {
        return res.status(400).json({ status : 400, message : "Phone number format is wrong" });
    }
})

module.exports = router