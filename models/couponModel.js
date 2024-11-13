const mongoose = require('mongoose')
const {Schema} = mongoose

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn:{
        type:Date,
        default:new Date(),
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerType:{
        type:String,
        enum:["fixed", "percentage"],
        default:"Percentage"
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumPrice:{
        type:Number,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true   
    },
    userId:[{
        type:Schema.Types.ObjectId,
        ref:'User'
    }]
})

const Coupon = mongoose.model('Coupon', couponSchema)
module.exports = Coupon