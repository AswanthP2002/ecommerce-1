const Category = require('../models/categoryModel')

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
        console.log('request reached here', name)
        const isExistingCategory = await Category.findOne({name:name})
        if(isExistingCategory){
            console.log('already exists')
            console.log(isExistingCategory)
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

module.exports = {
    categoryInfo,
    addCategory
}