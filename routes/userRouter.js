const express = require('express')
const userController = require('../controllers/user/userController.js')
const {userAuth} = require('../middlewares/auth.js')
const passport = require('passport')
const router = express.Router()

//route to the home page for users

//Home/product page managment
router.get('/', userController.loadUserHome)
router.get('/search', userController.searchProducts)
router.get('/products', userController.productListPage)
router.get('/products/product_details', userController.productDetails)
router.get('/cart', userAuth, userController.loadCartPage)
router.post('/cart/add', userAuth, userController.addToCart)
router.post('/cart/quantity/update', userAuth, userController.cartQuantityUpdate)
router.post('/cart/remove', userAuth, userController.removeFromCart)
router.post('/checkout', userAuth, userController.proceedToCheckout)
router.get('/checkout', userAuth, userController.loadChekoutPge)
router.post('/payment', userAuth, userController.paymentConfirm)
router.post('/order/proceed', userAuth, userController.placeOrder)


//Signup management
router.get('/user_signup', userController.loadSignupPage)
router.post('/user_signup', userController.signup)
router.post('/otp-verify', userController.verifyOtp)
router.post('/resend-otp', userController.resendOtp)
router.get('/pageNotFound', userController.pageNotFound)
router.get('/auth/google', passport.authenticate('google', {scope:['profile','email']}))
router.get('/auth/google/callback', passport.authenticate('google', {failureRedirect:'/user_login', failureFlash:true}), (req, res) => {
    res.redirect('/')
})

//user profile management
router.get('/profile', userAuth, userController.loadUserProfile)
router.post('/profile/address/add', userAuth, userController.userAddressAdd)
router.post('/profile/address/delete', userAuth, userController.userAddressDelete)
router.get('/profile/address/edit', userAuth, userController.fetchEditDetails)
router.post('/profile/address/edit', userAuth, userController.userAddressEdit)


//login management
router.get('/user_login', userController.loadLogin)
router.post('/user_login', userController.login)
router.get('/user_logout', userController.logout)

module.exports = router