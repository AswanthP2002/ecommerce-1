const User = require('../../models/userModel.js')

const customersInfo = async (req, res) => {
    try {
        let searchValue = ""
        if(req.query.search){
            searchValue = req.query.search
        }

        let page = 1
        if(req.query.page){
            page = req.query.page
        }
        let limit = 3
        const userData =  await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+searchValue+".*", $options:'i'}},
                {email:{$regex:".*"+searchValue+".*", $options:'i'}}
            ]
        })
        .lean()
        .limit(limit)
        .skip((page - 1) * limit)
        .exec()

        const count = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+searchValue+".*"}},
                {email:{$regex:".*"+searchValue+".*"}}
            ]
        }).countDocuments()
        let totalPage = Math.ceil(count / limit)
        console.log(userData)

        res.render('admin/customers', {
            layout:'admin/main',
            page:page,
            totalPage:totalPage,
            customers:userData
        })
    } catch (error) {
        console.log('Error occured while fetching customers information', error.message)
    }
}

const blockCustomer = async (req, res) => {
    try {
        const user = req.query.id
        await User.updateOne({_id:user},{$set:{isBlocked:true}})
        console.log('user blocked successfully') //testing
        res.redirect('/admin/customers')
    } catch (error) {
        console.log(`Error while blocking the user ${error.message}`)
        res.redirect('/pageError')
    }
}

const unblockCustomer = async (req, res) => {
    try {
        const user = req.query.id
        await User.updateOne({_id:user}, {$set:{isBlocked:false}})
        console.log('user unblocked successfully') //testing
        res.redirect('/admin/customers')
    } catch (error) {
        console.log(`Error while unblocking the customer ${error.message}`)
        res.redirect('/pageError')
    }
}



module.exports = {
    customersInfo,
    blockCustomer,
    unblockCustomer
}