const express = require('express')
const env = require('dotenv').config()
const db = require('./config/db.js')
const handlebars = require('handlebars')
const {engine} = require('express-handlebars')
const userRouter = require('./routes/userRouter.js')
const path = require('path')

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname, 'public')))

//seting the view engines
app.engine('hbs', engine({
    extname:'hbs',
    layoutsDir:path.join(__dirname, 'views', 'layouts'),
    partialsDir:[
        path.join(__dirname, 'views', 'partials', 'admin'), //admin partils
        path.join(__dirname, 'views', 'partials', 'user') //user partials
    ]
}))

app.set('view engine', 'hbs')


//routes
app.use('/', userRouter)

app.listen(process.env.PORT, (err) => {
    if(!err){
        console.log(`Server connected to port ${process.env.PORT}`)
    }
})

module.exports = app