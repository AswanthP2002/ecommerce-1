const Product = require('../../models/productModel')
const Category = require('../../models/categoryModel')
const Variant = require('../../models/variantModel')
const Brand = require('../../models/brandModel')
const multer = require('multer')
const storage = require('../../helpers/multer-helper')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const {v4:uuidv4} = require('uuid')
const { default: mongoose } = require('mongoose')


const loadProductPage = async (req, res) => {
    try {
        let searchvalue = ""
        if(req.query.search){
            searchvalue = req.query.search
        }
        let page = 1
        if(req.query.page){
            page = parseInt(req.query.page)
        }
        let limit = 5
        let skip = (page - 1) * limit
        const productDetails = await Product.aggregate([
            {$lookup: {
                from: 'variants',
                localField: 'variants',
                foreignField: '_id',
                as: 'variantDetails'
              }},
              {$lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDetails'
              }},
              {$facet: {
                    countData: [{ $count: "totalDocs" }],
                    paginatedResults: [
                        { $skip: skip },
                        { $limit: limit }
                    ]
                }
            }
        ])
        const totalDocuments = productDetails[0]?.countData[0]?.totalDocs || 0
        const totalPage = Math.ceil(totalDocuments / limit)
        const pagination = productDetails[0]?.paginatedResults || []
        res.render('admin/products', {
            layout:'admin/main',
            products:pagination,
            page,
            totalPage
        })
    } catch (error) {
        console.log('error while fetching product lookup', error.message)
        res.redirect('/pageError')
    }
}

const getProductDetails = async (req, res) => {
    console.log(req.query.id)
    console.log('request for product fetching is reached here')
    try {
        const productDetails = await Product.aggregate([
           {$lookup:{
            from:'variants',
            localField:'variants',
            foreignField:'_id',
            as:'variantDetails'
           }},
           {$lookup:{
            from:'categories',
            localField:'category',
            foreignField:'_id',
            as:'categoryDetaisl'
           }},
           {$match:{_id:new mongoose.Types.ObjectId(req.query.id)}} 
        ])

        const product = productDetails[0]

        //console.log(productDetails)
        console.log('product details is fetched and ready to send to the forontend')
        return res.json({product})
    } catch (error) {
        console.log(`Error occured while geting product inidividual details for admin product details ${error.message}`)
        res.redirect('/pageError')
    }
    res.redirect('/pageError')
}

const addProductsPage = async (req, res) => {
    try {
        const category = await Category.find({isListed:true}).lean()
        const brands = await Brand.find({isBlocked:false}).lean()
        res.render('admin/add-product', {
            layout:'admin/main',
            categories:category,
            brands
        })
    } catch (error) {
        console.log(`Error while rendering add products page ${error}`)
        res.redirect('/pageError')
    }
}

const addProducts = async (req, res) => {
    try {
        const category = await Category.findOne({name:req.body.productCategory})
        const brand = await Brand.findOne({brandName:req.body.productBrand})

        const productName = req.body.productName
        const product = new Product({
            productName:productName,
            productDescription:req.body.productDescription,
            sku:`${uuidv4()}-${productName.slice(0,3)}-${category.name}`,
            category:category._id,
            brand:brand._id, //added brand referrence
            color:req.body.productColor,
            colorGroup:req.body.colorGroup,
            style:req.body.productStyle,
            productImage:[req.files[0].filename, req.files[1].filename, req.files[2].filename],
        })
        await product.save()

        const variantSmall = new Variant({
            productId:product._id,
            regularPrice:req.body.productPriceSmall,
            offerPrice:req.body.productPriceSmall,
            quantity:req.body.stockQuantitySmall,
            size:'small'
        })
        await variantSmall.save()

        const variantMedium = new Variant({
            productId:product._id,
            regularPrice:req.body.productPriceMedium,
            offerPrice:req.body.productPriceMedium,
            quantity:req.body.stockQuantityMedium,
            size:'medium'
        })
        await variantMedium.save()

        const variantLarge = new Variant({
            productId:product._id,
            regularPrice:req.body.productPriceLarge,
            offerPrice:req.body.productPriceLarge,
            quantity:req.body.stockQuantityLarge,
            size:'large'
        })
        await variantLarge.save()

        product.variants = [variantSmall._id, variantMedium._id, variantLarge._id]
        await product.save()
        //image handling with new SKU
        const images = [`public/images/backend/products/tempImage/${product.productImage[0]}`,`public/images/backend/products/tempImage/${product.productImage[1]}`,`public/images/backend/products/tempImage/${product.productImage[2]}`]
        fs.mkdirSync(`public/images/backend/products/${product.sku}`, {recursive:true})
        images.forEach((image) => {
            const newPath = `public/images/backend/products/${product.sku}/${image.split('/').pop()}`
            fs.rename(image, newPath, (error) => {
                if(error){
                    console.log(`Error occured while moving the images to the desired folder ${error.message}`)
                }

                console.log('image successfully saved to the desired folder')
            })
        })
        res.redirect('/admin/product')
    } catch (error) {
        console.error('error while saving the data', error.message)
    }
}

const editProductPage = async (req, res) => {
    try {
        const productDetails = await Product.aggregate([
            {$lookup:{
                from:'categories',
                localField:'category',
                foreignField:'_id',
                as:'categoryDetails'
            }},
            {$lookup:{
                from:'variants',
                localField:'variants',
                foreignField:'_id',
                as:'variantDetails'
            }},
            {$match:{_id:new mongoose.Types.ObjectId(req.query.id)}}
        ])

        const product = productDetails[0]
        //console.log(product.categoryDetails)
        console.log('Product details as an object')
        
        const categories = await Category.find({}, {_id:0, name:1}).lean()
        return res.render('admin/edit-product', {
            layout:'admin/main',
            product:product,
            category:categories
        })
    } catch (error) {
        console.error('error while rendering product edit page', error.message)
        re.redirect('/pageError')
    }
}

const editProduct = async (req, res) => {
    const productId = req.query.id
    
    try {
        //check product with that name is already exist?
        const categoryFind = await Category.findOne({name:req.body.productCategory})
        const updateFields = {
            productName:req.body.productName,
            productDescription:req.body.productDescription,
            style:req.body.productStyle,
            color:req.body.productColor,
            colorGroup:req.body.colorGroup,
            status:req.body.productStatus,
            category:categoryFind._id
        }

        const product = await Product.findById(productId)
        const existingImages = product.productImage.slice()

        const files = req.files

        Object.keys(files).forEach((key, index) => {
            const file = files[key][0]; // Access the file object for each field
            const imagePosition = parseInt(key.replace('product_images', ''), 10);

            if (existingImages[imagePosition]) {
                const oldImagePath = `public/images/backend/products/${product.sku}/${existingImages[imagePosition]}`;
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            existingImages[imagePosition] = file.filename; // Store the new file name

            const newPath = `public/images/backend/products/${product.sku}/${file.filename}`;
            fs.renameSync(`public/images/backend/products/tempImage/${file.filename}`, newPath);
            console.log(`Moved file to ${newPath}`);
        });

        console.log('Updated product images:', existingImages);
        updateFields.productImage = existingImages;

        // Update product
        const productUpdate = await Product.findByIdAndUpdate(productId, updateFields);
        console.log('Product after update:', productUpdate);
        if (!productUpdate) {
            return res.redirect('/pageError');
        }
        
        await Variant.updateOne({productId:productId, size:'small'}, {
            $set:{
                regularPrice:req.body.productPriceSmall,
                quantity:req.body.stockQuantitySmall
            }
        })

        await Variant.updateOne({productId:productId, size:'medium'}, {
            $set:{
                regularPrice:req.body.productPriceMedium,
                quantity:req.body.stockQuantityMedium
            }
        })

        await Variant.updateOne({productId:productId, size:'large'}, {
            $set:{
                regularPrice:req.body.productPriceLarge,
                quantity:req.body.stockQuantityLarge
            }
        })
        console.log('product updated successfully')   
        return res.redirect('/admin/product')    

    } catch (error) {
        console.log(`Error occured while updating the product details ${error.message}`)
        res.redirect('/pageError')
    }
}
const addProductOffer = async (req, res) => {
    console.log('offer add request reached here ')
    const id = req.body.id
    const offerPercentage = Number(req.body.offerPercentage)
    try {
        const productFind = await Product.findOne({ _id: id })
        const categoryFind = await Category.findOne({ _id: productFind.category })

        if (categoryFind.categoryOffer > offerPercentage) {
            return res.json({ status: false, message: 'This category product alredy have offers' })
        }

        const variantFind = await Variant.find({ productId: productFind._id })
        variantFind.forEach((variant) => {
            variant.offerPrice = variant.regularPrice - Math.floor((variant.regularPrice * offerPercentage) / 100)
            variant.save()
        })
        productFind.productOffer = offerPercentage
        categoryFind.categoryOffer = 0

        await productFind.save()
        await categoryFind.save()
        console.log('product offer added successfully')

        return res.json({ status: true, message: 'Product offer added successfully' })

    } catch (error) {
        res.redirect('/pageError')
        res.status(500).json({status: false, message:'Internal server Error, please try after next time'})
    }

}
const removeProductOffer = async (req, res) => {
    console.log('request reached herer')
    const productId = req.body.id
    try {
        const productFind = await Product.findOne({_id:productId})
        const variantFind = await Variant.find({productId:productId})

        productFind.productOffer = 0
        variantFind.forEach((variant) => {
            variant.offerPrice = variant.regularPrice
            variant.save()
        })
        productFind.save()

        return res.json({status:true, message:'Offer removed successfully'})
    } catch (error) {
        console.log('An error occured while removing the product', error.message)
        res.status(500).json({status:false, message:'Internal Server error please try ater sometime'})
    }
}

const blockProduct = async (req, res) => {
    try {
        const productId = req.query.id
        await Product.updateOne({_id:productId}, {$set:{isBlocked:true, status:'Discontinued'}})
        return res.redirect('/admin/product')
    } catch (error) {
        console.log('Error occured while bloking the product', error.message)
        return res.redirect('/admin/pageError')
    }
}

const unblockProduct = async (req, res) => {
    try {
        const productId = req.query.id
        const productFound = await Product.updateOne({_id:productId}, {$set:{isBlocked:false, status:'Available'}})
        if(!productFound){
            console.log('product not found')
            return res.redirect('/admin/pageError')
        }

        return res.redirect('/admin/product')
    } catch (error) {
        console.log('Error while unblocking the product', error.message)
        return res.reidirect('/admin/pageError')
    }
}

module.exports = {
    addProductsPage,
    addProducts,
    editProductPage,
    editProduct,
    blockProduct, 
    unblockProduct,
    loadProductPage,
    getProductDetails,
    addProductOffer,
    removeProductOffer
}