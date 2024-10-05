const express = require('express')

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
        return res.render('user/home', {
            layout:'user/main'
        })
    } catch (error) {
        console.log(`Error occured ${error.message}`)
        res.status(500).send('There might be an issue with the server')
    }
}

module.exports = {
    loadUserHome,
    pageNotFound
}