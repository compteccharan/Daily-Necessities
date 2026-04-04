/* ============================================
   VERDAIL - Simple JavaScript
   This code does 3 things:
   1. Hides loading screen after page loads
   2. Makes testimonial slider work
   3. Toggles the sticky header around testimonials
   ============================================ */

// ============================================
// 1. LOADING SCREEN
// Wait for page to fully load, then hide loader
// ============================================

var loaderHidden = false;

function hideLoadingScreen() {
    if (loaderHidden) return;

    var loadingScreen = document.getElementById('loading-screen');
    var mainContent = document.getElementById('main-content');

    if (!loadingScreen || !mainContent) return;

    loaderHidden = true;
    loadingScreen.classList.add('hidden');
    mainContent.classList.add('visible');
}

window.addEventListener('load', function() {
    setTimeout(hideLoadingScreen, 2000);
});

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(hideLoadingScreen, 3500);
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
// 4. STICKY HEADER - Hide when testimonials visible
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
