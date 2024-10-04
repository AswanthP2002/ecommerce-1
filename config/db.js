const mongoose = require('mongoose')
const env = require('dotenv').config()

const db = mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Database connected successfully')
    })
    .catch((err) => {
        console.log(err.message)
    })

module.exports = db