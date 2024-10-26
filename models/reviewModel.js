const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
    customerName:{type:String},
    rating:{type:Number},
    description:{type:String},
    date:{type:Date}
})

const productReviewSchema = new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    customerName:{
        type:String,
        required:true
    },
    rating:{
        type:Number,
        required:true
    },
    feedback:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:new Date()
    }
})

const ServiceReview = new mongoose.model('reviews', reviewSchema)
const ProductReview = new mongoose.model('productreviews', productReviewSchema)

module.exports = {
    ServiceReview,
    ProductReview
}