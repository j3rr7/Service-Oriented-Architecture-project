const express = require('express');
const router = express.Router();

const db = require('./database');
const middleware_APIKEY = require('./middleware');

const midtransClient = require('midtrans-client');

router.get('/test',(req,res)=>{
    return res.send("iki test")
})

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

router.post('/Unsubscribe', middleware_APIKEY, async (req,res) =>{
    let idUser      = req.body.userId;
    let tipe        = 0;

    let query_user = await db.executeQuery(connection,`SELECT * FROM users WHERE id = ${idUser}`);
    await db.release(connection);

    if(query_user.length){
        res.status(404).send({
            message :"User Not Found!"
        })
    }
    
    if(query_user[0].isbanned == 0){
        let query_update = await db.executeQuery(connection,`UPDATE users SET type = ${tipe} WHERE id = ${idUser}`);
        
        if (query_update.affectedRows === 0) {
            return res.status(400).json({ message: 'Terjadi kesalahan pada server'});
        }

        return res.status(201).json({ status : res.statusCode, message : "Unsubscribe Success!" });
    }else{
        return res.status(400).json({ status : res.statusCode, message : "User has been Banned!" });
    }
});

router.get('/subscription', middleware_APIKEY, async (req,res) =>{
    let idUser      = req.body.userId;
    let jenisSubs = "";

    let query_user = await db.executeQuery(connection,`SELECT * FROM users WHERE id = ${idUser}`);
    await db.release(connection);

    if(query_user.length){
        res.status(404).send({
            message :"User Not Found!"
        })
    }
    
    if(query_user[0].isbanned == 0){
        if(parseInt(query_user[0].type) == 0){
            jenisSubs  = "Reguler";
        }else if(parseInt(query_user[0].type) == 1){
            jenisSubs  = "Premium";
        }else if(parseInt(query_user[0].type) == 2){
            jenisSubs  = "Supporter";
        }
    
        return res.status(201).json({ status : res.statusCode, message : "You are a " + jenisSubs +" user!" });
    }else{
        return res.status(400).json({ status : res.statusCode, message : "User has been Banned!" });
    }
});

router.post('/subscription', middleware_APIKEY, async (req,res) =>{
    let userData =  req.USER_DATA;
    let buyPremorSupp = req.body.premsupp; // 1 for Premium , 2 For Support

    // let snap = new midtransClient.Snap({
    //     isProduction : false,
    //     serverKey : 'SB-Mid-server-lG_QG_wufiOJpP0_ht0Wn29i',
    //     clientKey : 'SB-Mid-client-Uc2OOrA47W4PE5zX'
    // });

    let harga;
 
    if(userData.type != 0){
        return res.status(400).json({ status : res.statusCode, message : "Already a Premium Account!" });
    }
    if(parseInt(buyPremorSupp) == 1)
    {
        parameter = 150000;    
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
        let query_update = await db.executeQuery(connection,`UPDATE users SET username = '${username}', phone = '${phone}' WHERE id = ${idUser}`);
        if (query_update.affectedRows === 0) {
            return res.status(400).json({ message: 'Terjadi kesalahan pada server'});
        }
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

// just for supporter 

// Get Super Custom Pokemon (GET) 
// Add Super Custom Pokemon (POST) 
// Remove Super Custom Pokemon (DELETE)

// just for suporter 
async function middlewareSupporter(req,res,next){


    if(req.session.currentUser == null){
        return res.status(403).send("Login First")
    }
    let user = req.session.currentUser.data
    if(user.type != 2){
        return res.status(403).send("Forbidden acces, only for supporter")
    }

    req.user = user;
    next()

   
   
}

var dummyUsers = {
    id :4,
    type :2
}
router.get('/customPokemon',middlewareSupporter, async (req,res)=>{ 

    let user = req.user

    try{
        let conn = await db.connection();
        let query = await db.executeQuery(conn,`select * from custom_pokemon where fk_users = ${user.id}`)
        if(query[0]==null){
            res.status(404).send({
                message :"No Supporter Custom Pokemon Found"
            })
        }else{
            res.status(200).send({
                pokemons : query,
                user:user
            })
        }
    }catch(ex){
        return res.status(500).send("Error DB")
    }

});
    
router.post('/customPokemon',middlewareSupporter, async (req,res)=>{ 
    let user = req.user;

    let input  = req.body;
    let nama = input.nama_pokemon
    let nature = input.nature 
    let base_attack  = input.base_attack
    let base_defend = input.base_defend
    let base_hp = input.base_hp 
    let fk_user = user.id //pengen e dapet dari session 
    let status = 2; // just for supporter


    let pokemon = {
        nama_pokemon :input.nama_pokemon,
        nature :input.nature,
        base_attack : input.base_attack,
        base_defend : input.base_defend,
        base_hp : input.base_hp,
        fk_users : fk_user,
        status :status
    }
    try{
        let conn = await db.connection();
        let query = await db.executeQuery(conn,`insert into custom_pokemon (
            nama_pokemon,
            nature,
            base_attack,
            base_defend,
            base_hp,
            fk_users,
            status
        )
        values(
            '${pokemon.nama_pokemon}',
            '${pokemon.nature}',
            ${pokemon.base_attack},
            ${pokemon.base_defend},
            ${pokemon.base_hp},
            ${pokemon.fk_users},
            ${pokemon.status}
        )`)
        res.status(201).send({
            message :"Pokemon Added",
            pokemon : pokemon
        })
    }catch(ex){
        console.log(ex)
        return res.status(500).send("Error DB")
    }
    

});
router.delete('/customPokemon',middlewareSupporter, async (req,res)=>{ 

    let conn , query
    let user  = req.user

    let id = req.body.id_pokemon
    if(!id){
        return res.status(400).send("id_pokemon null")
    }
    conn = await db.connection();
    query = await db.executeQuery(conn,`select * from custom_pokemon where id_pokemon = ${id}`)
    if(query[0]!=null){

        if(user.id  != query[0].fk_users){
            return res.status(400).send("Bukan pokemon anda")
        }

        query = await db.executeQuery(conn,`delete from custom_pokemon where id_pokemon = ${id}`); 
        return res.status(200).send("Pokemon deleted")
    }else{
        return res.status(404).send("Pokemon not found");
    }



});

module.exports = router