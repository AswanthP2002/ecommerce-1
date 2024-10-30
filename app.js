const express = require('express')
const env = require('dotenv').config()
const db = require('./config/db.js')
const handlebars = require('handlebars')
const {engine} = require('express-handlebars')
const session = require('express-session')
const nocache = require('nocache')
const flash = require('express-flash')
const passport = require('./config/passport.js')
const userRouter = require('./routes/userRouter.js')
const adminRouter = require('./routes/adminRouter.js')
const userController = require('./controllers/user/userController.js')
const path = require('path')
require('./helpers/handlebar-helpers.js')

const app = express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:75 * 60 * 60 * 1000
    }
}))
app.use(nocache())
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())

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
//seting a middleware for making user name available for all pages
app.use((req, res, next) => {
    if(req.user){
        console.log('req.user object', req.user)
        res.locals.logedUser = {id:req.user._id, name:req.user.name}
    }else if(req.session.user){
        console.log('traditional user object', req.session.user)
        res.locals.logedUser = {id:req.session.user, name:req.session.userName}
    }else{
        res.locals.logedUser = null
    }
    next()
})
app.use((req, res, next) => {
    res.locals.flashMessage = req.flash('error')
    next()
})
//routes
app.use('/', userRouter)
app.use('/', adminRouter)
app.use('/test-path', (req, res) => {
    res.render('admin/category', {
        layout:'admin/main'
    })
})


app.listen(process.env.PORT, (err) => {
    if(!err){
        console.log(`Server connected to port ${process.env.PORT}`)
    }
})

module.exports = app