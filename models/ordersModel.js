const mongoose = require('mongoose')
const {Schema} = mongoose
const {v4:uuidv4} = require('uuid')

const orderSchema = new Schema({
    orderId:{
        type:String,
        default:() => uuidv4(),
        unique:true
    },
    razorpayOrderId:{
        type:String
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
    },
    orderedItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true   
        },
        quantity:{
            type:Number,
            required:true
        },
        size:{
            type:String,
            required:true
        },
        price:{
            type:Number,
            default:0
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    taxPercentage:{
        type:Number
    },
    taxAmount:{
        type:Number
    },
    finalAmount:{
        type:Number,
        required:true
    },
    paymentMethod:{
        type:String,
        required:true
    },
    paymentStatus:{
        type:String,
        enum:['Pending', 'Paid', 'Failed'],
        default:'Pending',
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:'Adress',
        required:true
    },
    status:{
        type:String,
        required:true,
        enum:['Awaiting Payment', 'Pending', 'Processing', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
        default:'Pending'
    },
    statusHistory:[{
        status:{type:String},
        timestamp:{type:Date, default:new Date()},
        notes:{type:String}
    }],
    couponApplied:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:new Date(),
        required:true
    },
    updatedAt:{
        type:Date
    },
    record:{
        type:String,
        default:"No Record"
    }
})

const Order = mongoose.model('Order', orderSchema)
module.exports = Order