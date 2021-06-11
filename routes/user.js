const router = require('express').Router();
const db = require('./database');
const middlewares = require('./middleware');

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
                pokemons : query
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
            message :"Pokemon Added"
        })
    }catch(ex){
        console.log(ex)
        return res.status(500).send("Error DB")
    }
    

});
router.delete('/customPokemon',middlewareSupporter, async (req,res)=>{ 

    let conn , query
    let id = req.body.id_pokemon

    conn = await db.connection();
    query = await db.executeQuery(conn,`select * from custom_pokemon where id_pokemon = ${id}`)
    if(query[0]!=null){
        query = await db.executeQuery(conn,`delete from custom_pokemon where id_pokemon = ${id}`); 
        return res.status(200).send("Pokemon deleted")
    }else{
        return res.status(404).send("Pokemon not found");
    }



});

module.exports = router