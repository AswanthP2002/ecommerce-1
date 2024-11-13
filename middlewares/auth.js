const User = require('../models/userModel.js')


//User Authentication Middleware

const userAuth = (req, res, next) => {
    if(req.session.user){
        User.findById(req.session.user)
            .then(data => {
                if(data && !data.isBlocked){
                    next()
                }else{
                    req.session.destroy(error => {
                        console.log('error occured while session destroying', error)
                        res.redirect('/pageNotFound')
                    })
                    res.redirect('/user_login')
                }
            })
            .catch(error => {
                console.log(`User Authentication Error ${error.message}`)
                res.status(500).send('Internal Server Error')
            })
    }else if(req.isAuthenticated()){
        console.log(req.user._id)
        User.findById(req.user._id)
            .then(data => {
                if(data && !data.isBlocked){
                    next()
                }else{
                    req.logout((err) => {
                        if(err){
                            console.log('logout Error (passport)', err)
                            res.redirect('/pageNotFound')
                        }
                    })
                    res.redirect('/user_login')
                }
            })
            .catch((error) => {
                console.log(`User Authentication Error ${error.message}`)
                res.status(500).send('Internal Server Error please try again after sometime')
            })

    }else{
        console.log('Currently there is no user, so redirected to user login')
        res.redirect('/user_login') //testing
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