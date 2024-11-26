const Brand = require('../../models/brandModel.js')
const Order = require('../../models/ordersModel.js')
const Product = require('../../models/productModel.js')
const User = require('../../models/userModel.js')
const bcrypt = require('bcrypt')


const pageNotFound = (req, res) => {
    res.render('admin/404',{
        layout:'admin/main'
    })
}

const loadLogin = async (req, res) => {
    if(req.session.admin){
        return res.redirect('/admin')
    }

    res.render('admin/login', {
        layout:false
    })
}

const login = async (req, res) => {
    try {
        const {email, password} = req.body
        const admin = await User.findOne({email,isAdmin:true})
        if(admin){
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if(passwordMatch){
                req.session.admin = true
                return res.redirect('/admin')
            }else{
                return res.redirect('/admin/login', {message:'Invalid Password'})
            }
        }else{
            return res.redirect('/admin/login',{message:'Can not find Admin'})
        }
    } catch (error) {
        console.log(`Error while admin login ${error.message}`)
        return res.redirect('/admin/pageError')
    }
}

const loadDashborad = async (req, res) => {
    if(req.session.admin){
        try {
            //total users
            const totalUsers = await User.find({isBlocked:false}).countDocuments()
            const userCompleted = Math.round((totalUsers * 100) / 100)
            const userRemaining = 100 - userCompleted

            //processed orders
            const totalOrders = await Order.find().countDocuments()
            const processedOrder = await Order.find({$and:[{status:{$ne:"Processing"}}, {status:{$ne:"Pending"}}]}).countDocuments()
            const orderProcessed = Math.round((processedOrder * 100) / totalOrders)
            const remainingOrders = 100 - orderProcessed

            //order target
            const totalValidOrders = await Order.find({$and:[{status:{$ne:"Pending"}}, {status:{$ne:"Returned"}}, {status:{$ne:"Return Request"}}, {status:{$ne:"Cancelled"}}]}).countDocuments()
            const orderTargetCompleted = Math.round((totalValidOrders * 100 / 50))
            const orderTargetRemaining = 100 - orderTargetCompleted

            /**
             * best sellers
             */

            const bestSellingProducts = await Order.aggregate([
                
                { $unwind: "$orderedItems" }, 
                {
                    $group: {
                        _id: "$orderedItems.product", 
                        totalSold: {
                            $sum: "$orderedItems.quantity"
                        }, 
                        revenue: { $sum: "$orderedItems.price" } 
                    }
                },
                { $sort: { totalSold: -1 } }, 
                { $limit: 3 }, 
                {
                    $lookup: {
                        from: "products", 
                        localField: "_id",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" }, 
                {
                    $project: {
                        _id: 0,
                        productId: "$_id",
                        productName: "$productDetails.productName",
                        totalSold: 1,
                        revenue: 1,
                        image:"$productDetails.productImage",
                        sku:"$productDetails.sku"
                    }
                }
            ])

            const bestSellingCategory = await Order.aggregate([
                { $unwind: "$orderedItems" },
                {
                    $lookup: {
                        from: "products",
                        localField: "orderedItems.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'productDetails.category',
                        foreignField: '_id',
                        as: 'categoryDetails'
                    }
                },
                { $unwind: "$categoryDetails" },
                { $group: { _id: "$categoryDetails.name", totalSold: { $sum: "$orderedItems.quantity" } } },
                { $sort: { "totalSold": -1 } },
                { $limit: 3 }
            ])

            const bestSellerBrands = await Order.aggregate([
                { $unwind: "$orderedItems" },
                {
                    $lookup: {
                        from: "products",
                        localField: "orderedItems.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.brand",
                        totalSold: {
                            $sum: "$orderedItems.quantity"
                        }
                    }
                },
                { $sort: { totalSold: -1 } },
                { $limit: 3 },
                {
                    $lookup: {
                        from: "brands",
                        localField: "_id",
                        foreignField: "_id",
                        as: "brandDetails"
                    }
                },
                { $unwind: "$brandDetails" },
                {
                    $project: {
                        _id: 0,
                        brand: "$_id",
                        totalSold: 1,
                        brandName: "$brandDetails.brandName",
                        brandImage: "$brandDetails.brandImage"
                    }
                }
            ])
            /**
             * best sellers end
             */
            //data for sales chart
            const aggregatedSales = await Order.aggregate([
                {$match:{
                    status:{$in:["Processing","Shipped","Delivered"]}
                }},
                {$group:{
                    _id:null, 
                    totalOrderAmount:{$sum:{$ifNull:["$finalAmount", 0]}}, 
                    totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
                }}
            ])
            const orders = await Order.find({status:{$in:["Processing", "Shipped", "Delivered"]}}).countDocuments()
            const totalProducts = await Product.find({isBlocked:false}).countDocuments()
            const totalBrands = await Brand.find({isBlocked:false}).countDocuments()
            console.log('aggregated results for sales report!', aggregatedSales)
            const orderAmount = aggregatedSales[0]?.totalOrderAmount
            const discountAmount = aggregatedSales[0]?.totalDiscount
            
            return res.render('admin/dashboard',{
                layout:'admin/main',
                userCompleted,
                userRemaining,
                orderProcessed,
                remainingOrders,
                orderTargetCompleted,
                orderTargetRemaining,
                sales:orderAmount - discountAmount,
                activeUsers:totalUsers,
                bestSellingProducts,
                bestSellingCategory,
                bestSellerBrands,
                totalBrands,
                totalProducts
            })
        } catch (error) {
            console.log(error.message)
            return res.redirect('/admin/pageError')
        }
    }else{
        res.redirect('/admin/login')
    }
}

const logout = async (req, res) => {
    try {
        req.session.destroy((error) => {
            if(error){
                console.log('Erroro while session destruction', error.message)
                return res.redirect('/pageError')
            }

            return res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('Logout failded due to error', error)
        res.redirect('/pageError')
    }
}

module.exports = {
    loadLogin,
    login,
    loadDashborad,
    pageNotFound,
    logout
}