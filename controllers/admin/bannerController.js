const Banner = require('../../models/bannerModel')
const fs = require('fs')

const loadBannerSection = async (req, res) => {
    try {
        //load the page
        const landingBanners = await Banner.find({bannerType:'landing'}).lean()
        const clippingBanners = await Banner.find({bannerType:'clipping'}).lean()
        const offerBanners = await Banner.find({bannerType:'offers'}).lean()

        return res.render('admin/banners', {
            layout:'admin/main',
            landingBanners:landingBanners || null,
            clippingBanners:clippingBanners || null,
            offerBanners:offerBanners || null
        })
    } catch (error) {
        
    }
}

const addBanner = async (req, res) => {
    console.log('banner type from request body : ', req.body.bannerType)
    let resourcePath
    switch (req.body.bannerType){
        case 'Landing Banner':
            resourcePath = 'landing'
            break
        case 'Clipping Banner':
            resourcePath = 'clipping'
            break
        case 'Offer Banner':
            resourcePath = 'offers'
            break
        default:
            throw new Error('Invalid resource path!')
    }

    try {
        const newBanner = new Banner({
            bannerType:resourcePath,
            bannerImage:req.file?.filename || 'sampleName'
        })
    
        await newBanner.save()
        
        //storing correct path
        const existingImagePath = `public/images/backend/products/tempImage/${newBanner.bannerImage}`
        const newPath = `public/images/backend/banners/${resourcePath}/${newBanner.bannerImage}`

        //move it to the desired path
        fs.rename(existingImagePath, newPath, (e) => {
            if(e){
                throw new Error(e.message)
            }

            console.log('File moved to desired folder')
        })

        return res.json({success:true, message:`${resourcePath} banner added successfully!`})

    } catch (error) {
        console.log('Error occured while adding new banner', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }

}

const removeBanner = async (req, res) => {
    const {bannerId} = req.query
    try {
        //process
        const bannerDelete = await Banner.deleteOne({_id:bannerId})
        console.log(bannerDelete)
        if(bannerDelete.deletedCount === 0) throw new Error('Delete Count is zero')
        return res.json({success:true, message:'Banner deleted successfully!'})
    } catch (error) {
        console.log('error occured while deleting banner', error)
        return res.status(500).json({successs:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

module.exports = {
    loadBannerSection,
    addBanner,
    removeBanner
}