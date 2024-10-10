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

module.exports = router