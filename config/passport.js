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
            if(user){
                return callback(null, user)
            }else{
                const user = new User({
                    name:profile.displayName,
                    email:profile.emails[0].value,
                    googleId:profile.id
                })
                await user.save()
                return callback(null, user)
            }
        } catch (error) {
            return callback(error, null)
        }
    }
))

passport.serializeUser((user, cb) => {
    cb(null, user.id)
})
passport.deserializeUser((id, cb) => {
    User.findById(id)
        .then((user) => {
            cb(null, user)
        })
        .catch((error) => {
            cb(error, null)
        })
})

module.exports = passport