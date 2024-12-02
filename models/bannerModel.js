const mongoose = require('mongoose')
const {Schema} = mongoose

const bannerSchema = new Schema({
    bannerImage:{
        type:String,
        required:true
    },
    bannerType:{
        type:String,
        enum:["clipping", "offers", "landing"],
        required:true
    }
})

const Banner = mongoose.model('Banner', bannerSchema)

module.exports = Banner