const mongoose = require('mongoose')
const {Schema} = mongoose

const productSchema = new Schema({
    productName:{
        type:String,
        required:true
    },
    productDescription:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true   
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:'Category',
        required:true
    },
    variants:[{
        type:Schema.Types.ObjectId,
        ref:'Variants'
    }],
    color:{
        type:String,
        require:true
    },
    colorGroup:{
        type:String,
        require:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    productImage:{
        type:[String],
        require:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:['Available', 'out of stock', 'Discontinued'],
        require:true,
        default:'Available'
    }
}, {timestamp:true})


const Product = mongoose.model('Product', productSchema)

module.exports = Product