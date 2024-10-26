const mongoose = require('mongoose')
const {Schema} = mongoose

const addressSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User'
    },
    address:[{
        name:{
            type:String,
            require:true
        },
        building:{
            type:String,
            required:true
        },
        area:{
            type:String,
            require:true
        },
        city:{
            type:String,
            require:true
        },
        state:{
            type:String,
            require:true
        },
        pinCode:{
            type:Number,
            require:true
        },
        phoneNumber:{
            type:String,
            require:true
        },
        altPhoneNumber:{
            type:String,
            require:false
        }
    }]
}) 

const Adress = mongoose.model('Adress', addressSchema)

module.exports = Adress