const express = require('express')
const nodeMailer = require('nodemailer')
const bcrypt = require('bcrypt')
const env = require('dotenv').config()
const User = require('../models/userModel.js')

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
            subject:'Shopsy - email verification code',
            text:`This is your otp ${otp} for signup verification`
            // html:`<b>This is your email verification code for your signup in shopsy <i>${otp}</i></b>`
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

//load the user home page
const loadUserHome = async (req, res) => {
    try {
        const user = req.session.user
        if(user){
            const userData = await User.findOne({_id:user}).lean()
            console.log(userData)
            res.render('user/home',{
                layout:'user/main',
                user:userData
            })
        }else{
            return res.render('user/home', {
                layout:'user/main'
            })
        }
       
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
                return res.redirect('/user_login')
            }
        })
    } catch (error) {
        console.log(`user logout failed ${error.message}`)
        res.redirect('/pageNotFound')
    }
}


module.exports = {
    loadUserHome,
    loadSignupPage,
    loadLogin,
    login,
    signup,
    verifyOtp,
    resendOtp,
    logout,
    pageNotFound
}