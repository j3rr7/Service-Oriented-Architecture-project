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
        query = await db.executeQuery(conn,`select * from users`)
        res.status(200).send("success ban")
    }
    res.status(400).send("bad request")
})


module.exports = router