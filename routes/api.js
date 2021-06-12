const fs = require('fs');
const router = require('express').Router();
const axios = require('axios');
const db = require('./database');
const middlewares =  require('./middleware');
const utils = require('./utils');

/**
 * BEGIN API ROUTES
 */
// Home page api route.
router.get('/', (req, res) => {
    res.status(403).send('API HOME PAGE');
});

// About page api route.
router.get('/about',  (req, res) => {
    res.status(403).send('API ABOUT PAGE');
});

//#region ACCESS API
//region ACCESS API

// SIGN UP
router.post('/signup', async (req, res) => {
    let username    = req.body.username;
    let email       = req.body.email;
    let phone       = req.body.phone;
    let password    = req.body.password;
    let isNumPhone = /^\d+$/.test(phone);
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
        if (validateEmail(email) && isNumPhone) {
            let apiKey = utils.GenerateApiKey(32)
            let query_insert = await db.executeQuery(connection,
                `INSERT INTO users(username,password,email,phone,apiKey) VALUES(:username,:password,:email,:phone,:apiKey)`,
                { username : username, password : password, email : email, phone : phone, apiKey: apiKey })
            await db.release(connection);
            return res.status(201).json({ status : 201, message : "User registered",
                data: {
                    username : username,
                    email : email,
                    phone : phone,
                    apiKey: apiKey
                }
            });
        } else if( !validateEmail(email) && isNumPhone) {
            return res.status(400).json({ status : 400, message : "Email format is wrong" });
        } else if( validateEmail(email) && !isNumPhone) {
            return res.status(400).json({ status : 400, message : "Phone number format is wrong" });
        } else if( !validateEmail(email) && !isNumPhone) {
            return res.status(400).json({ status : 400, message : "Email and Phone Number format is wrong" });
        }
    } catch (err) {
        await db.release(connection);
        return res.status(400).json({ status : 400, message : "Something Wrong" });
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
    if (query_user[0].password === password) {
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
        return res.status(200).json({ 
            status : res.statusCode,
            message: "User Logged in",
            apiKey : query_user[0].apiKey
        });
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
//#endregion
//endregion

//#region BATTLE API
//region BATTLE API
/**
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

/**
 * <summary>
 * start of battle, history battle will be recorded based on this
 * p1 and p2 is a json object
 * param = api_key : string , p1 : JSON.Object , p2 : JSON.Object
 * p1/p2 JSON.Object consist of minimum { name:"name of pokemon", HP: "starting health point" }
 * </summary>
 */
router.post('/battle', middlewares.FETCH_APIKEY, async (req, res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;

    let connection = await db.connection();

    // this function generate battle id using the same connection above
    let generate_battle_id = async () => {
        let query_counter = await db.executeQuery(connection,`SELECT COUNT(*) + 1 as counter FROM battle_session`);
        return 'B' + (query_counter[0].counter).toString().padStart(5,'0');
    };

    // get first and second parameter, as its p1 and p2 in json format
    // im using encoded text to store in database, Note to self : don't forget to decode the json :p

    let p1 = req.body.p1;
    let p2 = req.body.p2;

    // first validate the minimum requirement for p1 and p2 (pokemon name and pokemon hp)
    // here example we're using try catch with JSON.parse
    try {
        p1 = JSON.parse(p1);
        p2 = JSON.parse(p2);
        // here we check if json provided contain HP and name as it's the minimal json { "name" : "example", "HP" : 10 }
        if (p1.HP === undefined || p1.name === undefined) { throw SyntaxError(); }
        if (p2.HP === undefined || p2.name === undefined) { throw SyntaxError(); }

        // we also check if HP provided is an integer or float
        // sadly here i use regex (maybe performance degradation)
        let isFloat = (str) => {
            return parseFloat(str.match(/^-?\d*(\.\d+)?$/))>0;
        }
        if (!isFloat(p1.HP.toString() ) || !isFloat(p2.HP.toString())) { throw SyntaxError(); }
    } catch(err){
        if (err instanceof SyntaxError) {
            await db.release(connection);
            return res.status(400).json({
                status : "Data Error! check your p1 or p2 syntax"
            });
        }
    }

    let battle_id = await generate_battle_id();

    let query_insert = await db.executeQuery(connection,
        `INSERT INTO battle_session(battle_id, user_id, p1, p2) VALUES ( :battle_id, :user_id, :p1, :p2 )`,
        { battle_id : battle_id , user_id : USER_DATA.id, p1 : JSON.stringify(p1) , p2 : JSON.stringify(p2) });

    await db.release(connection);
    return res.status(200).json({
        battle_id : battle_id,
        pokemon : { p1 : p1, p2 : p2 }
    });
})

/**
 * <summary>
 * Battle calculated using base attack and base defense w/ effect
 * param = battle_id, turn string : "p1"/"p2"
 * </summary>
 */
router.post('/battle/attack', middlewares.FETCH_APIKEY, async (req, res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;

    // Check battle_id inside body
    let battle_id = req.body.battle_id;
    if (!battle_id) {
        return res.status(400).json({ status : res.statusCode , message: "Battle id not provided"});
    }

    // Check param2 is it "p1/p2"
    let turn = req.body.turn;
    if (!turn) {
        return res.status(400).json({ status : res.statusCode , message: "turn not provided"});
    }
    if (turn.toString().toLowerCase() !== "p1" && turn.toString().toLowerCase() !== "p2") {
        return res.status(400).json({ status : res.statusCode , message: "Wrong turn string, please recheck"});
    }

    // get from database the battle_id
    let connection = await db.connection();
    let battle_query = await db.executeQuery(connection, `SELECT * FROM battle_session WHERE battle_id = '${battle_id}'`)

    // Check if battle id is found
    if (battle_query.length < 1) { // battle go bye bye~ :v
        await db.release(connection); // destroy the connection
        return res.status(404).json({ status : res.statusCode , message: "Battle id not found"});
    }

    // Store the battle data into a variable for easy access
    let battle_data = battle_query[0];

    // Check if user is authorized
    if (battle_data.user_id !== USER_DATA.id){
        await db.release(connection); // destroy the connection
        return res.status(401).json({ status : res.statusCode , message: "User Unauthorized"});
    }

    // Check if battle is not finished or dropped
    if ( parseInt(battle_data.status) !== 0) {
        await db.release(connection); // destroy the connection
        switch ( parseInt(battle_data.status)) {
            case 1:
                return res.status(200).json({ status : res.statusCode , message: "Battle is already finished"});
            case 2:
                return res.status(200).json({ status : res.statusCode , message: "Battle is Over"});
        }
    }

    let player_data = JSON.parse(battle_data[turn]); // { name : "PokemonX" , HP : (string/int) }
    let enemy_data = JSON.parse(battle_data[turn === "p1" ? "p2" : "p1"]);// if player "p1" enemy is "p2" and you get the point

    let randomRangeInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

        // Get Base Attack and Defend from pokemon provided
    try {
        let player_pokemon_data = (await axios.get(`https://pokeapi.co/api/v2/pokemon/${player_data.name}`)).data;
        let enemy_pokemon_data = (await axios.get(`https://pokeapi.co/api/v2/pokemon/${enemy_data.name}`)).data;

        //using some special damage calculation :'D using base level as 1, PS: -jere gtw wes sak isoku wae :')
        //console.log("atk:" + player_pokemon_data.stats[1].base_stat /*base atk*/)
        //console.log("def:" + enemy_pokemon_data.stats[2].base_stat /*enemy base def*/)
        let dmg_calc = ((((2 * 1 /*level*/ / 5 + 2) * player_pokemon_data.stats[1].base_stat * player_pokemon_data.stats[1].base_stat / enemy_pokemon_data.stats[2].base_stat) / 50) + 2) * randomRangeInt(85,100) / 100;
        let newEnemyData = (turn === "p1") ? battle_data.p2 : battle_data.p1;
        newEnemyData = JSON.parse(newEnemyData);
        newEnemyData.HP = newEnemyData.HP - Math.round(dmg_calc);

        let faint = false;
        //ToDo add 0 hp check here
        if (newEnemyData.HP < 0) {
            newEnemyData.HP = 0;
            faint = true;
        }

        let string_action = `${player_data.name} attack ${enemy_data.name} \n ${enemy_data.name} HP Now ${newEnemyData.HP}`;

        if (turn === "p1") {
            await db.executeQuery(connection,
                `UPDATE battle_session SET p2 = '${JSON.stringify(newEnemyData)}' WHERE battle_id = '${battle_id}'`)
        } else {
            await db.executeQuery(connection,
                `UPDATE battle_session SET p1 = '${JSON.stringify(newEnemyData)}' WHERE battle_id = '${battle_id}'`)
        }


        if (faint) {
            string_action += ` \n ${enemy_data.name} is fainted`
            string_action += ` \n ${player_data.name} win`

            await db.executeQuery(connection,
                `UPDATE battle_session SET status = 1 WHERE battle_id = '${battle_id}'`)
        }

        await db.executeQuery(connection,
            `INSERT INTO battle_record VALUES('${battle_id}','${string_action}')`)

        await db.release(connection); // destroy the connection
        return res.status(200).send({
            status : res.statusCode,
            battle_status : (faint) ? "finished":"ongoing",
            battle_id : battle_id,
            action : string_action
        });
    }
    catch (e) {
        await db.release(connection); // destroy the connection
        console.log(e);
        return res.send(e.message)
    }
})

// param = battle_id
router.post('/battle/history', middlewares.FETCH_APIKEY, async (req, res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;

    let battle_id = req.body.battle_id;
    if (!battle_id) {
        return res.status(400).json({ status : res.statusCode , message: "Battle id is missing"});
    }

    let connection = await db.connection();

    let battle_query = await db.executeQuery(connection, `SELECT * FROM battle_session WHERE battle_id = '${battle_id}'`)
    // Check if battle id is found
    if (battle_query.length < 1) { // battle go bye bye~ :v
        await db.release(connection); // destroy the connection
        return res.status(404).json({ status : res.statusCode , message: "Battle id not found"});
    }

    let battle_data_header = battle_query[0];
    let battle_data_detail = [];

    let battle_query_detail = await db.executeQuery(connection, `SELECT * FROM battle_record WHERE battle_id = '${battle_id}'`)

    for (let element of battle_query_detail){
        battle_data_detail.push(element.action);
    }

    await db.release(connection); // destroy the connection
    return res.status(200).json({
        battle_id : battle_id,
        history : battle_data_detail
    })
})

// param = battle_id, reason (optional) if not reason is "abruptly end"
router.post('/battle/end', middlewares.FETCH_APIKEY, async (req, res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;

    let battle_id = req.body.battle_id;
    if (!battle_id) {
        return res.status(400).json({ status : res.statusCode , message: "Battle id is missing"});
    }

    let connection = await db.connection();

    await db.executeQuery(connection,
        `UPDATE battle_session SET status = 1 WHERE battle_id = '${battle_id}'`)

    let string_action = "Battle Ended, ";

    if (req.body.reason) {
        string_action += req.body.reason;
    }
    else {
        string_action = "Battle abruptly ended";
    }

    await db.executeQuery(connection,
        `INSERT INTO battle_record VALUES('${battle_id}','${string_action}')`)

    await db.release(connection); // destroy the connection
    return res.status(200).json({
        status : res.statusCode,
        reason : string_action
    })
})

//endregion
//#endregion

//#region POKEMON API
//region POKEMON API

// param entries (id/name)
router.get('/pokemon/', async (req, res) => {
    let name = req.query.name 
    let id = req.query.id

    let queryPokemon 
    
    if(id != null){
        queryPokemon = `https://pokeapi.co/api/v2/pokemon/${id}`
    }else if(name != null){
        queryPokemon = `https://pokeapi.co/api/v2/pokemon/${name}`
    }else{
        queryPokemon = `https://pokeapi.co/api/v2/pokemon/`
        // select offset 20 
    }
    try {
        let pokemon_data = {}
        let resultPokemon = await axios(queryPokemon)
        pokemon_data = resultPokemon.data   
        return res.status(200).json(pokemon_data)
    } catch (e) {
        console.log(e.message);
        return res.status(500).json({ status : res.statusCode , message: "Something error" } );
    }
})

router.get('/pokemon/random', async (req, res) => {
    try{
        let random_id =  Math.floor(Math.random()*800 )+89;
        let queryPokemon = `https://pokeapi.co/api/v2/pokemon/${random_id}`
        let resultPokemon = await axios(queryPokemon)
        let pokemon_data = resultPokemon.data
        return res.status(200).json(pokemon_data)
    }catch(e){
        console.log(e.message);
        return res.status(500).json({ status : res.statusCode , message: "Something error" } );
    }
})

// get custom pokemon
router.post('/pokemon', async (req,res)=>{
    let conn = await  db.connection()
    let query = await db.executeQuery(conn,`SELECT * FROM custom_pokemon WHERE status = '1'`)
    await db.release(conn); // destroy the connection
    res.status(200).send(query)
})

// delete custom pokemon
router.delete('/pokemon', middlewares.FETCH_APIKEY, async (req,res)=>{
    // storing user data for later
    let USER_DATA = req.USER_DATA;

    let id = req.body.id
    let conn = await db.connection()
    let query = await db.executeQuery(conn,`SELECT * FROM custom_pokemon WHERE id_pokemon = '${id}'`)
    let pokemon = query[0]

    if (USER_DATA.type !== 1 && pokemon.fk_users !== USER_DATA.id){
        return res.status(401).json({
            status: res.statusCode,
            message: "User Unauthorized"
        })
    }

    if(pokemon == null){
        return res.status(404).send("Pokemon not found")
    }else{
        query = await db.executeQuery(conn,`DELETE FROM custom_pokemon WHERE id_pokemon = '${id}'`)

        await db.release(conn); // destroy the connection
        return res.status(200).json({
            message : 'deleted',
            pokemon :pokemon 
        })
    }
})


//endregion
//#endregion

//#region MULTER API
//region MULTER API
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function(req,file,callback){
        callback(null,'./public/uploads');
    },
    filename: function(req,file,callback){
        const extension = file.originalname.split('.')[file.originalname.split('.').length-1];
        let filename;
        if (!req.USER_DATA)
            filename = req.session.currentUser.data.id;
        else
            filename = req.USER_DATA.id;
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
//endregion
//#endregion

//#region USER API
//region USER API
router.post('/profile/upload', middlewares.FETCH_APIKEY, (req, res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;
    if (!USER_DATA){

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
                await db.release(connection);
                return res.status(200).send({
                    status : res.statusCode,
                    message : "Upload Success"
                })
            })

        } else {
            return res.status(401).send('Subscription not found');
        }
    }
    else {
        // if user not free
        if (USER_DATA.type > 0) {
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
                        id : USER_DATA.id
                    }
                )
                await db.release(connection);
                return res.status(200).send({
                    status : res.statusCode,
                    message : "Upload Success"
                })
            })

        } else {
            return res.status(401).send('Subscription not found');
        }
    }
})

router.put('/profile/update', middlewares.FETCH_APIKEY, async (req,res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;

    let username    = req.body.username;
    let phone       = req.body.phone;
    let idUser      = USER_DATA.id;
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
        await db.release(connection);
        return res.status(400).json({ status : 400, message : "Phone number format is wrong" });
    }
})

router.post('/Unsubscribe', middlewares.FETCH_APIKEY, async (req,res) =>{
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

router.get('/subscription', middlewares.FETCH_APIKEY, async (req,res) =>{
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

router.post('/subscription', middlewares.FETCH_APIKEY, async (req,res) =>{
    let userData =  req.USER_DATA;
    let buyPremorSupp = req.body.premsupp; // 1 for Premium , 2 For Support

    // let snap = new midtransClient.Snap({
    //     isProduction : false,
    //     serverKey : 'SB-Mid-server-lG_QG_wufiOJpP0_ht0Wn29i',
    //     clientKey : 'SB-Mid-client-Uc2OOrA47W4PE5zX'
    // });

    if(userData.type == 1){
        return res.status(400).json({ status : res.statusCode, message : "Already a Premium Account!" });
    }else if(userData.type == 2){
        return res.status(400).json({ status : res.statusCode, message : "Already a Supporter Account!" });
    }

    if(parseInt(buyPremorSupp) == 1)
    {
        let parameter = {
            cost : "Rp. 150.000,00",
            note : "You are now Premium user!"
        };
        let tipe = 1;

        let query_update = await db.executeQuery(connection,`UPDATE users SET type = ${tipe} WHERE id = ${userData.id}`);

        if (query_update.affectedRows === 0) {
            return res.status(400).json({ message: 'Terjadi kesalahan pada server'});
        }

        return res.status(201).json({ 
            status : res.statusCode, 
            message : "Subscription Payment Success!",
            data : parameter 
        });
    }
    else if(parseInt(buyPremorSupp) == 2)
    {
        let parameter = {
            cost : "Rp. 750.000,00",
            note : "You are now Supporter user!"
        };
        let tipe = 2;

        let query_update = await db.executeQuery(connection,`UPDATE users SET type = ${tipe} WHERE id = ${userData.id}`);

        if (query_update.affectedRows === 0) {
            return res.status(400).json({ message: 'Terjadi kesalahan pada server'});
        }

        return res.status(201).json({ 
            status : res.statusCode, 
            message : "Subscription Payment Success!",
            data : parameter
        });
    }
    else{
        return res.status(400).json({ status : res.statusCode, message : "Wrong Subscription Type Entry!" });
    }
});

//endregion
//#endregion

module.exports = router;