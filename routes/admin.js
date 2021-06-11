const router = require('express').Router();
const db = require('./database');

var conn , query;

// Home page user route.

//admin/users
router.get('/users',async  (req, res) => {
    // res.status(403).send('ADmin HOme Page');

    let username = req.query.username 
    let id = req.query.id


    

    if(id){
        conn = await db.connection()
        query = await db.executeQuery(conn,
            `select * from users where id = ${id}`)
        await conn.release();
        res.status(200).send(query)
    }else if (username){
        conn = await db.connection()
        query = await db.executeQuery(conn,
            `select * from users where username like '%${username}%'`)
        await conn.release();
        res.status(200).send(query)
    }else{ //selectall
        conn = await db.connection()    
        query = await db.executeQuery(conn,
            `select * from users`)
        await conn.release();
        res.status(200).send(query)
    }

})

router.put('/ban',async(req,res)=>{
    let id = req.body.id
    // res.status(200).send("masok");
    if(id){
        conn = await  db.connection()
        query = await db.executeQuery(conn,`select * from users where id ='${id}' `)
        let user = query[0];
        if(user == null){
            return res.status(404).send("user tidak ditemukan");
        }

        if(user.isbanned == 0){
            query = await db.executeQuery(conn,`update users set isbanned = 1 where id = ${id}`)
            res.status(200).json({
                nama : user.username,
                email : user.email,
            })
        }else{
            query = await db.executeQuery(conn,`update users set isbanned = 0 where id = ${id}`)
            res.status(200).json({
                nama : user.username,
                email : user.email
            })
        }
    }
    res.status(400).send("id tidak ditemukan ditemukan")
})

router.put('/unban',async(req,res)=>{
    let id = req.body.id
    if(id){
        conn = await  db.connection()
        query = await db.executeQuery(conn,`select * from users where id ='${id}' `)
        let user = query[0];
        if(user == null){
            return res.status(404).send("user tidak ditemukan");
        }else if (user.isbanned == 0){
            return res.status(400).send("user sudah di unban")
        }

        query = await db.executeQuery(conn,`update users set isbanned = 0 where id = ${id}`)
        res.status(200).json({
            nama : user.username,
            email : user.email
        })
    }
    res.status(400).send("id tidak ditemukan")
})


router.get('/search',async (req,res)=>{
    
})

module.exports = router