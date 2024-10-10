const mongoose = require('mongoose')
const {Schema} = mongoose


//small variant
const variantSchema = new Schema({
    productId:{
        type:Schema.Types.ObjectId,
        ref:'Product',
        required:true
    },
    size:{
        type:String,
        enum:['small', 'medium', 'large'],
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    offerPrice:{
        type:Number
    },
    quantity:{
        type:Number,
        required:true
    }
})

const Variant = mongoose.model('variant', variantSchema)

// //medium variant
// const variantMediumSchema = new Schema({
//     productId:{
//         type:Schema.Types.ObjectId,
//         ref:'Product',
//         required:true
//     },
//     size:{
//         type:String,
//         required:true
//     },
//     regularPrice:{
//         type:Number,
//         required:true
//     },
//     offerPrice:{
//         type:Number
//     },
//     quantity:{
//         type:Number,
//         required:true
//     }
// })

// const VariantMedium = mongoose.model('VariantMedium', variantMediumSchema)

// //large variant
// const variantLargeSchema = new Schema({
//     productId:{
//         type:Schema.Types.ObjectId,
//         ref:'Product',
//         required:true
//     },
//     size:{
//         type:String,
//         required:true
//     },
//     regularPrice:{
//         type:Number,
//         required:true
//     },
//     offerPrice:{
//         type:Number
//     },
//     quantity:{
//         type:Number,
//         required:true
//     }
// })

// const VariantLarge = mongoose.model('VariantLarge', variantLargeSchema)

module.exports = Variant