const { default: mongoose } = require("mongoose");
const Order = require("../../models/ordersModel");
const Product = require("../../models/productModel");
const User = require("../../models/userModel");
const Adress = require("../../models/addressModel");

const loadOrders = async (req, res) => {
    const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned'];
    try {
        const orders = await Order.aggregate([
            {$lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails'
              }},
              {$unwind:'$userDetails'},
              {$project:{
                _id:1,
                "userDetails.name":1,
                createdAt:1,
                finalAmount:1,
                status:1
              }}
        ])
        console.log('order aggregated items')
        console.log(orders)

        res.render('admin/orders', {
            layout:'admin/main',
            orders,
            statuses
        })
    } catch (error) {
        
    }
}

const updateOrderStatus = async (req, res) => {
    const {orderId, status} = req.body
    try {
        const updateOrder = await Order.updateOne({_id:new mongoose.Types.ObjectId(orderId)}, {
            $set:{status:status}
        })

        if(updateOrder.modifiedCount == 0){
            return res.json({success:false, message:'Sorry can not find order'})
        }

        //update history
        const order = await Order.findOne({_id:orderId})
        if(status === 'Returned'){
            order.statusHistory.push({
                status:status,
                timestamp:new Date(),
                notes:'Item Returned Amount Refunded to the customer'
            })
        }else{
            order.statusHistory.push({
                status:status,
                timestamp:new Date()
    
            })
        }
        await order.save()

        console.log('order status updated')
        return res.json({success:true, message:`Order ${orderId} status updated`})
    } catch (error) {
        console.log('error occured while updating order status', error)
        return res.status(500).json({success:false, message:'Internal Server Error please try again after some time!'})
    }
}

const viewOrders = async (req, res) => {
    const orderId = req.query.orderId
    console.log('Order veiw request reached herer')
    try {
        const orderDetails = await Order.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(orderId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            }
        ])
        console.log(orderDetails)
        const shippingAddressId = orderDetails[0].address
        console.log('shipping address', shippingAddressId)

        const addressDoc = await Adress.findOne({address:{$elemMatch:{_id:shippingAddressId}}}).lean()
        const addressArray = addressDoc.address
        const shippingAddress = addressArray.find((address) => {
            return address._id = new mongoose.Types.ObjectId(shippingAddressId)
        })

        res.render('admin/orderDetails', {
            layout:'admin/main',
            orderDetails:orderDetails[0],
            shippingAddress
        })
    } catch (error) {
        console.log('error occured while geting order details', error)
        res.redirect('/admin/pageError')
    }
}

module.exports = {
    loadOrders,
    updateOrderStatus,
    viewOrders
}