const express = require('express')
const nodeMailer = require('nodemailer')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const env = require('dotenv').config()
const {v4:uuidv4} = require('uuid')
const Razorpay = require('razorpay')
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
    
    //console.log('This is match criteria', matchCriteria)
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
        //console.log('all set with product details rendered')
        return res.render('user/product-list', {
            layout:'user/main',
            product:productDetails,
            currentSort,
            category
        })

            console.log('sort criteria', sortCriteria)
            /*const productDetails = await Product.aggregate([
                {$lookup:{
                    from:'variants',
                    localField:'variants',
                    foreignField:'_id',
                    as:'variantDetails'
                }},
                {$unwind:"$variantDetails"},
                {$match:{"variantDetails.size":"small"}},
                {$lookup:{
                    from:'categories',
                    localField:'category',
                    foreignField:'_id',
                    as:'categoryDetails'
                }},
                {$unwind:"$categoryDetails"},
                {$match:{"categoryDetails.isListed":true, isBlocked:false}},
                {$sort:sortCriteria}
            ])
            console.log('sort criteria worked')
            return res.render('user/product-list',{
                layout:'user/main',
                product:productDetails,
                currentSort,
                category
            })
        /*}else if(Object.keys(matchCriteria).length > 0){
            const productDetails = await Product.aggregate([
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
                {$unwind:"$categoryDetails"},
                {$match:{"categoryDetails.isListed":true, isBlocked:false}},
                {$match:matchCriteria}
            ])

            console.log('all set filter')
            console.log('filtered products', productDetails)
            return res.render('user/product-list', {
                layout:'user/main',
                product:productDetails,
                category
            })
        } else{
            const productDetails = await Product.aggregate([
                {$lookup:{
                    from:'variants',
                    localField:'variants',
                    foreignField:'_id',
                    as:'variantDetails'
                }},
                {$unwind:"$variantDetails"},
                {$match:{"variantDetails.size":"small"}},
                {$lookup:{
                    from:'categories',
                    localField:'category',
                    foreignField:'_id',
                    as:'categoryDetails'
                }},
                {$unwind:"$categoryDetails"},
                {$match:{"categoryDetails.isListed":true, isBlocked:false}},
            ])
            console.log('normal products worked')
            return res.render('user/product-list', {
                layout:'user/main',
                product:productDetails,
                category
            })
        }*/
        
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
        //console.log('This is the product details when details page loads') //testing
        //console.log(productDetails)
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
        // const user = req.session.user
        // //console.log('passport logined user', req.user)
        // if(user){
        //     console.log('session when user exists //', req.session) //testing
        //     const userData = await User.findOne({_id:user}).lean()
        //     // console.log(userData)
        //     const productDetails = await Product.aggregate([
        //         {$lookup: {
        //             from: 'variants',
        //             localField: 'variants',
        //             foreignField: '_id',
        //             as: 'variantDetails'
        //           }},
        //           {$lookup: {
        //             from: 'categories',
        //             localField: 'category',
        //             foreignField: '_id',
        //             as: 'categoryDetails'
        //           }},
        //           {$limit:4}
        //     ])
        //     // console.log(productDetails)
        //     const reviews = await ServiceReview.find().lean()
        //     // console.log(reviews)
        //     res.render('user/home',{
        //         layout:'user/main',
        //         user:userData,
        //         products:productDetails,
        //         reviews:reviews
        //     })
        // }else if(req.user){
        //     const userData = await User.findOne({_id:req.user._id}).lean()
        //     const productDetails = await Product.aggregate([
        //         {$lookup: {
        //             from: 'variants',
        //             localField: 'variants',
        //             foreignField: '_id',
        //             as: 'variantDetails'
        //           }},
        //           {$lookup: {
        //             from: 'categories',
        //             localField: 'category',
        //             foreignField: '_id',
        //             as: 'categoryDetails'
        //           }},
        //           {$limit:4}
        //     ])
        //     // console.log(productDetails)
        //     const reviews = await ServiceReview.find().lean()
        //     // console.log(reviews)
        //     res.render('user/home',{
        //         layout:'user/main',
        //         user:userData,
        //         products:productDetails,
        //         reviews:reviews
        //     })
        // }else{
            
        // }
        //console.log('session when user dont exists', req.session) //testing
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
                  {$sort:{createdAt:-1}},
                  {$limit:4}
            ])
            // console.log(productDetails)
            const reviews = await ServiceReview.find().lean()
            // console.log(reviews)
            return res.render('user/home', {
                layout:'user/main',
                products:productDetails,
                newArrivals,
                reviews:reviews
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
    
    try {  //cleared repeated checking of user // since alredy applied user authentication middleware
        //if(userId){ //check if the user is loged in or not
            //if(req.session.user){
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
            //}else{
            //res.redirect('/user_login') //else redirect user to login
            //}   
        //}
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
        const orderObjectId = orderDetails[0]._id
        const orderRecord = orderDetails[0].record
        const {totalPrice, finalAmount} = orderDetails[0]

        return res.render('user/orderDetails', {
            layout:'user/main',
            orderDetails,
            shippingAddress,
            paymentStatus,
            orderObjectId,
            orderRecord,
            totalPrice,
            finalAmount
            
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
        //console.log('full address list', addressArray)
        const editableAddress = addressArray.find((address) => {
            return address._id == addressId
        })
        //console.log('request address id', addressId)
        //console.log('Editable address', editableAddress)

        return res.json({success:true, editableAddress})
    } catch (error) {
        console.log('error occured while fetching the address details')
        return res.status(500).json({message:'Internal Server Error, please try again after sometime'})
    }
}

const userAddressEdit = async (req, res) => {
    const addressId = req.query.addressId
    //const user = req.session.user  //changed : Applicable to both traditional login & passport login
    let user
    if(req.user){
        user = req.user._id
    }else if(req.session.user){
        user = req.session.user
    }else{
        return res.redirect('/pageNotFound')

    }
    
    //console.log('request for edit address reached here')
    //console.log('requested address id', addressId)
    //console.log(user)
    //console.log('request terminated for current fixing')
    //return res.redirect('/pageNotFoud') //checking
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
        //const cart = await Cart.findOne({userId:userId}).lean()
        //const product = await Product.findOne({_id:cart.items.})

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
            { $unwind: "$categoryDetails" }

        ])
        console.log('cart details')
        //console.log(cart)
        //payment details
        // const subTotal = cart.reduce((total, item) => {
        //     return total + (item.vriantDetails.regularPrice * item.items.quantity)
        // }, 0) commented because it was decalred more structured way down ==>

        function totalCartPrice(cart){
            const discountedValue = cart.reduce((total, item) => {
                return total + ((item.vriantDetails.regularPrice - item.vriantDetails.offerPrice) * item.items.quantity) 
            }, 0)
            const subTotal = cart.reduce((total, item) => {
                return total + (item.vriantDetails.regularPrice * item.items.quantity)
            }, 0)

            const grantTotal = (subTotal - discountedValue) + 60
            console.log('discount value ',discountedValue)

            return {
                subTotal,
                discountedValue,
                grantTotal,
                savedValue:discountedValue - 60
            }
        }
        const {discountedValue, subTotal, grantTotal, savedValue} = totalCartPrice(cart)

        res.render('user/cart', {
            layout:'user/main',
            cart:cart,
            subTotal,
            discountedValue,
            grantTotal,
            savedValue
        })
    } catch (error) {
        console.log('cart error', error) //this is only for testing
    }
}

const addToCart = async (req, res) => {
    const id = req.query.product
    //const userId = req.query.user // Error occured, bug when user id is accessed directly from the session, since passport users are in userObject **** need to be fixed!!!
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
    //const user = req.session.user //changed : Applicable to both traditional logined user and passport login user
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
    //const userId = req.session.user //changed:Applicable to both traditional passport
    let userId
    if(req.user){
        userId = req.user._id
    }else if(req.session.user){
        userId = req.session.user
    }else{
        return res.redirect('/pageNotFound')
    }
    const {subTotal, grantTotal, discount, couponApplied} = req.body
    console.log('before redirecting to checkout page! this is applied coupon', couponApplied)
    try {
        //store details in the session
        req.session.cart = {userId, subTotal, discount, grantTotal, couponApplied}
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
        { $unwind: "$categoryDetails" }

    ])
    console.log('This is the query used to get the address', cartPayment.userId)
    const addressLists = await Adress.findOne({userId:cartPayment.userId}).lean()
    console.log('user address lisst', addressLists)
    const userWallet = await Wallet.findOne({userId:cartPayment.userId}).lean()
    //console.log(cartPayment)
    //console.log(cart)
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
    //const user = req.session.user //changed : Applicable to both passport and traditional logins
    
    let user
    if(req.user){
        user = req.user._id
    }else if(req.session.user){
        user = req.session.user
    }else{
        return  res.redirect('/pageNotFound')
    }

    if(req.query.orderId){
        console.log('currently order id exist in the query!', req.query.orderId)
        const updatePaymentStatus = await Order.updateOne({orderId:req.query.orderId},
            {paymentStatus:'Paid'}
        )
        if(updatePaymentStatus.modifiedCount === 0){
            throw new Error('Can not update payment status')
        }
        return res.json({success:true, message:'Yay! your order has been successfully placed!'})
    }
    const orderData = req.body
    console.log('This is order data :::: ',orderData)
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
        //console.log('Aggregated items', orderedItems)

        const formatOrderedItems = orderedItems.map((item) => {
            return {
                product:item.items.productId,
                quantity:item.items.quantity,
                size:item?.items?.size || 'not available',
                price:item.variantDetails.regularPrice
            }
        })
        console.log('checking the ordered items correctly maped' ,formatOrderedItems)

        const order = new Order({
            orderedItems:formatOrderedItems,
            totalPrice:orderData.totalAmount,
            finalAmount:orderData.payableAmount,
            paymentMethod:orderData.paymentMethod,
            address:orderData.selectedAddress,
            userId:new mongoose.Types.ObjectId(user)
        })

        await order.save()
        console.log('current order  => ', order)
        for(let singleItem of formatOrderedItems){
            await Variant.updateOne({productId:singleItem.product, size:singleItem.size}, {
                $inc:{quantity:-singleItem.quantity}
            })
        }
        await User.updateOne({_id:new mongoose.Types.ObjectId(user)}, {
            $push:{orders:order._id}
        })
        
        console.log('order saved')
        //remove cart after order creation
        const deleteCart = await Cart.deleteOne({userId:user})
        if(deleteCart.deletedCount > 0){
            console.log('cart deleted after placing order!')
        }

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
            return res.json(razorPayOrder)
        }
        return res.json({success:true, message:'Yay! your order has been successfully placed!'})

    } catch (error) {
        console.log('Error occured while placing the order', error)
        res.status(500).json({success:false, message:'Internal Server Error, please try again after sometimes'})
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
        //find product using reges
        console.log
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
const countCartItems = async (req, res) => {
    try {
        let user 
        if(req.session.user){
            user = req.session.user
        }else if(req.user){
            user = req.user._id
        }


        if(user){
            const cart = await Cart.findOne({userId:user})
            return cart ? cart.items.length : 0
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
        console.log('Error occured while geting the wishlisted item for icon management!', error)
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
            const resetLink = `http://localhost:5000/password/reset/${token}`
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
    //throw new Error('This is testing ERror for testing page') Testing :: Fixed the wishlist loading error
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

        console.log('user wishlist', wishlist)

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
    userOrders,
    userOrderDetails,
    cancelOrder,
    returnRequest,
    getWallet,
    createWallet,
    getCoupons
}