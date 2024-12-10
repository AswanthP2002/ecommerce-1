const handlebars = require('handlebars')
const moment = require('moment')


handlebars.registerHelper('greaterThan', (arg1, arg2) => {
    return arg1 > arg2
})
handlebars.registerHelper('lessThan', (arg1, arg2) => {
    return arg1 < arg2
})
handlebars.registerHelper('previousPage', (page) => {
    return page - 1
})
handlebars.registerHelper('nextPage', (page) => {
    return Number(page) + 1
})
handlebars.registerHelper('createPagination', (totalPages) => {
    const pagination = []
    for(let i = 1; i <= totalPages; i++){
        pagination.push(i)
    }

    return pagination
})

handlebars.registerHelper('sample', (number, page) => {
    return number == page
})

handlebars.registerHelper('offerNill', (offerPrice) => {
    return offerPrice === 0
})
handlebars.registerHelper('checkOffer', (offerPrice) => {
    return offerPrice > 0
})

handlebars.registerHelper('getImage', (images, index) => {
    return images[index]
})
handlebars.registerHelper('count', (variants) => {
    const totalQuantity = variants.reduce((acc, cur) => {
        return acc += cur.quantity
    }, 0)

    return totalQuantity
})
handlebars.registerHelper('getIndex', (category) => {
    const data = category[0]
    return data.name
})
handlebars.registerHelper('getIndex2', (arr, index, property) => {
    return arr[index][property]
})
handlebars.registerHelper('checkStatus', (currentStatus, value) => {
    return currentStatus === value
})
handlebars.registerHelper('ratingStars', (rating) => {
    let star = ''
    for(let i = 1; i <= 5; i++){
        if(i <= rating){
            star += '<span class="fa-solid fa-star checked"></span>'
        }else{
            star += '<span class="fa-solid fa-star"></span>'
        }
    }

    return new handlebars.SafeString(star)
})
handlebars.registerHelper('chunks', (reviewArray, chunkSize) => {
    const result = []
    for(let i = 0; i < reviewArray.length; i += chunkSize){
        result.push(reviewArray.slice(i, i + chunkSize))
    }
    return result
})

//refining dates
handlebars.registerHelper('getCallender', (date) => {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
})
handlebars.registerHelper('json', (data) => {
    return JSON.stringify(data)
})

handlebars.registerHelper('formatDate', (date) => {
    return moment(date).format('DD-MM-YYYY')
})
handlebars.registerHelper('isExpired', (date) => {
    const expirationDate = new Date(date)
    const today = new Date()
    return expirationDate < today
})
//get variant details
handlebars.registerHelper('getVariantPrice', (arr, findOption, property) => {
    const item = arr.find((element) => {
        return element.size === findOption
    })

    return item[property]
})

handlebars.registerHelper('checkPossitive', (number) => {
    return number > 0
})
handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});
handlebars.registerHelper('isCancelled', (status, state) => {
    return status === state
})

//testing handlebars registers
handlebars.registerHelper('eq', function(a, b) {
  return a.toString() === b.toString();
});
handlebars.registerHelper('calcTotal', function(price, quantity) {
  return price * quantity;
});

handlebars.registerHelper('getPaymentMethod', (paymentMethod) => {
    switch(paymentMethod){
        case 'cod':
            return 'Cash On Delivery'
        case 'Wallet':
            return 'Wallet'
        case 'Card':
            return 'Card'
        default:
            return 'Invalid Payment'
    }
})

handlebars.registerHelper('isCancellable', (status) => {
    return status === 'Pending' || status === 'Processing'
})
handlebars.registerHelper('isReturnable', (status) => {
    return status === 'Delivered'
})
handlebars.registerHelper('checkOfferType', (offerType) => {
    return offerType === 'percentage'
})
handlebars.registerHelper('multipleProduct', (arr) => {
    return arr.length > 1
})
handlebars.registerHelper('getorderedItemsCount', (arr) => {
    return arr.length - 1
})
handlebars.registerHelper('currencyFormat', (amount) => {
    let currency = Number(amount)
    return currency.toLocaleString('en-US')
})
