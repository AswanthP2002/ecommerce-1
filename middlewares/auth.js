const User = require('../models/userModel.js')


//User Authentication Middleware

const userAuth = (req, res, next) => {
    if(req.session.user){
        User.findById(req.session.user)
            .then(data => {
                if(data && !data.isBlocked){
                    next()
                }else{
                    res.redirect('/user_login')
                }
            })
            .catch(error => {
                console.log(`User Authentication Error ${error.message}`)
                res.status(500).send('Internal Server Error')
            })
    }else{
        res.redirect('/user_login')
    }    
}


//Admin Authentication Middleware
const adminAuth = (req, res, next) => {
    User.findOne({isAdmin:true})
        .then(data => {
            if(data){
                //checking is the admin session is active 
                if(req.session.admin){
                    next()
                }else{
                    res.redirect('/admin/login')
                }
                
            }else{
                res.redirect('/admin/login')
            }
        })
        .catch(error => {
            console.log('Admin Authentication Error', error.messageq)
            res.status(500).res.send('Internal Server Error')
        })
}

module.exports = {
    userAuth,
    adminAuth
}