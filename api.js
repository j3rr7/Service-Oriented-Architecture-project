const express = require('express');
const router = express.Router();
const fs = require('fs');
const axios = require('axios');
const db = require('./database');

// Works as ENUM in Visual Studio (workaround for js) -jere
const ERROR_REASON = Object.freeze({
    MissingKeyError         : -1,
    InvalidKeyError         : 0,
    ExpiredKeyError         : 1,
    BillingNotEnabledError  : 2,
    ApiNotActivatedError    : 3,
    OverQuotaError          : 4
});

/*
<summary>
    Utility function to randomized string as "api-key"
    Basically creating array contains randomized letter and join that letter together
    PS : Note for self = learn more javascript :v i prefer how python this this in single line -jere
</summary>
 */
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
    data stored on ** req.USER_DATA **
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

    // Get User Data from API-Key
    let connection = await db.connection();

    let query_user = await db.executeQuery(connection,
        `SELECT * FROM users WHERE apiKey = :apiKey`,
        { apiKey : req.header("x-api-key") });

    // Hmm why i add this ... ? :V idk bored maybe :'v
    if (query_user.length < 1) {
        await db.release(connection);
        return res.status(404).json({ status : res.statusCode , message: "User Not Found" });
    }

    // Banned User .... why? idk :v
    if ( parseInt(query_user[0].isbanned) === 1) {
        await db.release(connection);
        return res.status(403).json({ status : res.statusCode , message: "User Banned" });
    }

    // ToDo Api Hit Here (?) @Marvel -jere

    // release connection and store user data to ** req.USER_DATA **
    await db.release(connection);
    req.USER_DATA = query_user[0];
    next();
}

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
            // ToDo Add Hashing
            let query_insert = await db.executeQuery(connection,
                `INSERT INTO users(username,password,email,phone,apiKey) VALUES(:username,:password,:email,:phone,:apiKey)`,
                { username : username, password : password, email : email, phone : phone, apiKey: GenerateApiKey(32) })

            return res.status(201).json({ status : 201, message : "User registered" });
        } else if( !validateEmail(email) && isNumPhone){
            return res.status(400).json({ status : 400, message : "Email format is wrong" });
        } else if( validateEmail(email) && !isNumPhone){
            return res.status(400).json({ status : 400, message : "Phone number format is wrong" });
        } else if( !validateEmail(email) && !isNumPhone){
            return res.status(400).json({ status : 400, message : "Email and Phone Number format is wrong" });
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
                phone       : query_user[0].phone,
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
//#endregion
//endregion

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
// ToDo : - Add API hit to database

// start of battle, history battle will be recorded based on this
// p1 and p2 is a json object
// param = api_key : string , p1 : JSON.Object , p2 : JSON.Object
// p1/p2 JSON.Object consist of minimum { name:"name of pokemon", HP: "starting health point" }
router.post('/battle', Middleware_APIKEY_FETCH, async (req, res) => {
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

// param = battle_id, turn string : "p1"/"p2" , move_id <- from poke-api
router.post('/battle/attack', Middleware_APIKEY_FETCH, async (req, res) => {
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

    //

    let player_data = JSON.parse(battle_data[turn]); // { name : "PokemonX" , HP : (string/int) }

    // Check move_id
        // first we get all the move on pokeapi using pokemon-name as references
    try {
        let pokemon_data = (await axios.get(`https://pokeapi.co/api/v2/pokemon/${player_data.name}`)).data;

    }
    catch (e) {
        
    }

    // ToDo : ALL OF MEEEEE LOVE ALLLL OF YOUUUU ~ <3 - jere :'v PS: my code is stupid but easly debuggable -someone anonymous


})

// param = battle_id
router.post('/battle/history', Middleware_APIKEY_FETCH, async (req, res) => {
    // storing user data for later
    let USER_DATA = req.USER_DATA;
})

// param = battle_id
router.post('/battle/end', Middleware_APIKEY_FETCH, async (req, res) => {

})

//endregion
//#endregion

//#region POKEMON API
//region POKEMON API

let CachePokemonData = async () => {
    let pokemon_data_from_url = (await axios.get('https://pokeapi.co/api/v2/pokemon?offset=0&limit=100')).data;
    let stream = fs.createWriteStream("pokemon_data.json", {flags:'a'});
    let data = []
    for (let elem of pokemon_data_from_url.results) { data.push(elem); }
    while(pokemon_data_from_url.next !== null) {
        pokemon_data_from_url = (await axios.get(pokemon_data_from_url.next)).data;
        for (let elem of pokemon_data_from_url.results) { data.push(elem); }
    }
    stream.write(JSON.stringify(data,null,4));
    stream.end();
    console.log("POKEMON CACHED");
}

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

// add custom pokemon
router.post('/pokemon',async (req,res)=>{
    // return res.send('add custom pokemon')
    let input = req.body 


    

    let conn = await  db.connection() 
    let query = await db.executeQuery(conn,`select * 
     from custom_pokemon`)
     let kode= query
    // let kode = (query[0].id).remove('C','');
    // kode = parseInt(kode)

    res.status(200).send(kode)



})
// delete custom pokemon
router.delete('/pokemon',async (req,res)=>{

    let id = req.body.id
    let conn = await db.connection()
    let query = await db.executeQuery(conn,`select * from custom_pokemon where id_custom_pokemon = '${$id}'`)
    let pokemon = query[0]
    if(pokemon == null){
        res.status(404).send("Pokemon not found")
    }else{
        query = await db.executeQuery(conn,`delete from custom_pokemon where    id_custom_pokemon  = '${id}'`)
        conn.release()
        
        res.status(200).json({
            message : 'deleted',
            pokemon :pokemon 
        })

    }
    
    return res.send('delete custom pokemon')

})


//endregion
//#endregion

//#region MULTER API
//region MULTER API
/*
    MULTER SECTION
 */
const multer = require('multer');
const e = require('express');
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