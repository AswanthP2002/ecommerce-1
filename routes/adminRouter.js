const express = require('express')
const adminController = require('../controllers/adminController.js')
const customerController = require('../controllers/customerController.js')
const categoryController = require('../controllers/categoryController.js')
const {userAuth, adminAuth} = require('../middlewares/auth.js')
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

module.exports = router