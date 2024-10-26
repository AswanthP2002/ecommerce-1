const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
    destination:(req, file, callback) => {
        const productSku = req.body.stockKeepingUnit
        const directory = `public/images/backend/products/tempImage/`
        fs.mkdir(directory, {recursive:true}, (err) => {
            if(err){
                console.log(`Error while making directory ${err}`)
                return
            }
        })

        callback(null, directory)
    },
    filename:(req, file, callback) => {
        callback(null, file.originalname)
    }
})

const upload = multer({storage:storage})
module.exports = upload