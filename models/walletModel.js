const mongoose = require('mongoose')
const {v4:uuidv4} = require('uuid')
const {Schema} = mongoose

const walletSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    balance:{
        type:Number,
        default:0.00,
    },
    transactions:[{
        transactionId:{type:String, required:true, unique:true, default:() => uuidv4()},
        transactionType:{type:String, enum:["Debit", "Credit"]},
        amount:{type:Number, default:0.00},
        date:{type:Date, default:new Date()},
        status:{type:String, enum:["Pending", "Completed"], default:"pending"},
        description:{type:String}
    }],
    createdAt:{
        type:Date,
        default:new Date()
    },
    updatedAt:{
        type:Date,
        default:new Date()
    }
})

const Wallet = mongoose.model('Wallet', walletSchema)

module.exports = Wallet