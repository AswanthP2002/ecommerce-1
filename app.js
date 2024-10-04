const express = require('express')
const env = require('dotenv').config()
const db = require('./config/db.js')
const app = express()


app.listen(process.env.PORT, (err) => {
    if(!err){
        console.log(`Server connected to port ${process.env.PORT}`)
    }
})

module.exports = app