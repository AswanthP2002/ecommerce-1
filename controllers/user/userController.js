const express = require('express')
const fs = require('fs')
const nodeMailer = require('nodemailer')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const env = require('dotenv').config()
const {v4:uuidv4} = require('uuid')
const Razorpay = require('razorpay')
const puppeteer = require('puppeteer')
const handlebars = require('handlebars')
const moment = require('moment')
const User = require('../../models/userModel.js')
const Product = require('../../models/productModel.js')
const {ServiceReview, ProductReview} = require('../../models/reviewModel.js')
const Variant = require('../../models/variantModel.js')
const Adress = require('../../models/addressModel.js')
const Cart = require('../../models/cartModel.js')
const { default: mongoose, STATES } = require('mongoose')
const Order = require('../../models/ordersModel.js')
const Category = require('../../models/categoryModel.js')
const Wishlist = require('../../models/wishlistModel.js')
const Coupon = require('../../models/couponModel.js')
const Wallet = require('../../models/walletModel.js')
const Banner = require('../../models/bannerModel.js')

const secret = process.env.JWT_SECRET
const razorpayInstance = new Razorpay({
    key_id:process.env.RAZORPAY_KEY_ID,
    key_secret:process.env.RAZORPAY_KEY_SECRET
})

//non-route functions ===> generate OTP
const generateOTP = () => {
    let otp = ""
    for(let i = 1; i <= 6; i++){
        otp += Math.floor(Math.random() * 10)
    }
    console.log(`otp before returning ${otp}`)
    return otp
}
const generateInvoiceNumber = () => {
    let invoice = 'SPY-IV'
    for(let i = 1; i <= 8; i++){
        let rand = Math.ceil(Math.random() * 10)
        invoice += rand.toString()
    }
}

const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US')
}

const generateTocken = (userId) => {
    const token = jwt.sign({id:userId}, secret, {expiresIn:'10m'})
    return token
}

const validateToken = (token) => {
    try {
        //console.log('token for validation', token)
        const decoded = jwt.verify(token, secret)
        return decoded.id
    } catch (error) {
        console.log('error occured while decoding the tocken :: invalid', error)
        return null
    }
}
//===> send verification code
const sendResetLink = async (email, resetLink) => {
    const transport = nodeMailer.createTransport({
        service:'gmail',
        port:587,
        secure:false,
        requireTLS:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
        }
    })

    try {
        const info = await transport.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'Password Reset Request',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="text-align: center; color: #333;">Password Reset</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the link below to reset it:</p>
                <a href=${resetLink} style="display: inline-block; padding: 10px 20px; margin-top: 10px; color: #fff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">
                    Change Password
                </a>
                <p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>
                <p>Best regards,<br>Shopfy Fashions Team</p>
            </div>
        `
        })

        return info.messageId
    } catch (error) {
        console.log('error occured while sending password reset link', error)
        res.redirect('/pageNotFound')
    }
}
const sendVerificationCode = async (otp, email) => {
    const transport = nodeMailer.createTransport({
        service:'gmail',
        port:587,
        secure:false,
        requireTLS:true,
        auth:{
            user:process.env.NODEMAILER_EMAIL,
            pass:process.env.NODEMAILER_PASSWORD
        }
    })

    try {
        const info = await transport.sendMail({
            from:process.env.NODMAILER_EMAIL,
            to:email,
            subject:`Shopy Fashions [${email}] TEC for App Testing`,
            //text:`This is your otp ${otp} for signup verification`
            html:`<p>
            Hello,

You’re receiving this email as part of a test environment for our app, which is currently under development. We're working hard to ensure a seamless and secure experience, and this email is part of the testing process.

Your TEC code is: <b>${otp}</b><br>

<b>Note: If you did not request this code, please disregard this message. This is a test email sent for development purposes only, and no action is required on your part.

Thank you for your understanding and patience as we finalize our app!</b>
            </p>
            <footer>
                <b>This message is part of an application test.<br>
If you have any questions, please feel free to contact our development team at [developmentshopy1@gmail.com].<br>

Best regards,<br>
The Development Team</b>
            </footer>
`
            
        })
        // console.log(`OTP Sent to ${email} || ${info.messageId}`)
        return info.messageId
    } catch (error) {
        console.error(`Error occured while sending email ${error.message}`)
    }
}

//hash user password 
const passwordHasing = async (password) => {
    const saltRound = 10
    const hashedPassword = await bcrypt.hash(password, saltRound)
    return hashedPassword
}



//page not found
const pageNotFound = async (req, res) => {
    try{
        return res.render('user/page-404',{
            layout:'user/main'
        })
    }catch(error){
        console.log(`Error ${error.message}`)
        res.redirect('/pageNotFound')
    }
}

const productListPage = async (req, res) => {
    let sortOption
    const {category, minPrice, maxPrice, style, color, size} = req.query
    let matchCriteria = {}
    let sortCriteria = {}
    let currentSort;
    //console.log('thisi is color', color)

    const isFilter = category || minPrice || maxPrice || style || color || size
    const colorArray = color ? color : []
    const sizeArray = size ? size : []
    const styleArray = style ? style : []

    if(isFilter){
        if (category) matchCriteria["categoryDetails.name"] = category
        if (sizeArray.length > 0) matchCriteria["variantDetails.size"] = { $in: sizeArray }
        if (minPrice) matchCriteria["variantDetails.offerPrice"] = { $gte: parseInt(minPrice) }
        if (maxPrice) matchCriteria["variantDetails.offerPrice"] = { ...matchCriteria["variantDetails.offerPrice"], $lte: parseInt(maxPrice) }
        if (styleArray.length > 0) matchCriteria["style"] = { $in: styleArray }
        if (colorArray.length > 0) matchCriteria["colorGroup"] = { $in: colorArray }
    }
    
    try {
        const category = await Category.find({isListed:true}, {_id:0, name:1}).lean()
        //console.log(category)

        if(req.query.sort){
            //console.log(req.query.sort)
            sortOption = req.query.sort
            switch(sortOption){
                case 'price-high-to-low':
                    sortCriteria = {"variantDetails.offerPrice":-1}
                    currentSort = 'Price : High to Low'
                    break;
                case 'price-low-to-high':
                    sortCriteria = {"variantDetails.offerPrice":1}
                    currentSort = 'Price : Low to High'
                    break;
                case 'new-arrivals':
                    sortCriteria = {createdAt:-1}
                    currentSort = 'New Arrivals'
                    break;
                case 'a-z':
                    sortCriteria = {productName:1}
                    currentSort = 'A-Z'
                    break;
                case 'z-a':
                    sortCriteria = {productName:-1}
                    currentSort = 'Z-A'
                    break
                default:
                    sortCriteria = {createdAt:-1}
                    currentSort = 'New Arrivals'
            }
        }else{
            sortCriteria = {createdAt:-1}
            currentSort = 'New Arrivals'
        }

        const aggregationPipeline = [
            {$lookup:{
                from:'variants',
                localField:'variants',
                foreignField:'_id',
                as:'variantDetails'
            }},
            {$unwind:"$variantDetails"},
            {$lookup:{
                from:'categories',
                localField:'category',
                foreignField:'_id',
                as:'categoryDetails'
            }},
            {$unwind:'$categoryDetails'},
            {$match:{"categoryDetails.isListed":true, isBlocked:false, ...matchCriteria}}
        ]

        if(!isFilter){
            aggregationPipeline.push({$match:{'variantDetails.size':'small'}})
        }

        aggregationPipeline.push({$sort:sortCriteria})
        const productDetails = await Product.aggregate(aggregationPipeline)

        return res.render('user/product-list', {
            layout:'user/main',
            product:productDetails,
            currentSort,
            category
        })
        
    } catch (error) {
        console.log('Error occured while loading the product list page', error)
        return res.redirect('/pageNotFound')
    }
}

const productDetails = async (req, res) => {
    try {
        const productDetails = await Product.aggregate([
            {$lookup: {
                from: 'variants',
                localField: 'variants',
                foreignField: '_id',
                as: 'variantDetails'
              }},
              {$lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDetails'
              }},
              {$unwind:"$categoryDetails"},
              {$match:{_id:new mongoose.Types.ObjectId(req.query.id)}}
        ])
        const product = productDetails[0]
        const productCategory = product.categoryDetails.name

        const similarProducts = await Product.aggregate([
            {$lookup:{
                from:'variants',
                localField:'variants',
                foreignField:'_id',
                as:'variantDetails'
            }},
            {$lookup:{
                from:'categories',
                localField:'category',
                foreignField:'_id',
                as:'categoryDetails'
            }},
            {$unwind:'$categoryDetails'},
            {$match:{_id:{$ne:new mongoose.Types.ObjectId(req.query.id)}, "categoryDetails.name":productCategory, style:product.style}},
            {$limit:4}
        ])

        const productReviews = await ProductReview.find({productId:new mongoose.Types.ObjectId(req.query.id)}).lean()
        
        res.render('user/product-details', {
            layout:'user/main',
            product:productDetails[0],
            similarProducts,
            productReviews,
            productReviewCount:productReviews.length
        })
    } catch (error) {
        console.log('error occured while getitng product details',error)
    }
}

//load the user home page
const loadUserHome = async (req, res) => {
    try {
            const productDetails = await Product.aggregate([
                {$lookup: {
                    from: 'variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variantDetails'
                  }},
                  {$lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                  }},
                  {$limit:4}
            ])
            const newArrivals = await Product.aggregate([
                {$lookup: {
                    from: 'variants',
                    localField: 'variants',
                    foreignField: '_id',
                    as: 'variantDetails'
                  }},
                  {$lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                  }},
                  {$match:{isBlocked:false}},
                  {$sort:{createdAt:-1}},
                  {$limit:4}
            ])

            const reviews = await ServiceReview.find().lean()
            const clippingBanners = await Banner.find({bannerType:'clipping'}).lean()
            const landingBanners = await Banner.find({bannerType:'landing'}).lean()
            const offerBanners = await Banner.find({bannerType:'offer'}).lean()
            
            return res.render('user/home', {
                layout:'user/main',
                products:productDetails,
                newArrivals,
                reviews:reviews,
                clippingBanners:clippingBanners || null,
                landingBanners:JSON.stringify(landingBanners) || null
            })
       
    } catch (error) {
        console.log(`Error occured ${error.message}`)
        res.status(500).send('There might be an issue with the server')
    }
}

//load signup page
const loadSignupPage = async (req, res) => {
    try{
        res.render('user/signup',{
            layout:'user/main'
        })
    }catch(err){
        console.log(`Cant load sighnup page ${err.message}`)
        res.status(500).send('Server Error')
    }
}

//userSignup
const signup = async (req, res) => {

    const {user_name, user_email, user_phone, user_password} = req.body
    try {
        const isUserExisting = await User.findOne({email:user_email})
        if(isUserExisting){
            return res.render('user/signup', {
                layout:'user/main',
                message:'User is already exists with this email'
            })
        }

        const otp = generateOTP()
        const emailSend = await sendVerificationCode(otp, user_email)
        req.session.userOtp = otp
        req.session.userData = {user_name, user_email, user_phone, user_password}
        console.log(`${otp} send to ${user_email} || ${emailSend}`)
        res.render('user/otp-verification', {
            layout:false
        })
    } catch (error) {
        console.log(error.message)
        res.redirect('/pageNotFound')
    }
}
const verifyOtp = async (req, res) => {
    try {
        const {otp} = req.body
        console.log(otp)

        if(otp === req.session.userOtp){
            const user = req.session.userData
            const passwordHashed = await passwordHasing(user.user_password)
            const saveUserData = new User({
                name:user.user_name,
                email:user.user_email,
                phone:user.user_phone,
                password:passwordHashed
            })
            await saveUserData.save()
            console.log('user data saved')// testing
            req.session.user = saveUserData._id
            req.session.userName = saveUserData.name
            console.log('otp matched successfully')
            res.json({success:true, redirectUrl:"/"})
        }else{
            res.status(400).json({success:false, message:"Invalid OTP, please try again"})
        }
    } catch (error) {
        console.error("Error verifying otp", error.message)
        res.status(500).json({success:false, message:"An error occured"})
    }
}
const resendOtp = async (req, res) => {
    const {user_email} = req.session.userData
    try {
        if(!user_email){
            console.log('Email is not found in the session')
            return res.status(400).json({success:false, message:'Email not found in the session'})
        }
        const otp = generateOTP()
        const emailSendinfo = await sendVerificationCode(otp, user_email)
        if(!emailSendinfo){
            throw new Error('Failed to send email, message id not found')
        }
        
        console.log(`Resnd otp :${otp} -  ${user_email} || message id: ${emailSendinfo}`)//testing
        req.session.userOtp = otp
        res.json({success:true, message:'Resend Otp successfull'})
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({success:false, message:'Internal Sever Error, please try again'})
    }
}

const loadLogin = (req, res) => {
    try {
        if(!req.session.user){
            return res.render('user/login', {
                layout:'user/main'
            })
        }else{
            res.redirect('/')
        }
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const login = async (req, res) => {
    const {user_email, user_password} = req.body
    try {
        const findUser = await User.findOne({email:user_email})
        if(!findUser){
            return res.render('user/login',{
                layout:'user/main',
                message:'User not found'
            })
        }
        if(findUser.isBlocked){
            return res.render('user/login', {
                layout:'user/main',
                message:'Your account has been temporarily blocked by the administrator'
            })
        }

        const passwordMatch = await bcrypt.compare(user_password, findUser.password)
        if(!passwordMatch){
            return res.render('user/login', {
                layout:'user/main',
                message:'Incorrect password'
            })
        }
        
        req.session.user = findUser._id
        req.session.userName = findUser.name
        res.redirect('/')
    } catch (error) {
        console.log(`Error while user login ${error.message}`)
        res.render('user/login', {
            layout:'user/main',
            message:'Login failed, please try again after sometime'
        })
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if(err){
                console.log(`Session destruction error ${err.message}`)
                return res.redirect('/pageNotFound')
            }else{
                // return res.redirect('/user_login')
                return res.json({message:'User logout successfully', redirectUrl:'/user_login'})
            }
        })
    } catch (error) {
        console.log(`user logout failed ${error.message}`)
        res.redirect('/pageNotFound')
    }
}

const loadUserProfile = async (req, res) => {
    const userId = req.query.id
    console.log('user id is ', userId) //testing
    
    try {  
                const userData = await User.findOne({_id:userId}).lean()
                const address = await Adress.findOne({userId:userId}).lean()
                const orders = await Order.aggregate([
                    {$match:{userId:new mongoose.Types.ObjectId(userId)}},
                    {$lookup:{
                        from:'products',
                        localField:'orderedItems.product',
                        foreignField:'_id',
                        as:'productDetails'
                    }}
                ])
                //console.log('userAddress', address)
                if(!address){
                    return res.render('user/user-profile', { //if any show the profile page
                        layout:'user/main',
                        user:userData,
                        orders
                    })
                }
                return res.render('user/user-profile', { //if any show the profile page
                    layout:'user/main',
                    user:userData,
                    address:address.address,
                    orders
                })

    } catch (error) {
        console.log(`Error occured while loading user profile ${error}`)
        return res.redirect('/pageNotFound')
    }
}
const userOrders = async (req, res) => {
    const user = req.query.id
    try {
        const orders = await Order.aggregate([
            {$match:{userId:new mongoose.Types.ObjectId(user)}},
            {$lookup:{
                from:'products',
                localField:'orderedItems.product',
                foreignField:'_id',
                as:'productDetails'
            }}
        ])

        return res.render('user/orders', {
            layout:'user/main',
            orders
        })
    } catch (error) {
        console.log('error occured while rendering the user order history!', error)
        res.redirect('/pageNotFound')
    }
}
const userOrderDetails = async (req, res) => {
    const orderId = req.query.orderId
    try {
        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' }
        ])

        const addressRef = orderDetails[0].address
        const addressDoc = await Adress.findOne({address:{$elemMatch:{_id:addressRef}}}).lean()
        const addressArray = addressDoc.address
        const shippingAddress = addressArray[0]
        const paymentStatus = orderDetails[0].status
        const razorpayOrderId = orderDetails[0].razorpayOrderId
        const orderObjectId = orderDetails[0]._id
        const orderRecord = orderDetails[0].record
        const {totalPrice, finalAmount, taxPercentage, taxAmount} = orderDetails[0]

        return res.render('user/orderDetails', {
            layout:'user/main',
            orderDetails,
            shippingAddress,
            paymentStatus,
            orderObjectId,
            orderRecord,
            totalPrice,
            finalAmount,
            taxPercentage, 
            taxAmount,
            razorpayOrderId
        })
    } catch (error) {
        console.log('error occured while geting order ', error)
        return res.redirect('/pageNotFound')
    }
}

const userAddressAdd = async (req, res) => {
    const userId = req.query.id
       
    try {
        
        const addressDetails = {
            name:req.body.name,
            building:req.body.building,
            area:req.body.area,
            city:req.body.city,
            state:req.body.state,
            pinCode:req.body.pinCode,
            phoneNumber:req.body.phoneNumber
        }
        const user = await User.findOne({_id:userId})
        //check is the user have already one address
        const addressFind = await Adress.findOne({userId:userId})
        if(addressFind){
            await Adress.updateOne({userId:userId}, {$push:{address:addressDetails}})
            console.log('user address saved successfully if case true')
            return res.json({success:true, message:'Address saved successfully'})
        }
        
        const userAddress = new Adress({
            userId:user._id,
            address:addressDetails
        })

        await userAddress.save()
        console.log('user address saved successfully if case fails')
        return res.json({success:true, message:'Address saved successfully'})

    } catch (error) {
        console.log('An error occured while saving the address', error)
        return res.status(500).json({success:false, message:'Failed to save Address try again after some time'})
    }
}

const fetchEditDetails = async (req, res) => {
    const addressId = req.query.id
    try {
        const addressDoc = await Adress.findOne({address:{$elemMatch:{_id:addressId}}})
        const addressArray = addressDoc.address
        const editableAddress = addressArray.find((address) => {
            return address._id == addressId
        })
        
        return res.json({success:true, editableAddress})
    } catch (error) {
        console.log('error occured while fetching the address details')
        return res.status(500).json({message:'Internal Server Error, please try again after sometime'})
    }
}

const userAddressEdit = async (req, res) => {
    const addressId = req.query.addressId
    
    let user
    if(req.user){
        user = req.user._id
    }else if(req.session.user){
        user = req.session.user
    }else{
        return res.redirect('/pageNotFound')

    }
    
    try {
        await Adress.updateOne({address:{$elemMatch:{_id:new mongoose.Types.ObjectId(addressId)}}}, {
            $set:{
                "address.$.name":req.body.name,
                "address.$.building":req.body.building,
                "address.$.area":req.body.area,
                "address.$.city":req.body.city,
                "address.$.state":req.body.state,
                "address.$.pinCode":req.body.pinCode
            }
        })
    
        return res.redirect(`/profile?id=${user}`)

    } catch (error) {
        console.log('An error occured while updating the udress ', error)
        return res.redirect('/pageNotFound')
    }

}

const userAddressDelete = async (req, res) => {
    //console.log(req.body)
    const addressId = req.body.addressId
    try {
        const addressDoc = await Adress.findOne({address:{$elemMatch:{_id:addressId}}})
        const userId = addressDoc.userId
        const deleteDetails = await Adress.updateOne({userId:userId}, {
            $pull:{address:{"_id":addressId}}
        })
        if(deleteDetails.modifiedCount){
            console.log('Address deleted successfully')
        }
        return res.json({success:true, message:'Address deleted successfully'})
    } catch (error) {
        console.log('Error occured while deleting the address ', error)
        return res.status(500).json({message:'Internal server Error'})
    }
}

const loadCartPage = async (req, res) => {
    let userId 
    if(req.user){
        userId = req.user._id
    }else if(req.session.user){
        userId = req.session.user
    }else{
        return res.redirect('/pageNotFound')
    }

    
    try {
        
        const cart = await Cart.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId)} },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "variants",
                    let: { productId: "$items.productId", size: "$items.size" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $and: [{ $eq: ["$productId", "$$productId"] }, { $eq: ["$size", "$$size"] }] }
                            }
                        }
                    ],
                    as: "vriantDetails"
                }
            },
            { $unwind: "$vriantDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {$match:{"productDetails.isBlocked":false}}

        ])
        console.log('cart details')
        
        function totalCartPrice(cart){
            let taxAmount, taxValue
            const discountedValue = cart.reduce((total, item) => {
                return total + ((item.vriantDetails.regularPrice - item.vriantDetails.offerPrice) * item.items.quantity) 
            }, 0)
            const subTotal = cart.reduce((total, item) => {
                return total + (item.vriantDetails.regularPrice * item.items.quantity)
            }, 0)
            if(subTotal < 1000){
                taxValue = 5
                taxAmount = (subTotal * taxValue) / 100
            }else if(subTotal > 1000){
                taxValue = 12
                taxAmount = (subTotal * taxValue) / 100
            }
            

            const grantTotal = Math.round((subTotal - discountedValue) + 60 + taxAmount)
            console.log('discount value ',discountedValue)

            return {
                subTotal,
                discountedValue,
                grantTotal,
                savedValue:discountedValue - 60,
                taxValue,
                taxAmount
            }
        }
        const {discountedValue, subTotal, grantTotal, savedValue, taxValue, taxAmount} = totalCartPrice(cart)

        res.render('user/cart', {
            layout:'user/main',
            cart:cart,
            subTotal,
            discountedValue,
            grantTotal,
            savedValue,
            taxValue,
            taxAmount
        })
    } catch (error) {
        console.log('cart error', error) //this is only for testing
    }
}

const addToCart = async (req, res) => {
    const id = req.query.product
    let userId
    if(req.user){
        userId = req.user._id
    }else if(req.session.user){
        userId = req.session.user
    }else{
        return res.redirect('/pageNotFound')
    }

    const size = req.query.size
    const quantity = Number(req.body.productQuantity)
    console.log('quantity of the product ', quantity) //Testing 
    console.log('this is the productid', id) //Testing 
    console.log('this is the userId', userId) //Testing 
    let variantSize
    switch (size){
        case 'S':
            variantSize = 'small'
            break
        case 'M':
            variantSize = 'medium'
            break
        case 'L':
            variantSize = 'large'
            break;
    }

    try {
        const product = await Product.findOne({_id:id})
        const variant = await Variant.findOne({productId:id, size:variantSize})
        const productCart = {
            productId:product._id,
            size:variantSize,
            quantity:quantity,
        }

        const cartNotEmpty = await Cart.findOne({userId:userId})
        if(cartNotEmpty){
            console.log('Cart already have items')
            const isExist = cartNotEmpty.items.findIndex((item) => {
                return item.productId.toString() === product._id.toString()
            })

            //check for any match
            if(isExist >= 0){
                //found the same product
                cartNotEmpty.items[isExist].quantity += quantity
                cartNotEmpty.items[isExist].totalPrice = cartNotEmpty.items[isExist].price * cartNotEmpty.items[isExist].quantity

                await cartNotEmpty.save()
                return res.redirect('/cart')
            }else{
                await Cart.updateOne({userId:userId}, {
                    $push:{items:productCart}
                })
                console.log('cart saved with adding the new items with existing items tto the cart')
                return res.redirect('/cart')
            }

            
        }else{
            console.log('cart dont have any items')
            //saving the product to the cart collection
            const newProductToCart = new Cart({
                userId: userId,
                items: [productCart]
            })
            await newProductToCart.save()
            console.log('cart saved with the new product')
            console.log('cart updated')
            return res.redirect('/cart')
        }
        
    } catch (error) {
        console.log('ERror occured while adding product to cart', error)
        res.redirect('/pageNotFound')
    }
}

const cartQuantityUpdate = async (req, res) => {
    const {userId, productId, quantity} = req.body
    console.log('user id = ', userId)
    console.log('product id = ', productId)
    console.log('quantiy = ', quantity)
    try {
        const updateCartQuantity = await Cart.updateOne(
            {userId:userId, "items.productId":productId},
            {$set:{
                "items.$.quantity":Number(quantity)
            }}
        )
        console.log(updateCartQuantity)
        console.log('cart quantitty updated successfully')
        return res.json('cart saved')
    } catch (error) {
        console.log('error occured while saving cart quantity', error)
        return res.status(500).json('Internal Server Error Please try again after some times')
    }
} 

const removeFromCart = async (req, res) => {
    const {productId} = req.body
    
    let user
    if(req.user){
        user = req.user._id
    }else if(req.session.user){
        user = req.session.user
    }else{
        return res.redirect('/pageNotFound')
    }

    console.log('product id', productId)
    try {
        await Cart.updateOne({userId:user}, {
            $pull:{items:{"productId":new mongoose.Types.ObjectId(productId)}}
        })
        console.log('item removed from cart successfully')
        return res.json({success:true, message:'Item removed from your cart'})
    } catch (error) {
        console.log('error occured while removing item from cart', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometimes'})
    }
}

const proceedToCheckout = async (req, res) => {
    
    let userId
    if(req.user){
        userId = req.user._id
    }else if(req.session.user){
        userId = req.session.user
    }else{
        return res.redirect('/pageNotFound')
    }
    const {subTotal, grantTotal, discount, couponApplied, taxPercentage, taxAmount} = req.body
    console.log('before redirecting to checkout page! this is applied coupon', couponApplied)
    try {
        //store details in the session
        req.session.cart = {userId, subTotal, discount, grantTotal, couponApplied, taxPercentage, taxAmount}
        return res.json({success:true, redirectUrl:'/checkout'})
    } catch (error) {
        console.log('Error occured while storing chekcout details in the session', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after some times'})
    }
}

const loadChekoutPge = async (req, res) => {
    const cartPayment = req.session.cart
    const cart = await Cart.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(cartPayment.userId)} },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        { $unwind: "$productDetails" },
        {
            $lookup: {
                from: "variants",
                let: { productId: "$items.productId", size: "$items.size" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $and: [{ $eq: ["$productId", "$$productId"] }, { $eq: ["$size", "$$size"] }] }
                        }
                    }
                ],
                as: "vriantDetails"
            }
        },
        { $unwind: "$vriantDetails" },
        {
            $lookup: {
                from: "categories",
                localField: "productDetails.category",
                foreignField: "_id",
                as: "categoryDetails"
            }
        },
        { $unwind: "$categoryDetails" },
        { $match:{"productDetails.isBlocked":false}}

    ])
    if(cart.length === 0){
        console.log('items in carts are deleted')
        return res.redirect('/')
    }
    console.log('This is the query used to get the address', cartPayment.userId)
    const addressLists = await Adress.findOne({userId:cartPayment.userId}).lean()
    
    const userWallet = await Wallet.findOne({userId:cartPayment.userId}).lean()

    return res.render('user/checkout', {
        layout:'user/main',
        cart,
        cartPayment,
        addressList:addressLists? addressLists?.address : [],
        userWallet
    })
}

const paymentConfirm = async (req, res) => {
    const {paymentMethod} = req.body
    try {
        switch(paymentMethod){
            case 'cod':
                res.json({success:true, title:'Cash on Delivery', message:'You will redirect to the order placing'})
                break;
            case 'onlinePayment':
                res.json({success:true, title:'Online Payment', message:'You will redirect to the online payment options'})
                break;
            case 'wallet':
                res.json({success:true, title:'Pay through wallet', message:'You will redirect to the wallet'})
                break;
            default:
                throw new Error('Invalid')
        }
    } catch (error) {
        return res.status(500).json({success:false, message:'Internal Server Error please try after some time'})
    }


}

const placeOrder = async (req, res) => {
        
    let user
    if(req.user){
        user = req.user._id
    }else if(req.session.user){
        user = req.session.user
    }else{
        return  res.redirect('/pageNotFound')
    }

    let orderId
    if(req.query.orderId){
        orderId = req.query.orderId
    }else{
        orderId = null
    }

    console.log('chekcing datasa', req.query)
    if(orderId){
        console.log('currently order id exist in the query!', orderId)
        const needUpdation = await Order.findOne({orderId:orderId}, {orderId:1, status:1, paymentStatus:1})
        
        const updatePaymentStatus = await Order.updateOne({orderId:orderId},
           {$set:{
            paymentStatus:"Paid",
            status:"Processing"
           }}
        )
        console.log('This is failed payment after quick updation::: ', updatePaymentStatus)
        const itemUpdated = await Order.findOne({orderId:orderId}, {orderId:1, status:1, paymentStatus:1})
        
        if(updatePaymentStatus.modifiedCount === 0){
            throw new Error('Can not update payment status')
        }
        //delete item from cart
        const deleteCart = await Cart.deleteOne({userId:user})
        if(deleteCart.deletedCount > 0){
            console.log('cart deleted after placing order!')
        }

        const findUser = await User.findOne({_id:user})
        if(!findUser.redeemed && findUser.referredBy){
            const referrer = findUser.referredBy
            const findWallet = await Wallet.findOne({userId:referrer})
            if(!findWallet){
                const newWallet = new Wallet({
                    userId:referrer,
                    balance:10,
                    transactions:[
                        {
                            transactionType:"Credit",
                            amount:10,
                            date:new Date(),
                            status:"Completed",
                            description:"Welcome Bonus!"
                        }
                    ]
                })

                await newWallet.save()

                newWallet.transactions?.push({
                    transactionType:"Credit",
                    amount:100,
                    date:new Date(),
                    status:"Completed",
                    description:"Referral Bonus, as your referree made his/her first purchase"
                })
                findUser.redeemed = true
                await findUser.save()
                await newWallet.save()
            }else{
                findWallet.transactions?.push({
                    transactionType:"Credit",
                    amount:100,
                    date:new Date(),
                    status:"Completed",
                    description:"Referral Bonus, as your referree made his/her first purchase"
                })
                findUser.redeemed = true
                await findUser.save()
                await findWallet.save()
            }
            
        }

        return res.json({success:true, message:'Yay! your order has been successfully placed!'})
    }else if(req.query.razorpayOrderId && req.query.retry){
        console.log('request for retry payment reached herer', req.query)
        console.log('request for retry payment reached here order id differnciated', req.query.razorpayOrderId)
        //find the failed order user try to success
        const retryOrder = await Order.findOne({razorpayOrderId:req.query.razorpayOrderId})
        
        //create a new razorpay order
        const razorPayOrder = await razorpayInstance.orders.create({
            amount:retryOrder.finalAmount * 100,
            currency:'INR',
            receipt:retryOrder.orderId,
            payment_capture:1
        })
        console.log('created razropay order for retry paymetn')

        retryOrder.razorpayOrderId = razorPayOrder.id
        await retryOrder.save()
        //send the response
        console.log('database updated accordingly!')
        console.log('every thing is fine, return proceed')
        return res.json(razorPayOrder)
    }

    const orderData = req.body
    
    try {
        const orderedItems = await Cart.aggregate([
            { $match:{userId:new mongoose.Types.ObjectId(user)}},
            { $unwind: "$items" },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $lookup: {
                    from: 'variants',
                    let: { productId: "$items.productId", size: "$items.size" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $and: [{ $eq: ["$productId", "$$productId"] }, { $eq: ["$size", "$$size"] }] }
                            }
                        }
                    ],
                    as: 'variantDetails'
                }
            },
            { $unwind: "$variantDetails" }

        ])
        

        const formatOrderedItems = orderedItems.map((item) => {
            return {
                product:item.items.productId,
                quantity:item.items.quantity,
                size:item?.items?.size || 'not available',
                price:item.variantDetails.regularPrice
            }
        })
        

        const order = new Order({
            orderedItems:formatOrderedItems,
            totalPrice:orderData.totalAmount,
            discount:orderData.discount,
            taxPercentage:orderData.taxPercentage,
            taxAmount:orderData.taxAmount,
            finalAmount:orderData.payableAmount,
            paymentMethod:orderData.paymentMethod,
            address:orderData.selectedAddress,
            userId:new mongoose.Types.ObjectId(user)
        })

        await order.save()
        
        for(let singleItem of formatOrderedItems){
            await Variant.updateOne({productId:singleItem.product, size:singleItem.size}, {
                $inc:{quantity:-singleItem.quantity}
            })
        }
        await User.updateOne({_id:new mongoose.Types.ObjectId(user)}, {
            $push:{orders:order._id}
        })
        
        console.log('order saved')

        //update the coupn applied user
        if(orderData.couponApplied){
            await Coupon.updateOne({name:orderData.couponApplied}, 
                {$addToSet:{userId:user}}
            )
        }
        if(orderData.paymentMethod === 'onlinePayment'){
            const currency = 'INR'
            const razorPayOrder = await razorpayInstance.orders.create({
                amount:orderData.payableAmount * 100,
                currency:currency,
                receipt:order.orderId,
                payment_capture:1
            })

            //since it is razorpay order so order status must be awaiting:::
            order.status = "Awaiting Payment"
            order.razorpayOrderId = razorPayOrder.id
            await order.save()
            return res.json(razorPayOrder)
        }

        if(orderData.paymentMethod === 'wallet'){
            const purchaseAmount = Number(orderData.payableAmount)
            //deduct amount from wallet
            const findUserWallet = await Wallet.findOne({userId:user})
            findUserWallet.balance -= purchaseAmount
            findUserWallet.transactions?.push({
                transactionType:'Debit',
                amount:purchaseAmount,
                status:"Completed",
                date:new Date(),
                description:`Amount spend on order ${order._id}`
            })

            await findUserWallet.save()
            order.paymentStatus = "Paid"
            await order.save()
        }

        //remove cart after order creation
        const deleteCart = await Cart.deleteOne({userId:user})
        if(deleteCart.deletedCount > 0){
            console.log('cart deleted after placing order!')
        }
        //handle refer reward
        const findUser = await User.findOne({_id:user})
        if(!findUser.redeemed && findUser.referredBy){
            const referrer = findUser.referredBy
            const findWallet = await Wallet.findOne({userId:referrer})
            if(!findWallet){
                const newWallet = new Wallet({
                    userId:referrer,
                    balance:10,
                    transactions:[
                        {
                            transactionType:"Credit",
                            amount:10,
                            date:new Date(),
                            status:"Completed",
                            description:"Welcome Bonus!"
                        }
                    ]
                })

                await newWallet.save()

                newWallet.transactions?.push({
                    transactionType:"Credit",
                    amount:100,
                    date:new Date(),
                    status:"Completed",
                    description:"Referral Bonus, as your referree made his/her first purchase"
                })
                findUser.redeemed = true
                await newWallet.save()
                await findUser.save()
            }

            findWallet.transactions?.push({
                transactionType:"Credit",
                amount:100,
                date:new Date(),
                status:"Completed",
                description:"Referral Bonus, as your referree made his/her first purchase"
            })
            findUser.redeemed = true
            await findUser.save()
            await findWallet.save()
            
        }
        return res.json({success:true, message:'Yay! your order has been successfully placed!'})

    } catch (error) {
        console.log('Error occured while placing the order', error)
        res.status(500).json({success:false, message:'Internal Server Error, please try again after sometimes'})
    }
}

const failedOrders = async (req, res) => {
    const {orderId} = req.query
    console.log('this is updatable orderId', orderId)
    try {
        const updateOrder = await Order.updateOne(
            {orderId:orderId},
            {$set:{
                paymentStatus:"Failed"
            }}
        )
        const failedOrder = await Order.findOne({orderId:orderId})
        
        //sending response
        return res.json({success:true, title:'Payment Failed', message:'It seems your payment can not be processed. Dont worry, your order still saved you can retry your payment later from the orders page!', razorPayId:failedOrder.razorpayOrderId})
    } catch (error) {
        console.log('error occured while handling failed payments!', error)
        return res.status(500).json({message:'Internal Server error!, please try again after sometime!'})
    }
}
const cancelOrder = async (req, res) => {
    const {orderId, userId} = req.body
    try {
        const order = await Order.findOne({_id:orderId})
        const userWallet = await Wallet.findOne({userId:userId})
        if(!order){
            return res.status(400).json({success:false, message:'Order not found!'})
        }
        if(order.paymentMethod === 'onlinePayment' && !userWallet){
            console.log('user dont have wallet so check it!')
            return res.json({success:false, message:'You need to activate your wallet before, continuing order cancelation'})
        }
        order.status = 'Cancelled'
        if(order.paymentMethod === 'onlinePayment'){
            order.record = 'Order cancelled and amount refunded'
            order.statusHistory.push({
                status:'Cancelled',
                timestamp:new Date(),
                notes:'Order cancelled'
            })

            //refund the amount to the wallet
            const refundAmount = order.finalAmount
            
            //update the wallet
            userWallet.transactions?.push({
                transactionType:"Credit",
                amount:refundAmount,
                date:new Date(),
                status:"Completed",
                description:"Order cancellation refund"
            })
            userWallet.balance += refundAmount

            await userWallet.save()

        }else{
            order.record = 'Order cancelled'
            order.statusHistory.push({
                status:'Cancelled',
                timestamp:new Date(),
                notes:'Order cancelled'
            })
        }
        await order.save()

        return res.json({success:true, message:'Order Cancelled Successfully!'})
    } catch (error) {
        console.log('error occured while cancelling the order', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

const returnRequest = async (req, res) => {
    
    const {orderId, userId} = req.body
    const requestedDate = new Date()
    try {
        //find the order
        const order = await Order.findOne({_id:orderId})
        if(!order){
            return res.status(400).json({success:false, title:'Invalid', message:'Order not found!'})
        }

        //check eligibility
        const returnValidity = 7 * 24 * 60 * 60 * 1000
        const deliveryDate = order.statusHistory.find((historyData) => {
            return historyData.status === 'Delivered'
        })?.timestamp

        if(!deliveryDate || requestedDate - deliveryDate > returnValidity){
            return res.status(400).json({success:false, title:'Expired', message:'Sorry, your return period is ended'})
        }

        //proceed the return request
        order.status = 'Return Request'
        order.statusHistory.push({
            status:'Return Request',
            timestamp:requestedDate,
            notes:'User requested for return'
        })
        order.record = 'Return request is on processing'

        await order.save()

        return res.json({success:true, title:'Success!', message:'Your return request submitted successfully!, request is currently on processing. You can see information here once it completed'})
    } catch (error) {
        console.log('error occured while processing the return request!', error)
        return res.status(500).json({success:false, title:'Error', message:'Internal Server Error, please try again after sometime!'})
    }
}

const cancelOrderPayment = async (req, res) => {
    const { orderId } = req.query
    if (orderId) {
        //delete the order
        try {
            const findOrder = await Order.findOne({orderId:orderId})
            if(findOrder && findOrder.paymentStatus === 'Failed'){
                return res.json({success:false, message:'Payment Failed'})
            }
            const deleteSavedOrder = await Order.deleteOne({ orderId: orderId })
            if (deleteSavedOrder.deletedCount > 0) {
                return res.json({ success: true })
            }
            throw new Error('Delete Count 0')
        } catch (error) {
            console.log('error occured while deleting the order for payment cancelation')
            return res.status(500).json({success:false, message:'Internal Server Error, Please try again after some time!'})
        }
    }
    return
}
const searchProducts = async (req, res) => {
    const query = req.query.query
    try {
        
        if(query && query.length > 0){
            const products = await Product.find(
                {productName:{$regex:new RegExp(query, 'i')}},
                {
                    productName:1,
                    sku:1,
                    productImage:1
                }
            )
            return res.json({success:true, products})
        }
        
    } catch (error) {
        console.log('An error occured while searching the product details', error)
        return res.status(500).json({success:false})
    }
}

//app use
const countCartItems = async (req, res) => { //updating cart count :: fixing bug for the cart count after blocking product
    try {
        let user 
        if(req.session.user){
            user = req.session.user
        }else if(req.user){
            user = req.user._id
        }


        if(user){
            const cart = await Cart.aggregate([
                { $match: { userId: new mongoose.Types.ObjectId('6705fe29ab952f2258f84d70') } },
                { $unwind: "$items" },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'items.productId',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: "$productDetails" },
                { $match: { 'productDetails.isBlocked': false } }
            ])
            return cart ? cart.length : 0
            
        }
        return null
    } catch (error) {
        console.log('error occured while geting cart count for badge !', error )
        return null
    }
}
//app use
const CheckWishlist = async (req, res) => {
    try {
        let user
        if(req.session.user){
            user = req.session.user
        }else if(req.user){
            user = req.uesr?._id //ternary used for error handling! //testing
        }

        if(user){
            //get user wishlist
            const userWishlist = await Wishlist.findOne({userId:user})
            const wishlistedProducts = userWishlist.products.map((product) => {
                return product.productId
            } )
            return wishlistedProducts ? userWishlist : []
        }
        return []
    } catch (error) {
        console.log('Error occured while geting the wishlisted item for icon management!')
        return []
    }
}

const loadPasswordresetRequestPage = (req, res) => {
    try {
        return res.render('user/forgotPassword', {
            layout:false
        })
    } catch (error) {
        console.log('error occured while loading the password reset request page!', error)
        return res.redirect('/pageNotFound')
    }
}

const sendPasswordResetLink = async (req, res) => {
    const {email}  = req.body
    console.log('this is the email', email) //testing
    try {
        if(email){
            //check if the email is exist in the database
            const isUserExist = await User.findOne({email})
            if(!isUserExist){
                return res.status(400).json({success:false, message:'User not found'})
            }
            const token = generateTocken(isUserExist._id)
            const resetLink = `https://shopypro.shop/password/reset/${token}`
            console.log('This is the token', token)
            const info = await sendResetLink(email, resetLink)

            if (!info) {
                throw new Error('Email sending error :: Password reset link is not sended properly')
            }

            return res.json({success:true, message:`We send the password reseting link to ${email}`})

        }else{
            return res.redirect('/pageNotFound')
        }
    } catch (error) {
        console.log('error occured while requesting password reseting link', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime'})
    }
}

const loadPaswordResetPage = async (req, res) => {
    const {token} = req.params
    if(!token) return res.redirect('/pageNotFound')
    const isValid = validateToken(token)

    if(isValid){
        return res.render('user/changePassword', {
            layout:false,
            token
        })
    }else{
        return res.status(400).send('Invalid Request')
    }
}

const updatePassword = async (req, res) => {
    console.log('this function has been called')
    const {token} = req.params
    console.log('token before validation', token)
    const {newPassword} = req.body
    const userId = validateToken(token)
    try {
        if(userId){
            const hashedPassword = await bcrypt.hash(newPassword, 10)
            const update = await User.updateOne({_id:userId}, {password:hashedPassword})
            if(update.modifiedCount == 0) return res.status(400).json({success:false, message:'Invalide User'})
            return res.json({success:true, message:'Your password changed successfully!', redirectUrl:'/user_login'})
        }
    } catch (error) {
        console.log('error occured while updating the password', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}
const addToWishlist = async (req, res) => {
    console.log('Request reached here for add to wishlist!')
    const {productId} = req.body
    let user
    if(req.session.user){
        user = req.session.user
    }else if(req.user){
        user = req.user._id //fixed the id issue of passport users
    }

    try {
        const productDetails = {
            productId:productId,
            addedOn:new Date()
        }
        const userWishlist = await Wishlist.findOne({userId:user})
        if(!userWishlist){ //case : if the user creates wishlist for the first time!
            const addNewtoWishlist = new Wishlist({
                userId:user,
                products:[productDetails]
            })

            await addNewtoWishlist.save()
            return res.json({success:true, message:'Item Added to wishlist'})
        }

        //case : if the user already have wishlist
        if(userWishlist.products.length > 0){ // add the product if it is not in the list
            const updateWishlist = await Wishlist.updateOne(
                {userId:user},
                {$addToSet:{
                    products:productDetails
                }}
            )

            if(updateWishlist.modifiedCount > 0) return res.json({success:true, message:'Item Added to wishlist'})
    
        }
        
        if(userWishlist.products.length === 0){
            const updateWishlist = await Wishlist.updateOne(
                {userId:user},
                {$push:{products:productDetails}}
            )

            if(updateWishlist.modifiedCount > 0){
                return res.json({success:true, message:'Item Added to wishlist'})
            }
        }

    } catch (error) {
        console.log('Error occured while item ', error)
        return res.status(500).json({success:false, message:'Internal Server Error please try again after sometime!'})
    }
}
const removeFromWishlist = async (req, res) => {
    const {productId} = req.body
    const user = req.session.user || req.user._id //fixed the id issue of passport users
    try {
        //pull the product from wishlist
        const removeItem = await Wishlist.updateOne(
            {userId:user},
            {$pull:{
                products:{"productId":productId}
            }}
        )
        if(removeItem.modifiedCount > 0){
            return res.json({success:true, message:'Item removed from wishlist'})
        }

        throw new Error('Item not removed, please try again after somtime!')
    } catch (error) {
        console.log('Error occured while removing item from wishlist', error)
        return res.status(500).json({success:false, message:'Internal Server Error please try again after sometime!'})
    }
}



const getWishlist = async (req, res) => {
    console.log('request for wishlist geting')
    let user = req.session.user || req.user._id
    console.log('This is user id', user)
    
    if (user) {
        console.log('wishlist requested user!', user)
        const wishlist = await Wishlist.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(user) } },
            { $unwind: "$products" },
            {
                $lookup: {
                    from: 'products',
                    localField: "products.productId",
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productDetails.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $lookup: {
                    from: 'variants',
                    localField: 'products.productId',
                    foreignField: 'productId',
                    as: 'variantDetails'
                }
            },
            { $unwind: '$variantDetails' },
            { $match: { 'variantDetails.size': "small" } }
        ])


        return res.render('user/wishlists', {
            layout:'user/main',
            wishlist
        })
    }
}

const applyCoupon = async (req, res) => {
    console.log('coupon applying request reached here!')
    let user
    if(req.session.user){
        user = req.session.user
    }else if(req.user){
        user = req.user._id
    }
    const {code, totalAmount} = req.body
    let discountedPrice
    const today = new Date()
    try {
        //check if it invalid
        const findCode = await Coupon.findOne({name:code})
        if(!findCode){
            return res.status(400).json({success:false, title:'Invalid Coupon', message:'The coupon code you entered is invalid, please check and try again'})
        }

        //check if it is not expired
        const expiryDate = new Date(findCode.expireOn)
        const isExpired = expiryDate < today
        if(isExpired){
            return res.status(400).json({success:false, title:'Coupon Expired!', message:'The coupon you have entered is expired and can not be applied, please try another one'})
        }

        //check if the user is already applied this coupon
        const isUsed = await Coupon.findOne({userId:{$eq:user}})
        if(isUsed){
            return res.status(400).json({success:false, title:'Coupon Already used!', message:'This coupon has been already used, please try another one!'})
        }
        //check minimum price
        if(parseInt(totalAmount) < findCode.minimumPrice){
            return res.status(400).json({success:false, title:'Minimum purchase requirement', message:'Your cart items does not meet the minimum purchase requirement for this coupon'})
        }
        discountedPrice = (findCode.offerType === 'percentage') ? Math.round((parseInt(totalAmount) * findCode.offerPrice) / 100) : findCode.offerPrice
        return res.json({success:true, discountedPrice, code:findCode.name, message:'Coupon Applied!'})

    } catch (error) {
        console.log('Error occured while, appliying coupon', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime'})
    }
}
const getWallet = async (req, res) => {
    const userId = req.query.id
    try {
        const userWallet = await Wallet.findOne({userId:userId}).lean()
        const transactions = userWallet?.transactions

        return res.render('user/wallet', {
            layout:'user/main',
            wallet:userWallet || null,
            transactions:transactions || null
        })
    } catch (error) {
        console.log('error occured while geting wallet!', error)
        return res.redirect('/pageNotFound')
    }
    
}
const createWallet = async (req, res) => {
    const userId = req.query.user
    try {
        const createWallet = new Wallet({
            userId:userId,
            balance:10,
            transactions:[
                {
                    transactionType:"Credit",
                    amount:10,
                    date:new Date(),
                    status:"Completed",
                    description:"Welcome Bonus!"
                }
            ]
        })

        await createWallet.save()
        return res.json({success:true, message:'Wallet created successfully!'})
    } catch (error) {
        console.log('error occured while creating the wallet')
        return res.status(500).json({success:false, message:'Internal Server Error Please try again after some time!'})
    }
}

const getCoupons = async (req, res) => {
    const userId = req.query.user
    try {
        const coupons = await Coupon.find({isListed:true}).lean()
        return res.render('user/coupons', {
            layout:'user/main',
            coupons:coupons || null
        })
    } catch (error) {
        console.log('error occured while rendering coupons', error)
        return res.redirect('/pageNotFound')
    }
}

const downloadInvoice = async (req, res) => {
    const { orderId } = req.query;
    try {
        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' }
        ]);

        const addressRef = orderDetails[0].address;
        const addressDoc = await Adress.findOne({ address: { $elemMatch: { _id: addressRef } } }).lean();
        const shippingAddress = addressDoc.address[0];
        const paymentStatus = orderDetails[0].status;
        const orderObjectId = orderDetails[0]._id;
        const { totalPrice, finalAmount, taxPercentage, taxAmount, discount } = orderDetails[0];
        const invoiceNo = `INV-SPY-${orderObjectId.toString().slice(-6).toUpperCase()}`

        const fullAddress = `${shippingAddress.building}, ${shippingAddress.area}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pinCode}`;

        const invoiceHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Invoice</title>
            </head>
        <body>
            <h4 style="font-weight:bold;text-align:center;">Tax Invoice</h4>
            <div style="display:flex;justify-content:space-between;gap: 2rem;">
            <div>
                <p><b>Shopsy Ecommerce Pvt. Ltd.</b><br>
                    <span style="font-size:.9rem"><i>
                        123, Market Plaza,
                    Green Street, Sector 21,
                    New Town, Metro City, <br>
                    State: XYZ
                    PIN: 560001
                    Phone: +91 98765 43210</i>
                    </span>
                </p>
            </div>
            <div>
                <img src="/images/frontend/shopqr.png" style="width:100px;height:100px;" alt="page qr code">
                <div style="border:1px dotted black">{{invoiceNo}}</div>
            </div>
            </div>
            <div style="border-top: 1px solid;margin-top: 5px;margin-bottom: 5px;"></div>
            <div style="display: flex;gap: 3rem;">
                <div>
                    <p><b>Order Id : </b>${orderObjectId}</p>
                    <p><b>Order Date : </b>${moment(orderDetails[0].createdAt).format('DD-MM-YYYY')}</p>
                    <p><b>Invoice Date : </b>${moment(orderDetails[0].createdAt).format('DD-MM-YYYY')}</p>
                </div>
                <div>
                    <p><b>Billing Address</b></p>
                    <p>${shippingAddress.building}, ${shippingAddress.area}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pinCode}</p>
                </div>
            </div>
            <div style="border-top: 1px solid;margin-top: 5px;margin-bottom: 5px;"></div>
            <div>
                <table style="border-collapse:collapse;width: 100%;">
                    <tr style="border:1px solid;">
                        <th style="border:1px solid">Product</th>
                        <th style="border:1px solid">Quantity</th>
                        <th style="border:1px solid">Amount</th>
                    </tr>
                   {{#each items}}
                    <tr style="border:1px solid;">
                        <td style="border:1px solid">{{this.productDetails.productName}}</td>
                        <td style="text-align: center;border:1px solid">{{this.orderedItems.quantity}}</td>
                        <td style="text-align: right;border:1px solid">₹{{this.orderedItems.price}}</td>
                    </tr>
                   {{/each}}
                    <tr style="border:1px solid;">
                        <td colspan="2" style="border:1px solid"><b>Total</b></td>
                        <td style="text-align: right;font-weight: bold;border:1px solid">{{totalPrice}}</td>
                    </tr>
                    <tr style="border:1px solid;">
                        <td colspan="2" style="border:1px solid;"><b>Deductions</b></td>
                        <td style="text-align: right;font-weight: bold;border:1px solid">{{discount}}</td>
                    </tr>
                    <tr style="border:1px solid;">
                        <td colspan="2" style="border:1px solid;"><b>Tax {{taxPercentage}}%</b></td>
                        <td style="text-align: right;font-weight: bold;border:1px solid">{{taxAmount}}</td>
                    </tr>
                    <tr style="border:1px solid;">
                        <td colspan="2" style="border:1px solid;"><b>Shipping Fee</b></td>
                        <td style="text-align: right;font-weight: bold;border:1px solid">60.00</td>
                    </tr>
                    <tr style="border:1px solid;">
                        <td colspan="2" style="border:1px solid;"><b>Total Price</b></td>
                        <td style="text-align: right;font-weight: bold;border:1px solid">{{finalAmount}}</td>
                    </tr>
                </table>
            <p style="font-size: .7rem;"><b>Decalartion : </b>The goods sold are indeded for end user consumption and not for resale</p>
        </div>
        <footer style="position: absolute;bottom: 0;">
        <p style="font-size: .8rem;"><b>Shopsy Ecommerce Pvt. Ltd.</b>
        123, Market Plaza,
        Green Street, Sector 21,
        New Town, Metro City,
        State: XYZ
        PIN: 560001
        Phone: +91 98765 43210</p>
        <div style="border-top: 1px dotted;">
        <p style="text-align: end;margin: 0;">Page 1 of 1</p>
        </div>
    
        </footer>
    </body>
    </html>
    `
        const compiledInvoice = handlebars.compile(invoiceHtml)
        const data = {
            items:orderDetails,
            totalPrice,
            finalAmount,
            taxPercentage,
            discount,
            taxAmount,
            invoiceNo
        }
        const pupInvoice = compiledInvoice(data)
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox', 'allow-file-access-from-files'] });
        const page = await browser.newPage();
        await page.setContent(pupInvoice);
        
        const pdfBuffer = await page.pdf({ format: 'A4' });
        const pathName = './testpdfbufer.pdf'
        fs.writeFileSync(pathName, pdfBuffer)
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderObjectId}.pdf`);
        res.download(pathName, 'testpdfbufer.pdf', (error) => {
            if(error){
                throw new Error(error.message)
            }
            console.log('file send to the frontend')
        })
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ success: false, message: 'Failed to generate invoice' });
    }
};

const loadReferralsPage = async (req, res) => {
    const {user} = req.query
    try {
        //inital load
        console.log('user id :: ', user)
       const findUser = await User.findOne({_id:user})
       
       console.log('referral code = ', findUser.referalCode)
       const referralUrl = findUser.referalCode
       let referredBy = findUser.referredBy || null
       console.log('referredbyUser', referredBy)
       let userIsReffered
       if(referredBy){
        const referrer = await User.findOne({_id:referredBy})
        referredBy = referrer.name
        userIsReffered = true
       }else{userIsReffered = false}
       console.log('reered user name', referredBy)
        res.render('user/referral', {
            layout:'user/main',
            referralUrl,
            referredBy,
            userIsReffered
        })
    } catch (error) {
        console.log(error)
    }
}

const generateReferralLink = async (req, res) => {
    const {user} = req.query
    try {
        if(!user) throw new Error('Invalid user id, from the fronend')
        const findUser = await User.findOne({_id: new mongoose.Types.ObjectId(user)})
        if(!findUser) return res.status(400).json({success:false, message:'User not found!'})
        
        const ref = `REFSPY${user.toString().slice(-6)}`
        const saveReferralUrl = await User.updateOne({_id:user}, {$set:{referalCode:ref}})
        console.log(saveReferralUrl)
        return res.json({success:true, message:'Your referral link was generated, you can share this link with your friends!'})
    } catch (error) {
        console.log('error occured while generating the referral link', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

const applyReferralCode = async (req, res) => {
    console.log('function from server called successfully')
    const {referrer} = req.query
    try {
        const {referralCode} = req.body
        //check the owner
        const findReferrer = await User.findOne({referalCode:referralCode})
        if(!findReferrer) return res.status(404).josn({success:false, title:'Invalid', message:'Sorry, we can find the referrer, check the code!'})
        //check if the code is already used?
        const alreadyUsed = await User.findOne({redeemedUsers:{$in:[referrer]}})
        if(alreadyUsed) return res.status(400).json({success:false, title:'Invalid', message:'You have already used this code!'})
        //update code used status
        //find referree
        const referree = await User.findOne({_id:referrer})
        if(!referree) throw new Error('Invalid user')
        referree.referredBy = findReferrer._id
        findReferrer.redeemedUsers.push(referree._id)

        await referree.save()
        await findReferrer.save()

        //update wallet
        const referreeWallet = await Wallet.findOne({userId:referree})
        if(!referreeWallet){
            
            const newUserWallet = new Wallet({
                userId:referree._id,
                balance:10,
                transactions:[
                    {
                        transactionType:"Credit",
                        amount:10,
                        date:new Date(),
                        status:"Completed",
                        description:"Welcome Bonus!"
                    }
                ]

            })
            await newUserWallet.save()

            newUserWallet.transactions?.push({
                transactionType:"Credit",
                amount:50,
                date:new Date(),
                status:"Completed",
                description:"Referral Bonus"
            })
            newUserWallet.balance += 50
            await newUserWallet.save()
        }else{
            referreeWallet.transactions?.push({
                transactionType:"Credit",
                amount:50,
                date:new Date(),
                status:"Completed",
                description:"Referral Bonus"
            })
            referreeWallet.balance += 50
            await referreeWallet.save()
        }

        return res.json({success:true})
        } catch (error) {
        console.log('error occured while handling apply referral code', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}
module.exports = {
    loadUserHome,
    searchProducts,
    loadUserProfile,
    userAddressAdd, 
    fetchEditDetails,
    userAddressEdit,
    userAddressDelete,
    productListPage,
    productDetails,
    loadCartPage,
    addToCart,
    cartQuantityUpdate,
    removeFromCart,
    proceedToCheckout,
    paymentConfirm,
    placeOrder,
    loadChekoutPge,
    loadSignupPage,
    loadLogin,
    login,
    signup,
    verifyOtp,
    resendOtp,
    logout,
    pageNotFound,
    countCartItems,
    loadPasswordresetRequestPage,
    sendPasswordResetLink,
    loadPaswordResetPage,
    updatePassword,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    CheckWishlist,
    applyCoupon,
    cancelOrderPayment,
    failedOrders,
    userOrders,
    userOrderDetails,
    cancelOrder,
    returnRequest,
    getWallet,
    createWallet,
    getCoupons,
    downloadInvoice,
    loadReferralsPage,
    generateReferralLink,
    applyReferralCode
}