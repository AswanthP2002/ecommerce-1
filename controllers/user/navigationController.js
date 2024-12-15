//get about us page

const loadAboutUs = async (req, res) => {
    return res.render('user/aboutUs', {
        layout:'user/main'
    })
}

const loadCareers = async (req,res) => {
    return res.render('user/career', {
        layout:'user/main'
    })
}

const loadCustomerService = async (req, res) => {
    return res.render('user/customerService', {
        layout:'user/main'
    })
}

const loadFaq = async (req, res) => {
    return res.render('user/faq', {
        layout:'user/main'
    })
}

module.exports = {
    loadAboutUs,
    loadCareers,
    loadCustomerService,
    loadFaq
}