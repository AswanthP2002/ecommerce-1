const express = require('express')
const adminController = require('../controllers/admin/adminController.js')
const customerController = require('../controllers/admin/customerController.js')
const categoryController = require('../controllers/admin/categoryController.js')
const productController = require('../controllers/admin/productController.js')
const orderController = require('../controllers/admin/orderController.js')
const couponController = require('../controllers/admin/couponController.js')
const {userAuth, adminAuth} = require('../middlewares/auth.js')
const multer = require('multer')
const upload = require('../helpers/multer-helper.js')
// const upload = multer({storage:storage})
const router = express.Router()


// Admin login/logout management
router.get('/admin/login', adminController.loadLogin)
router.post('/admin/login', adminController.login)
router.get('/admin', adminAuth,adminController.loadDashborad)
router.get('/admin/pageError', adminController.pageNotFound)
router.get('/admin/logout', adminController.logout)

//Admin Customer Mangement
router.get('/admin/customers', adminAuth, customerController.customersInfo)
router.get('/admin/blockCustomer', adminAuth, customerController.blockCustomer)
router.get('/admin/unblockCustomer', adminAuth, customerController.unblockCustomer)

//Admin Category Management
router.get('/admin/category', adminAuth, categoryController.categoryInfo)
router.post('/admin/category', adminAuth, categoryController.addCategory)
router.post('/admin/categoryOffer/add', adminAuth, categoryController.addCategoryOffer)
router.post('/admin/categoryOffer/remove', adminAuth, categoryController.removeCategoryOffer)
router.get('/admin/category/unlist', adminAuth, categoryController.unlistCategory)
router.get('/admin/category/list', adminAuth, categoryController.listCategory)
router.get('/admin/category/edit', adminAuth, categoryController.fetcheditCategoryDetails)
router.post('/admin/category/edit', adminAuth, categoryController.editCategory)

//Admin Product Management
router.get('/admin/product', adminAuth, productController.loadProductPage)
router.get('/admin/product/details', adminAuth, productController.getProductDetails) //Re connected Admin Auth after fixing product details fetch problem
router.get('/admin/product/add', adminAuth, productController.addProductsPage)
router.post('/admin/product/add', adminAuth, upload.array('product_images', 3), productController.addProducts)
router.get('/admin/product/edit', adminAuth, productController.editProductPage)
router.post('/admin/product/edit', adminAuth, upload.fields([
    { name: 'product_images0', maxCount: 1 },
    { name: 'product_images1', maxCount: 1 },
    { name: 'product_images2', maxCount: 1 },
]), productController.editProduct)


router.post('/admin/product/addOffer', adminAuth, productController.addProductOffer)
router.post('/admin/product/removeOffer', adminAuth, productController.removeProductOffer)
router.get('/admin/product/unblock', adminAuth, productController.unblockProduct)
router.get('/admin/product/block', adminAuth, productController.blockProduct)


//Admin Order Management
router.get('/admin/orders', adminAuth, orderController.loadOrders)
router.post('/admin/orders/update', adminAuth, orderController.updateOrderStatus)
router.get('/admin/orders/view', adminAuth, orderController.viewOrders)


//Admin Coupon Management
router.get('/admin/coupons', adminAuth, couponController.loadCouponSection)
router.post('/admin/coupon/add', adminAuth, couponController.addCoupon)
router.post('/admin/coupon/remove', adminAuth, couponController.removeCoupon)
router.post('/admin/coupon/list', adminAuth, couponController.listCoupon)
router.post('/admin/coupon/unlist', adminAuth, couponController.unlistCoupon)


module.exports = router