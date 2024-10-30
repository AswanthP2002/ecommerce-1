const passport = require('passport')
const googleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/userModel.js')
const env = require('dotenv').config()

passport.use(new googleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback'
    },
    async (accessTocken, refreshTocken, profile, callback) => {
        try {
            const user = await User.findOne({googleId:profile.id})
            if(user && !user.isBlocked){
                console.log('user found and user is not blocked', user)
                return callback(null, user)
            }else if(user && user.isBlocked){
                console.log('user found and user is blocked', user)
                callback(null, false, {message:'Your account has been temporarly blocked by the administrator'})
            }else{
                //check if the email is already in use!
                const userWithSameEmail = await User.findOne({email:profile.emails[0].value})
                if(userWithSameEmail){
                    console.log('User is already in this email')
                    return callback(null, false, {message:'Email is already in use'})
                }else{
                    console.log('no user in this email')
                    const user = new User({
                        name:profile.displayName,
                        email:profile.emails[0].value,
                        googleId:profile.id
                    })
                    await user.save()
                    return callback(null, user)
                }
                
            }
        } catch (error) {
            console.log('Error occured while google authentication ', error)
            return callback(error, null)
        }
    }
))

passport.serializeUser((user, cb) => {
    cb(null, user.id)
})
passport.deserializeUser((id, cb) => {
    User.findById(id).lean()
        .then((user) => {
            cb(null, user)
        })
        .catch((error) => {
            cb(error, null)
        })
})

module.exports = passport