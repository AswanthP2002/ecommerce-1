const Coupon = require("../../models/couponModel");

const loadCouponSection = async (req, res) => {
    try {
        //get existing coupons
        const existingCoupons = await Coupon.find().lean()
        return res.render('admin/coupon', {
            layout:'admin/main',
            coupons:existingCoupons
        })
    } catch (error) {
        console.log('Error occured while rendering coupons', error)
        return res.redirect('/pageError')
    }
}

const addCoupon = async (req, res) => {
    const {couponCode, offerType, offerAmount, minimumPrice, expiryDate} = req.body
    try {
        const couponExists = await Coupon.findOne({name:couponCode})
        if(couponExists){
            return res.status(400).json({success:false, message:'Coupon Already Exist, use Different code!'})
        }

        const saveCoupn = new Coupon({
            name:couponCode,
            offerPrice:Number(offerAmount),
            offerType:offerType,
            expireOn:expiryDate,
            minimumPrice:minimumPrice
        })
        await saveCoupn.save()
        return res.json({success:true, message:'Coupon Created Successfully!'})
    } catch (error) {
        console.log('Error occured while creating coupon!', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

const removeCoupon = async (req, res) => {
    const {couponId} = req.body
    try {
        const deleteCoupon = await Coupon.deleteOne({_id:couponId})
        if(!deleteCoupon){
            throw new Error('There is no delete coupon!')
        }

        return res.json({success:true, title:'Removed', message:'Coupon Removed successfully!'})
    } catch (error) {
        console.log('Error occured while removing the ccoupon!', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

const listCoupon = async (req, res) => {
    const {couponId} = req.body
    try {
        const updateCoupon = await Coupon.updateOne({_id:couponId}, {$set:{isListed:true}})
        if(updateCoupon.modifiedCount === 0){
            return res.status(400).json({success:false, message:'Coupon not found'})
        }

        return res.json({success:true})
    } catch (error) {
        console.log('error occured while listing the coupon ', listCoupon)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after some time!'})
    }
}
const unlistCoupon = async (req, res) => {
    const {couponId} = req.body
    try {
        const updateCoupon = await Coupon.updateOne({_id:couponId}, {$set:{isListed:false}})
        if(updateCoupon.modifiedCount === 0){
            return res.status(400).json({success:false, message:'Coupon not found'})
        }

        return res.json({success:true})
    } catch (error) {
        console.log('error occured while listing the coupon ', listCoupon)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after some time!'})
    }
}

module.exports = {
    loadCouponSection,
    addCoupon,
    removeCoupon,
    listCoupon,
    unlistCoupon
}