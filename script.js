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
    const { supabase } = await import('./source/supabaseClient.js');
    const { addToCart } = await import('./source/userManager.js');

    // Find all ADD buttons
    var addButtons = document.querySelectorAll('.add-button');

    // Find the popup
    var popup = document.getElementById('cart-popup');

    // Find the close button
    var closeBtn = document.querySelector('.close-popup');

    console.log('Cart functionality loaded. Found', addButtons.length, 'ADD buttons');

    // Update cart count on page load
    await updateCartCount();

    // Listen for auth state changes to update cart count
    supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            await updateCartCount();
        }
    });

    // When any ADD button is clicked
    for (var i = 0; i < addButtons.length; i++) {
        addButtons[i].addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('ADD button clicked');

            try {
                const user = await getCurrentUser();
                console.log('Current user:', user ? user.email : 'Not logged in');

                if (!user) {
                    // Not logged in - show popup
                    console.log('User not logged in, showing sign-in popup');
                    if (popup) {
                        popup.classList.remove('hidden');
                    }
                } else {
                    // Logged in - add to cart
                    const productCard = this.closest('.product-card');
                    if (!productCard) {
                        console.error('Product card not found');
                        alert('Error: Could not find product information');
                        return;
                    }

                    const productNameEl = productCard.querySelector('.product-name');
                    const priceElement = productCard.querySelector('.current-price');

                    if (!productNameEl || !priceElement) {
                        console.error('Missing product details. Name:', productNameEl, 'Price:', priceElement);
                        alert('Error: Could not extract product details');
                        return;
                    }

                    const productName = productNameEl.textContent.trim();
                    const priceText = priceElement.textContent.trim().replace('₹', '').trim();
                    const price = parseFloat(priceText);
                    const productId = productCard.getAttribute('data-product-id') || productName;

                    console.log('Adding to cart:', {
                        productId,
                        productName,
                        price,
                        quantity: 1
                    });

                    if (isNaN(price)) {
                        console.error('Invalid price:', priceText);
                        alert('Error: Invalid price format');
                        return;
                    }

                    try {
                        await addToCart(productId, productName, 1, price);
                        console.log('Successfully added to cart');
                        alert('✓ Added to cart!');
                        
                        // Update cart count
                        await updateCartCount();
                    } catch (cartError) {
                        console.error('Cart operation failed:', cartError);
                        alert('Error adding to cart: ' + (cartError.message || 'Unknown error. Check console.'));
                    }
                }
            } catch (error) {
                console.error('Unexpected error in ADD button handler:', error);
                alert('Unexpected error: ' + error.message);
            }
        });
    }

    // When cart button is clicked
    var cartButton = document.querySelector('.cart-button');
    if (cartButton) {
        cartButton.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Cart button clicked');
            
            const user = await getCurrentUser();
            if (!user) {
                // Not logged in - show signup popup
                console.log('Showing signup popup (user not logged in)');
                if (popup) {
                    popup.classList.remove('hidden');
                }
            } else {
                // Logged in - navigate to cart page
                console.log('User logged in, navigating to cart page');
                window.location.href = 'cart.html';
            }
        });
    }

    // When close button clicked, hide popup
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('Closing popup');
            if (popup) {
                popup.classList.add('hidden');
            }
        });
    }

    // When clicking outside popup content, close it
    if (popup) {
        popup.addEventListener('click', function(event) {
            if (event.target === popup) {
                console.log('Closing popup (outside click)');
                popup.classList.add('hidden');
            }
        });
    }

});

// ============================================
// UPDATE CART COUNT BADGE
// ============================================

async function updateCartCount() {
    try {
        const { getCurrentUser } = await import('./source/auth.js');
        const { supabase } = await import('./source/supabaseClient.js');

        const user = await getCurrentUser();
        const cartButton = document.querySelector('.cart-button');

        if (!cartButton) return;

        if (!user) {
            // Remove badge
            const badge = cartButton.querySelector('.cart-badge');
            if (badge) badge.remove();
            return;
        }

        // Fetch cart count
        const { data, error } = await supabase
            .from('carts')
            .select('quantity')
            .eq('user_id', user.id);

        if (error) throw error;

        const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);

        console.log('Cart total items:', totalItems);

        // Update or create badge
        let badge = cartButton.querySelector('.cart-badge');
        if (!badge && totalItems > 0) {
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ff4444;
                color: white;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                border: 2px solid white;
            `;
            cartButton.style.position = 'relative';
            cartButton.appendChild(badge);
        }

        if (badge) {
            if (totalItems > 0) {
                badge.textContent = totalItems;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}


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