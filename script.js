/* ============================================
   VERDAIL - Simple JavaScript
   This code does 3 things:
   1. Hides loading screen after page loads
   2. Makes testimonial slider work
   3. Shows cart popup when ADD button clicked
   ============================================ */

// ============================================
// 1. LOADING SCREEN
// Wait for page to fully load, then hide loader
// ============================================

window.addEventListener('load', function() {
    
    // Wait 2 seconds so user can see the animation
    setTimeout(function() {
        
        // Find the loading screen element
        var loadingScreen = document.getElementById('loading-screen');
        
        // Find the main content element
        var mainContent = document.getElementById('main-content');
        
        // Add 'hidden' class to fade out loader
        loadingScreen.classList.add('hidden');
        
        // Add 'visible' class to fade in content
        mainContent.classList.add('visible');
        
    }, 2000);
    
});


// ============================================
// 2. TESTIMONIAL SLIDER
// Shows one review at a time, dots to navigate
// ============================================

var currentSlide = 0;
var totalSlides = 3;

// Function to go to a specific slide
function goToSlide(slideNumber) {
    currentSlide = slideNumber;
    var track = document.querySelector('.testimonial-track');
    track.style.transform = 'translateX(-' + (slideNumber * 100) + '%)';
    updateDots();
}

// Function to update dot styles
function updateDots() {
    var dots = document.querySelectorAll('.testimonial-dots .dot');
    for (var i = 0; i < dots.length; i++) {
        if (i === currentSlide) {
            dots[i].classList.add('active');
        } else {
            dots[i].classList.remove('active');
        }
    }
}

// ============================================
// 3. DOT CLICK - When user clicks a dot
// ============================================

window.addEventListener('load', function() {
    var dots = document.querySelectorAll('.testimonial-dots .dot');
    for (var i = 0; i < dots.length; i++) {
        dots[i].addEventListener('click', function() {
            var index = parseInt(this.getAttribute('data-index'));
            goToSlide(index);
        });
    }
});

// Auto-slide every 5 seconds
setInterval(function() {
    var nextSlide = currentSlide + 1;
    if (nextSlide >= totalSlides) {
        nextSlide = 0;
    }
    goToSlide(nextSlide);
}, 5000);


// ============================================
// 4. CART POPUP - Shows when ADD button clicked
// ============================================

window.addEventListener('load', async function() {

    // Import auth functions
    const { getCurrentUser } = await import('./source/auth.js');
    const { addToCart } = await import('./source/userManager.js');

    // Find all ADD buttons
    var addButtons = document.querySelectorAll('.add-button');

    // Find the popup
    var popup = document.getElementById('cart-popup');

    // Find the close button
    var closeBtn = document.querySelector('.close-popup');

    // When any ADD button is clicked
    for (var i = 0; i < addButtons.length; i++) {
        addButtons[i].addEventListener('click', async function(e) {
            e.preventDefault();

            const user = await getCurrentUser();

            if (!user) {
                // Not logged in - show popup
                popup.classList.remove('hidden');
            } else {
                // Logged in - add to cart
                const productCard = this.closest('.product-card');
                const productName = productCard.querySelector('.product-name').textContent;
                const productId = productCard.getAttribute('data-product-id') || productName;
                const priceElement = productCard.querySelector('.current-price');
                const price = priceElement ? parseFloat(priceElement.textContent.replace('₹', '')) : 0;

                try {
                    await addToCart(productId, productName, 1, price);
                    alert('Added to cart!');
                } catch (error) {
                    alert('Error adding to cart: ' + error.message);
                }
            }
        });
    }

    // When cart button is clicked, show popup
    var cartButton = document.querySelector('.cart-button');
    if (cartButton) {
        cartButton.addEventListener('click', function() {
            popup.classList.remove('hidden');
        });
    }

    // When close button clicked, hide popup
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            popup.classList.add('hidden');
        });
    }

    // When clicking outside popup content, close it
    if (popup) {
        popup.addEventListener('click', function(event) {
            if (event.target === popup) {
                popup.classList.add('hidden');
            }
        });
    }

});


// ============================================
// 5. STICKY HEADER - Hide when testimonials visible
// ============================================

window.addEventListener('load', function() {
    var header = document.querySelector('header');
    var testimonials = document.querySelector('.testimonials');
    
    if (!header || !testimonials) return;
    
    window.addEventListener('scroll', function() {
        var testimonialsRect = testimonials.getBoundingClientRect();
        
        // Hide header when testimonials section enters viewport
        if (testimonialsRect.top < window.innerHeight && testimonialsRect.bottom > 0) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
    });
});