const handlebars = require('handlebars')

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
    console.log(typeof page)
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