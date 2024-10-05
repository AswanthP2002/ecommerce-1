const express = require('express')
const userController = require('../controllers/user/userController.js')
const router = express.Router()

//route to the home page for users

router.get('/', userController.loadUserHome)
router.get('/pageNotFound', userController.pageNotFound)


module.exports = router