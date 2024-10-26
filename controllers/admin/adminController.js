const User = require('../../models/userModel.js')
const bcrypt = require('bcrypt')


const pageNotFound = (req, res) => {
    res.render('admin/404',{
        layout:'admin/main'
    })
}

const loadLogin = async (req, res) => {
    if(req.session.admin){
        return res.redirect('/admin')
    }

    res.render('admin/login', {
        layout:false
    })
}

const login = async (req, res) => {
    try {
        const {email, password} = req.body
        const admin = await User.findOne({email,isAdmin:true})
        if(admin){
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if(passwordMatch){
                req.session.admin = true
                return res.redirect('/admin')
            }else{
                return res.redirect('/admin/login', {message:'Invalid Password'})
            }
        }else{
            return res.redirect('/admin/login',{message:'Can not find Admin'})
        }
    } catch (error) {
        console.log(`Error while admin login ${error.message}`)
        return res.redirect('/admin/pageError')
    }
}

const loadDashborad = async (req, res) => {
    if(req.session.admin){
        try {
            return res.render('admin/dashboard',{
                layout:'admin/main'
            })
        } catch (error) {
            console.log(error.message)
            return res.redirect('/admin/pageError')
        }
    }else{
        res.redirect('/admin/login')
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((error) => {
            if(error){
                console.log('Erroro while session destruction', error.message)
                return res.redirect('/pageError')
            }

            return res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('Logout failded due to error', error)
        res.redirect('/pageError')
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashborad,
    pageNotFound,
    logout
}