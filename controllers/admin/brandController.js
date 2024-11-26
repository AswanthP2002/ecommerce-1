const Brand = require('../../models/brandModel')
const fs = require('fs')


const loadBrandPage = async (req, res) => {
    try {
        const brands = await Brand.aggregate([
            {$lookup: {
                from: 'products',
                localField: '_id',
                foreignField: 'brand',
                as: 'productDetails'
              }},
              {$addFields:{
                totalProducts:{$size:"$productDetails"}
              }}
        ])
        
        return res.render('admin/brands', {
            layout:'admin/main',
            brands
        })
    } catch (error) {
        console.log('error occured while rendering brands page', error)
        return res.redirect('/admin/pageError')
    }
}

const addBrand = async (req, res) => {
    try {
        //testing pipeline
        console.log('request body :: ', req.body)
        // console.log('request files :: ', req.file)
        //return res.status(400).json({success:false,title:'Maintanance', message:'Checking Pipeline'})
        //find if the brand is already exists??
        const isExisting = await Brand.find({brandName:req.body.brandName})
        if(isExisting.length > 0){
            console.log('duplicate invoked!')
            console.log(isExisting)
            return res.json({success:false, message:'Brand is already exist with this name'})
        }
        const newBrand = new Brand({
            brandName:req.body.brandName,
            brandImage:req.file?.filename || 'testNameforFile'
        })

        await newBrand.save()

        const existingImagePath = `public/images/backend/products/tempImage/${newBrand.brandImage}`
        fs.mkdirSync(`public/images/backend/brands/${newBrand.brandName}`, {recursive:true})
        const newPath = `public/images/backend/brands/${newBrand.brandName}/${newBrand.brandImage}`
        fs.rename(existingImagePath, newPath, (err) => {
            if(err){
                throw new Error(err)
            }
            console.log('Brand image moved to specified folder')
        })
        console.log('brand saved')
        return res.json({success:true, message:'New brand addedd successfully!'})
    } catch (error) {
        console.log('error occured while adding brand ::', error)
        return res.status(500).json({success:false, title:'Error', message:'Internal Server Error, please try again after sometime!'})
    }
}

const unblockBrand = async (req, res) => {
    const {brandId} = req.query
    try {
        const unblockBrand = await Brand.updateOne({_id:brandId}, {$set:{isBlocked:false}})
        if(unblockBrand.modifiedCount === 0){
            throw new Error('Brand not found!')
        }
        return res.json({success:true, message:'Brand unblocked successfully!'})
    } catch (error) {
        console.log('error occured while unblocking the brand', error)
        return res.status(500).json({success:false, message:'Sever Error, please try again after sometime!'})
    }
}

const blockBrand = async (req, res) => {
    const {brandId} = req.query
    try {
        const blockBrand = await Brand.updateOne({_id:brandId}, {$set:{isBlocked:true}})
        if(blockBrand.modifiedCount === 0){
            throw new Error('Brand not found!')
        }
        return res.json({success:true, message:'Brand Blocked successfully!'})
    } catch (error) {
        console.log('error occured while blocking the brand', error)
        return res.status(500).json({success:false, message:'Sever Error, please try again after sometime!'})
    }
}


module.exports = {
    loadBrandPage,
    addBrand,
    blockBrand,
    unblockBrand
}