const express = require('express')
const Order = require('../../models/ordersModel')
const moment = require('moment')
const PdfDocument = require('pdfkit')
const ExcelJS = require('exceljs')
const fs = require('fs')
const router = express.Router()


const getWeekStartAndEnd = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Monday as the start

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0); // Start of day

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // End of day

    return { startOfWeek, endOfWeek };
}


const loadSalesReportPage = async (req, res) => {
    const range = req.query.range || 'monthly'
    let filterDate = {}
    let sendData
    let currentFilter = 'monthly'
    let startDate, endDate
    // const formatedSales = []
    let sampleData
    
    try {

        if(range){
            console.log('this is range : ', range)
            if(range === 'daily'){
                filterDate = {createdAt:{$gte:moment().startOf('day').toDate(), $lte:moment().endOf('day').toDate()}}
                currentFilter = 'daily'
                const formatedSales = await Order.aggregate([
                    {$match:{
                        createdAt:{$gte:moment().startOf('day').toDate(), $lte:moment().endOf('day').toDate()},
                        status:{$in:["Processing", "Shipped", "Delivered"]}
                    }}, 
                    {$group:{
                        _id:null,
                        totalSales:{$sum:{$ifNull:["$finalAmount", 0]}},
                        totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
                    }}
                ])
                const dailyData = formatedSales.map((data) => {
                    return {
                        sales:data.totalSales,
                        discount:data.totalDiscount
                    }
                })
                console.log('fomated data', dailyData)
                sampleData = dailyData
            }else if(range === 'weekly'){
                filterDate = {createdAt:{$gte:moment().startOf('week').toDate(), $lte:moment().endOf('week').toDate()}}
                currentFilter = 'weekly'
                console.log('filter date for week', filterDate)
                // const startWeek = moment().startOf('week').toDate()
                // const endWeek = moment().endOf('week').toDate()
                const {startOfWeek, endOfWeek} = getWeekStartAndEnd()
                console.log('start and end week', startOfWeek, endOfWeek)
                const formatedSales = await Order.aggregate([
                    {$match:{
                        createdAt:{$gte:startOfWeek, $lte:endOfWeek},
                        status:{$in:["Processing", "Delivered", "Shipped"]}
                    }},
                    {$group:{
                        _id:"$createdAt",
                        totalSales:{$sum:{$ifNull:["$finalAmount", 0]}},
                        totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
                    }}
                    // {$match:{
                    //     createdAt:{$gte:startOfWeek},
                    //     createdAt:{$lte:endOfWeek},
                    //     status:{$in:["Processing", "Shipping", "Delivered"]}
                    // }},
                    // {$group:{
                    //     _id:"$createdAt",
                    //     totalSales:{$sum:{$ifNull:["$finalAmount", 0]}},
                    //     totalDiscount:{$sum:{$ifNull:["finalAmount", 0]}}
                    // }},
                    // {$sort:{"_id.dayOfWeek":1}}
                ])
                const weeklyData = formatedSales.map((data) => {
                    return {
                        // day:data._id.dayOfWeek,
                        day:data._id.getDay(),
                        sales:data.totalSales,
                        discount:data.totalDiscount
                    }
                })
                // console.log(moment().startOf('isoWeek').toDate())
                // console.log(moment().endOf('isoWeek').toDate())

                sampleData = weeklyData
                console.log('weekly data', formatedSales)
            }else if(range === 'monthly'){
                filterDate = {createdAt:{$gte:moment().startOf('month').toDate(), $lte:moment().endOf('month').toDate()}}
                currentFilter = 'monthly'
                const currentYear = new Date().getFullYear()
                const formatedSales = await Order.aggregate([
                    {$match:{
                        createdAt:{$gte:new Date(`${currentYear}-01-01`)},
                        createdAt:{$lt:new Date(`${currentYear + 1}-01-01`)},
                        status:{$in:["Processing", "Shipping", "Delivered"]}

                    }},
                    {$group:{
                        _id:{month:{$month:"$createdAt"}},
                        totalSales:{$sum:{$ifNull:["$finalAmount", 0]}},
                        totalDiscount:{$sum:{ifNull:["$discount", 0]}}
                    }},
                    {$sort:{"_id.month":1}}
                ])
                
                const monthlyData = formatedSales.map((data) => {
                    return {
                        month:data._id.month,
                        sales:data.totalSales,
                        discount:data.totalDiscount
                    }
                })

                sampleData = monthlyData
                

            }else if(range === 'yearly'){
                filterDate = {createdAt:{$gte:moment().startOf('year').toDate(), $lte:moment().endOf('year').toDate()}}
                currentFilter = 'yearly'
                // const testData = await Order.aggregate([
                //     {$match:{createdAt:{$gte:new Date('2020-')}}}
                // ])
                const formatedSales = await Order.aggregate([
                    {$match:{
                        createdAt:{$gte:new Date('2020-01-01')},
                        status:{$in:["Processing", "Shipped", "Delivered"]}
                    }},
                    {$group:{
                        _id:{year:{$year:"$createdAt"}},
                        totalSales:{$sum:{$ifNull:["$finalAmount", 0]}},
                        totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
                    }},
                    {$sort:{"_id.year":1}}
                ])
                const yearlyData = formatedSales.map((data) => {
                    return {
                        year:data._id.year,
                        sales:data.totalSales,
                        discount:data.totalDiscount
                    }
                })
                // console.log('formated sales data', formatedSales)
                console.log('formated yearly data', yearlyData)
                sampleData = yearlyData
                // console.log('Formated sales : ', formatedSales)
                // console.log('yearly seperated data :', yearlyData)
            }else if(range === 'custom'){
                console.log('before converting date :::: ')
                console.log('start date : ', req.query.startDate)
                console.log('end date : ', req.query.endDate)
                startDate = new Date(req.query.startDate)
                endDate = new Date(req.query.endDate)
                console.log('after converting date :::: ')
                console.log('start date : ', startDate)
                console.log('end date : ', endDate)
                filterDate = {createdAt:{$gte:startDate, $lte:endDate}}
                const formatedSales = await Order.aggregate([
                    {$match:{
                        ...filterDate,
                        status:{$in:["Processing", "Shipped", "Delivered"]}
                    }},
                    {$group:{
                        _id:null,
                        totalSales:{$sum:{$ifNull:["$finalAmount", 0]}},
                        totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
                    }},
                ])
                const customData = formatedSales.map((data) => {
                    return {
                        sales:data.totalSales,
                        discount:data.totalDiscount
                    }
                })
                sampleData = customData
                console.log('custome data', formatedSales)
            }else{
                throw new Error('Error occured in range')
            }
            
            // const aggregatedSales = await Order.aggregate([
            //     {$match:{
            //         ...filterDate,
            //         status:{$in:["Processing","Shipped","Deliverd"]}
            //     }},
            //     {$group:{
            //         _id:null, 
            //         totalOrderAmount:{$sum:{$ifNull:["$finalAmount", 0]}}, 
            //         totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
            //     }}
            // ])
            let currentYear = new Date().getFullYear()
            const orders = await Order.find(
                {...filterDate,
                status:{$in:["Processing", "Shipping", "Delivered"]}}
            ).countDocuments()
            // console.log('aggregated results for sales report!', aggregatedSales)
            // const orderAmount = aggregatedSales[0]?.totalOrderAmount
            // const discountAmount = aggregatedSales[0]?.totalDiscount
            let tileOrderAmount
            let tileDiscount
            if(range === 'monthly'){
                let thisMonth = new Date().getMonth() + 1
                console.log('current month', thisMonth)
                tileOrderAmount = sampleData.find((thisMonthItem) => {
                    return thisMonthItem.month === thisMonth
                }).sales
                tileDiscount = sampleData.find((thisMonthItem) => {
                    return thisMonthItem.month === thisMonth
                }).discount

            }else{
                tileOrderAmount = sampleData.reduce((acc, cur) => {
                    return acc += cur.sales
                }, 0)

                tileDiscount = sampleData.reduce((acc, cur) => {
                    return acc += cur.discount
                }, 0)
            }
            console.log(tileOrderAmount)
            console.log(tileDiscount)
            
            let tileSales = tileOrderAmount - tileDiscount
            return res.render('admin/salesReport', {
                layout:'admin/main',
                orderAmount:tileOrderAmount || 0,
                discountAmount:tileDiscount || 0,
                sales:tileSales || 0,
                orders,
                currentFilter,
                sampleData:JSON.stringify(sampleData)
            })

        }else{
            const aggregatedSales = await Order.aggregate([
                {$match:{
                    status:{$in:["Processing","Shipped","Deliverd"]}
                }},
                {$group:{
                    _id:null, 
                    totalOrderAmount:{$sum:{$ifNull:["$finalAmount", 0]}}, 
                    totalDiscount:{$sum:{$ifNull:["$discount", 0]}}
                }}
            ])
    
            const orders = await Order.find({status:{$in:["Processing", "Shipped", "Delivered"]}}).countDocuments()
            console.log('aggregated results for sales report!', aggregatedSales)
            const orderAmount = aggregatedSales[0]?.totalOrderAmount
            const discountAmount = aggregatedSales[0]?.totalDiscount
            return res.render('admin/salesReport', {
                layout:'admin/main',
                orderAmount:orderAmount || 0,
                discountAmount:discountAmount || 0,
                sales:orderAmount - discountAmount || 0,
                orders,
                currentFilter:'monthly'
            })
        }

        
    } catch (error) {
        console.log('error occured while rendering the sales report!', error)
        return res.redirect('/pageError')   
    }
}

const filterSalesReport = async (req, res) => { //abandon
    const {range} = req.body
    try {
        const filterDate = {}
        if(range === 'daily'){
            filterDate = {createdAt:{$gte:moment().startOf('day').toDate(), $lte:moment().endOf('day').toDate()}}
        }else if(range === 'weekly'){
            filterDate = {createdAt:{$gte:moment().startOf('week').toDate(), $lte:moment().endOf('week').toDate()}}
        }else if(range === 'monthly'){
            filterDate = {createdAt:{$gte:moment().startOf('month').toDate(), $lte:moment().endOf('month').toDate()}}
        }else if(range === 'yearly'){
            filterDate = {createdAt:{$gte:moment().startOf('year').toDate(), $lte:moment().endOf('year').toDate()}}
        }else{
            throw new Error('Error in range')
        }


    } catch (error) {
        console.log('error occured while filtering,', error)
        res.redirect('/pageError')
    }

}

const downloadPdf = async (req, res) => {
    console.log('printing request reached here')
    const {range} = req.body
    let rangeFilter = {}
    try {
        if(range === 'daily'){
            rangeFilter = {createdAt:{$gte:moment().startOf('day').toDate(), $lte:moment().endOf('day').toDate()}}
        }else if(range === 'weekly'){
            rangeFilter = {createdAt:{$gte:moment().startOf('week').toDate(), $lte:moment().endOf('week').toDate()}}
        }else if(range === 'monthly'){
            rangeFilter = {createdAt:{$gte:moment().startOf('month').toDate(), $lte:moment().endOf('month').toDate()}}
        }else if(range === 'yearly'){
            rangeFilter = {createdAt:{$gte:moment().startOf('year').toDate(), $lte:moment().endOf('year').toDate()}}
        }else{
            throw new Error('Error in range')
        }

        const aggregatedSales = await Order.aggregate([
            {$match:{
                status:{$in:["Processing", "Shipped", "Delivered"]},
                ...rangeFilter
            }},
            {$group:{
                _id:null,
                totalOrderAmount:{$sum:"$finalAmount"},
                totalDiscountAmount:{$sum:"$discount"}
            }}
        ])
        const orderAmount = aggregatedSales[0]?.totalOrderAmount
        const discountAmount = aggregatedSales[0]?.totalDiscountAmount
        const sales = orderAmount - discountAmount || 0
        const totalOrders = await Order.find({
            status:{$in:["Processing", "Shipped", "Delivered"]},
            ...rangeFilter
        }).countDocuments()

        const doc = new PdfDocument()
        const filepath = './sales-report.pdf'

        doc.pipe(fs.createWriteStream(filepath))

        //doc.image('/images/frontend/shopy logo.png', 50, 50, {width:100})
        doc.fontSize(18).text('Shopsy', { align: 'center' }).moveDown();

        // Add Report Title
        doc.fontSize(20).text('Sales Report', { align: 'center' }).moveDown();
        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' }).moveDown();
        doc.moveDown();

        // Draw a Line Under the Title for Separation
        doc.moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .stroke();

        // Create a Table
        doc.moveDown(2);
        doc.fontSize(12);

        // Table Headers
        doc.text(`Total Orders : ${totalOrders ?? 0}`);
        //doc.text(`${totalOrders ?? 0}`, { width: 100, align: 'right' }).moveDown();

        doc.text(`Net Sales : Rs.${orderAmount ?? 0}`);
        //doc.text(`Rs. ${orderAmount ?? 0}`, { width: 100, align: 'right' }).moveDown();

        doc.text(`Total Discounts : Rs${discountAmount ?? 0}`);
        //doc.text(`Rs. ${discountAmount ?? 0}`, { width: 100, align: 'right' }).moveDown();

        doc.text(`Overall Sales : Rs.${sales ?? 0}`);
        //doc.text(`Rs. ${sales ?? 0}`, { width: 100, align: 'right' }).moveDown();

        // Optional: Add more rows as needed

        // Add Footer (Page Number, etc.)

        doc.end();
        console.log('everything is ok ready to be downloaded!!!')
        res.download(filepath, (error) => {
            if(error){
                return console.log('Error ocured while sending dowload response to the user', error)
            }
            console.log('File send to the client!')
            fs.unlinkSync(filepath)
            console.log('File deleted after sending!')
        })
        //res.json({success:true, message:'Download file ready!'})

    } catch (error) {
        console.log('Error occured while generating the sales details', error)
        return res.redirect('/pageNotFound')
    }
}

const dowloadExcel = async (req, res) => {
    const {range} = req.body
    let rangeFilter = {}
    console.log('full filter :: ', req.body)
    console.log('range is here', range)
    //return res.status(500).json({success:false, message:'pipeline checking'})
    try {
        if(range === 'daily'){
            rangeFilter = {createdAt:{$gte:moment().startOf('day').toDate(), $lte:moment().endOf('day').toDate()}}
        }else if(range === 'weekly'){
            rangeFilter = {createdAt:{$gte:moment().startOf('week').toDate(), $lte:moment().endOf('week').toDate()}}
        }else if(range === 'monthly'){
            rangeFilter = {createdAt:{$gte:moment().startOf('month').toDate(), $lte:moment().endOf('month').toDate()}}
        }else if(range === 'yearly'){
            rangeFilter = {createdAt:{$gte:moment().startOf('year').toDate(), $lte:moment().endOf('year').toDate()}}
        }else{
            throw new Error('Error in range')
        }

        const aggregatedSales = await Order.aggregate([
            {$match:{
                status:{$in:["Processing", "Shipped", "Delivered"]},
                ...rangeFilter
            }},
            {$group:{
                _id:null,
                totalOrderAmount:{$sum:"$finalAmount"},
                totalDiscountAmount:{$sum:"$discount"}
            }}
        ])
        const orderAmount = aggregatedSales[0]?.totalOrderAmount
        const discountAmount = aggregatedSales[0]?.totalDiscountAmount
        const sales = orderAmount - discountAmount || 0
        const totalOrders = await Order.find({
            status:{$in:["Processing", "Shipped", "Delivered"]},
            ...rangeFilter
        }).countDocuments()

        const workbook = new ExcelJS.Workbook()
        const workSheet = workbook.addWorksheet('Sales Report')
        workSheet.columns = [
            {header:'Metrix', key:'metric', width:25},
            {header:'Value', key:'value', width:20}
        ]

        workSheet.addRow({metric:'Total Orders', value:`${totalOrders}`})
        workSheet.addRow({metric:'Net Sales', value:`Rs.${orderAmount}`})
        workSheet.addRow({metric:'Total Discount', value:`Rs.${discountAmount}`})
        workSheet.addRow({metric:'Overall Sales', value:`Rs.${sales}`})

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        //await workbook.xlsx.writeFile('./sales-report.xlsx')
        await workbook.xlsx.write(res)
        res.end()
 
    }catch(e){
        console.log('error occured while generating excel report!', e)
        res.redirect('/admin/pageError')
    }
}

module.exports = {
    loadSalesReportPage,
    filterSalesReport,
    downloadPdf,
    dowloadExcel
}