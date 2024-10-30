const express = require('express')
const nodeMailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const User = require('../../models/userModel.js')
const Product = require('../../models/productModel.js')
const {ServiceReview, ProductReview} = require('../../models/reviewModel.js')
const Variant = require('../../models/variantModel.js')
const Adress = require('../../models/addressModel.js')
const Cart = require('../../models/cartModel.js')
const { default: mongoose, STATES } = require('mongoose')
const Order = require('../../models/ordersModel.js')

//non-route functions ===> generate OTP
const generateOTP = () => {
    let otp = ""
    for(let i = 1; i <= 6; i++){
        otp += Math.floor(Math.random() * 10)
    }
    console.log(`otp before returning ${otp}`)
    return otp
}
//===> send verification code
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
    try {
        const productDetails = await Product.aggregate([

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
            {$unwind:"$categoryDetails"},
            {$match:{"categoryDetails.isListed":true, isBlocked:false}}
        ])
        res.render('user/product-list', {
            layout:'user/main',
            product:productDetails
        })
    } catch (error) {
        console.log('Error occured while loading the product list page', error.message)
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
              {$match:{_id:new mongoose.Types.ObjectId(req.query.id)}}
        ])

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
            {$match:{_id:{$ne:new mongoose.Types.ObjectId(req.query.id)},productName:{$regex:/casual/i}}},
            {$limit:4}
        ])

        const productReviews = await ProductReview.find({productId:new mongoose.Types.ObjectId(req.query.id)}).lean()
        console.log('This is the product details when details page loads') //testing
        console.log(productDetails)
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
        console.log('session when user dont exists', req.session) //testing
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
            // console.log(productDetails)
            const reviews = await ServiceReview.find().lean()
            // console.log(reviews)
            return res.render('user/home', {
                layout:'user/main',
                products:productDetails,
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
                console.log('userAddress', address)
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
        console.log('full address list', addressArray)
        const editableAddress = addressArray.find((address) => {
            return address._id == addressId
        })
        console.log('request address id', addressId)
        console.log('Editable address', editableAddress)

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
    
    console.log('request for edit address reached here')
    console.log('requested address id', addressId)
    console.log(user)
    console.log('request terminated for current fixing')
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
    console.log(req.body)
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
        console.log(cart)
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
    const {subTotal, grantTotal, discount} = req.body
    try {
        //store details in the session
        req.session.cart = {userId, subTotal, discount, grantTotal}
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

    const addressList = await Adress.findOne({userId:cartPayment.userId}).lean()

    console.log(cartPayment)
    console.log(cart)
    return res.render('user/checkout', {
        layout:'user/main',
        cart,
        cartPayment,
        addressList:addressList.address
    })
}

const paymentConfirm = async (req, res) => {
    const {paymentMethod} = req.body
    try {
        switch(paymentMethod){
            case 'cod':
                res.json({success:true, title:'Cash on Delivery', message:'You will redirect to the order placing'})
                break;
            default:
                throw new Error('Invalid')
        }
    } catch (error) {
        return res.status(500).json({success:false, message:'Internal Server Error please try after some time'})
    }


}

const placeOrder = async (req, res) => {
    console.log('request reached herer')
    //const user = req.session.user //changed : Applicable to both passport and traditional logins
    
    let user
    if(req.user){
        user = req.user._id
    }else if(req.session.user){
        user = req.session.user
    }else{
        return  res.redirect('/pageNotFound')
    }
    const orderData = req.body
    console.log(orderData)
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
        console.log('Aggregated items', orderedItems)

        const formatOrderedItems = orderedItems.map((item) => {
            return {
                product:item.items.productId,
                quantity:item.items.quantity,
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
        await User.updateOne({_id:new mongoose.Types.ObjectId(user)}, {
            $push:{orders:order._id}
        })
        
        console.log('order saved')
        return res.json({success:true, message:'Yay! your order has been successfully placed!'})

    } catch (error) {
        console.log('Error occured while placing the order', error)
        res.status(500).json({success:false, message:'Internal Server Error, please try again after sometimes'})
    }
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
    pageNotFound
}