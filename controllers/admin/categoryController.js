const Category = require('../../models/categoryModel')
const Product = require('../../models/productModel')
const Variant = require('../../models/variantModel')


const categoryInfo = async (req, res) => {
    try {
        const categoryInfo = await Category.find().sort({createdAt:-1}).lean()
        res.render('admin/category', {
            layout:'admin/main',
            categoryData:categoryInfo
        })
    } catch (error) {
        console.log('Error while fetching category details', error.message)
        res.redirect('/pageError')
    }
}

const addCategory = async (req, res) => {
    
    try {
        const {name, description} = req.body
        
        const isExistingCategory = await Category.findOne({name:name})
        if(isExistingCategory){
            console.log('already exists')
            // console.log(isExistingCategory)
            return res.status(400).json({success:false, message:'Category already exists'})
        }

        const newCategory = new Category({name, description})
        await newCategory.save()
        console.log('saved')
        return res.json({success:true, message:'Category added successfully'})
    } catch (error) {
        console.log('Error while adding new Category',error.message)
        return res.status(500).json({error:'Internal Server Error'})
    }
}

const addCategoryOffer = async (req, res) => {
    try {
        const offerPercentage = Number(req.body.percentage)
        const categoryId = req.body.id
        console.log(categoryId)

        const categoryFind = await Category.findOne({_id:categoryId})
        if(!categoryFind){
            return res.status(404).json({staus:false, message:'Category not found'})
        }

        const products = await Product.find({category:categoryFind._id})
        const isPoroductOffer = products.some((product) => {return product.productOffer > offerPercentage})

        if(isPoroductOffer){
            return res.json({status:false, message:'Products within this category already have offers'})
        }

        await Category.updateOne({_id:categoryId}, {$set:{categoryOffer:offerPercentage}})
        for(let product of products){
            product.productOffer = 0
            await product.save()
            const variants = await Variant.find({productId:product._id})
            for(let variant of variants){
                variant.offerPrice = Math.floor(variant.regularPrice - ((variant.regularPrice * offerPercentage)/100))
                variant.save()
            }
        }

        res.json({status:true})
        
    } catch (error) {
        console.log(`Error while adding offer to the categories ${error.message}`)
        res.status(500).json({status:false, message:'Internal server error'})
    }
}

const removeCategoryOffer = async (req, res) => {
    const categoryId = req.body.id
    console.log(categoryId)
    try {
        const category = await Category.findById(categoryId)
    if(!category){
        return res.status(400).json({status:false, message:'No category found'})
    }

    const offerPercentage = category.categoryOffer
    const products = await Product.find({category:categoryId})

    if(products.length > 0){
        for(let product of products){
            product.productOffer = 0
            await product.save()
            const variants = await Variant.find({productId:product._id})
            for(let variant of variants){
                variant.offerPrice += Math.ceil(variant.regularPrice * (offerPercentage / 100))
                await variant.save()
            }
        }
    }

    category.categoryOffer = 0
    await category.save()
    res.json({status:true})
    } catch (error) {
        res.status(500).json({status:false, message:'Internal Server error'})
    }
}

const unlistCategory = async (req, res) => {
    const categoryId = req.query.id
    try {
        await Category.updateOne({_id:categoryId}, {$set:{isListed:false}})
        return res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while ulisting category', error.message)
        res.redirect('/pageError')
    }
}

const listCategory = async (req, res) => {
    const categoryId = req.query.id
    try {
        await Category.updateOne({_id:categoryId}, {$set:{isListed:true}})
        return res.redirect('/admin/category')
    } catch (error) {
        console.log('Error while listing the category ', error.message)
        res.redirect('/pageError')
    }
}

const fetcheditCategoryDetails = async (req, res) => {
    const categoryId = req.query.id
    try {
        const categoryDetails = await Category.findOne({_id:categoryId})
        console.log('category fetched successfully')
        return res.json({success:true, categoryDetails})
    } catch (error) {
        console.log('error occured while fetching category Details', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

const editCategory = async (req, res) => {
    const {editCategoryId, editCategoryName, editCategoryDescription} = req.body
    try {
        const updateCategory = await Category.updateOne(
            {_id:editCategoryId},
            {$set:{
                name:editCategoryName,
                description:editCategoryDescription
            }}
        )
        if(updateCategory.modifiedCount === 0){
            throw new Error('Error while updating category :: No items modified')
        }
        return res.json({success:true, message:'Category Edited Successfully'})
    } catch (error) {
        console.log('error occured while updaing the category!', error)
        return res.status(500).json({success:false, message:'Internal Server Error, please try again after sometime!'})
    }
}

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    unlistCategory,
    listCategory,
    fetcheditCategoryDetails,
    editCategory
}