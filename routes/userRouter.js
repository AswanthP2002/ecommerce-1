const express = require('express')
const userController = require('../controllers/userController.js')
const passport = require('passport')
const router = express.Router()

//route to the home page for users

//signup management
router.get('/', userController.loadUserHome)
router.get('/user_signup', userController.loadSignupPage)
router.post('/user_signup', userController.signup)
router.post('/otp-verify', userController.verifyOtp)
router.post('/resend-otp', userController.resendOtp)
router.get('/pageNotFound', userController.pageNotFound)
router.get('/auth/google', passport.authenticate('google', {scope:['profile','email']}))
router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect:'/user_signup'}), (req, res) => {
    res.redirect('/')
})


//login management
router.get('/user_login', userController.loadLogin)
router.post('/user_login', userController.login)
router.get('/user_logout', userController.logout)

module.exports = router