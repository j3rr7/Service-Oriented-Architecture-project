const express = require('express');
const router = express.Router();
const db = require('./database');

var conn , query;


// Home page user route.
router.get('/users',async  (req, res) => {
    // res.status(403).send('ADmin HOme Page');

    conn = await db.connection()
    query = await db.executeQuery(conn,`select * from users`)
    await db.release();
    res.status(200).send(query)


})

router.put('/ban',async(req,res)=>{
    let id = req.body.id
    if(id){
        conn = await  db.connection()
        query = await db.executeQuery(conn,`select * from users where id ='${id}' `)
        let user = query[0];
        if(user == null){
            return res.status(404).send("user tidak ditemukan");
        }else if (user.isbanned == 1){
            return res.status(400).send("user sudah di ban")
        }

        query = await db.executeQuery(conn,`update users set isbanned = 1 where id = ${id}`)
        res.status(200).json({
            nama : user.username,
            email : user.email
        })
    }
    res.status(400).send("id tidka ditemukan")
})


module.exports = router