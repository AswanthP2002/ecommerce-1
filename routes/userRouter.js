const express = require('express')
const userController = require('../controllers/user/userController.js')
const {userAuth} = require('../middlewares/auth.js')
const passport = require('passport')
const router = express.Router()

//route to the home page for users

//check uesr cart
router.use(async (req, res, next) => {
    const cartCount = await userController.countCartItems(req, res)
    console.log('request reached here || cart Count', cartCount)
    res.locals.cartCount = cartCount
    next()
})
//check user wishlist
router.use(async (req, res, next) => {
    const userWishlist = await userController.CheckWishlist(req, res)
    res.locals.userWishlist = userWishlist
    next()
})

//testing path
router.use((req, res, next) => {
    console.log('current requested path : ', req.path)
    next()
})

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
router.post('/checkout/apply-coupon', userController.applyCoupon)
router.post('/payment', userAuth, userController.paymentConfirm)
router.get('/order/payment/cancel', userAuth, userController.cancelOrderPayment)
router.get('/order/payment/failed', userAuth, userController.failedOrders)
router.post('/order/proceed', userAuth, userController.placeOrder)
router.post('/order/cancel', userAuth, userController.cancelOrder)
router.post('/order/return', userAuth, userController.returnRequest)
router.post('/wishlist/add', userAuth, userController.addToWishlist)
router.post('/wishlist/remove', userAuth, userController.removeFromWishlist)
router.get('/wishlist', userAuth, userController.getWishlist)


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
router.get('/orders', userAuth, userController.userOrders)
router.get('/order/details', userAuth, userController.userOrderDetails)
router.get('/download-invoice', userAuth, userController.downloadInvoice)
router.get('/my-wallet', userAuth, userController.getWallet)
router.get('/wallet/create', userAuth, userController.createWallet)
router.get('/coupons', userAuth, userController.getCoupons)
router.get('/referrals', userAuth, userController.loadReferralsPage)
router.get('/referral/url/generate', userAuth, userController.generateReferralLink)


//login management
router.get('/user_login', userController.loadLogin)
router.post('/user_login', userController.login)
router.get('/user_logout', userController.logout)
router.get('/password/reset-request', userController.loadPasswordresetRequestPage)
router.post('/password/reset-request', userController.sendPasswordResetLink)
router.get('/password/reset/:token', userController.loadPaswordResetPage)
router.post('/password/reset/:token', userController.updatePassword)

module.exports = router

