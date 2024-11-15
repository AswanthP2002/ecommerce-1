// toastr.options = {
//     "closeButton": false,
//     "debug": false,
//     "newestOnTop": false,
//     "progressBar": false,
//     "positionClass": "toast-top-center",
//     "preventDuplicates": false,
//     "onclick": null,
//     "showDuration": "300",
//     "hideDuration": "1000",
//     "timeOut": "2000",
//     "extendedTimeOut": "1000",
//     "showEasing": "swing",
//     "hideEasing": "linear",
//     "showMethod": "fadeIn",
//     "hideMethod": "fadeOut"
//   };

document.addEventListener('DOMContentLoaded', async (e) => {
    function manageUiForWishlistItem(){
        const wishlistedItems = document.getElementById('link-wishlist').dataset.userwishlist
        if(wishlistedItems){
            const heartIcon = document.querySelectorAll('.heart-icon')
            heartIcon.forEach((icon) => {
                const currentProduct = icon.dataset.productid
                if(wishlistedItems.includes(currentProduct)){
                    icon.classList.add('filled')
                }
            })
        }

    }
    manageUiForWishlistItem() //Managing while loading
    
    let heartIcons

    const wishlistButton = document.querySelectorAll('.wishlist-btn')
    wishlistButton.forEach((button) => {
        button.addEventListener('click', (e) => {
            console.log(e)
            heartIcons = e.target
            const productId = heartIcons.dataset.productid

            console.log('product id ::testing ::', productId)
            if(heartIcons.classList.contains('filled')){
                // alert('going to add the product to wishlist')
                removeFromWishlist(productId, heartIcons)
            }else{
                // alert('going to remove the product from wishlist')
                addToWishlist(productId, heartIcons)
            }

                return
        })
    })
})

//Add to wishlist
function addToWishlist(productId, heartIcon){
    console.log('this function invoked!')
    console.log('product id', productId)
    if(productId){
        fetch('/wishlist/add', {
            method:'POST', 
            headers:{
                'content-type':'application/json'
            },
            body:JSON.stringify({productId})
        })
        .then((response) => {
            console.log(response)
            if(!response.ok){
                alert('Something wrong with the response!')
                return Promise.reject(new Error('Promise was not ok!'))
            }else if(response.url.includes('/user_login')){
                window.location.href = response.url
                return Promise.resolve()
            }else{
                return response.json()
            }
        })
        .then((data) => {
            if(data && data.success){
                //alert(data.message) Highlight the heart icon when product added to the wishlist!!
                //toastr["success"](data.message, "Added")
                heartIcon.classList.add('filled')
                Swal.fire({
                    title:'Added',
                    icon:'success',
                    text:data.message,
                    showConfirmButton:false,
                    timer:1300
                })
            }
        })
        .catch((error) => {
            console.log(error)
            alert(error.message)
        })
    }
}
function removeFromWishlist(productId, heartIcon){
    console.log('Product id :: ', productId)
    if(productId){
        fetch('/wishlist/remove', {
            method:'POST',
            headers:{
                'content-type':'application/json'
            },
            body:JSON.stringify({productId})
        })
        .then((response) => {
            if(!response.ok){
                alert('something wrong with response!')
                Promise.reject()
            }

            return response.json()
        })
        .then((data) => {
            if(data && data.success){
                //remove the hightlight fromt the red when the product is removed from the wishlist!!
                //toastr["success"](data.message, "Removed")
                heartIcon.classList.remove('filled')
                Swal.fire({
                    title:'Removed',
                    icon:'success',
                    text:data.message,
                    showConfirmButton:false,
                    timer:1300
                }).then(() => location.reload())
            }
        })
        .catch((error) => {
            console.log(error)
            alert(error.message)
        })
    }
}