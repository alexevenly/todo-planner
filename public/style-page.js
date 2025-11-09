// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all elements with data-scroll attribute
document.addEventListener('DOMContentLoaded', () => {
    const scrollElements = document.querySelectorAll('[data-scroll]');
    scrollElements.forEach(el => observer.observe(el));

    // Handle dot clicks for shop links (only active item dots will be visible/clickable)
    document.addEventListener('click', (e) => {
        const dot = e.target.closest('.dot');
        if (dot && dot.closest('.shop-item.active')) {
            e.stopPropagation();
            const shopUrl = dot.getAttribute('data-shop');
            if (shopUrl && shopUrl !== 'https://example.com/shop1') {
                window.open(shopUrl, '_blank');
            }
        }
    });

    // Parallax effect for hero image
    const heroImage = document.querySelector('.hero-image');
    const heroSection = document.querySelector('.hero-section');
    
    if (heroImage && heroSection) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroHeight = heroSection.offsetHeight;
            
            if (scrollY < heroHeight) {
                const parallaxValue = scrollY * 0.5;
                const scaleValue = 1.1 + scrollY * 0.0003;
                heroImage.style.transform = `scale(${scaleValue}) translateY(${parallaxValue * 0.3}px)`;
                
                // Fade out hero title
                const heroTitle = document.querySelector('.hero-title');
                if (heroTitle) {
                    const opacity = Math.max(0, 1 - scrollY / heroHeight);
                    heroTitle.style.opacity = opacity;
                }
            }
        }, { passive: true });
    }

    // Smooth fade for phrases
    const phrases = document.querySelectorAll('.phrase');
    const phraseObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 300);
            }
        });
    }, { threshold: 0.3 });

    phrases.forEach(phrase => phraseObserver.observe(phrase));

    // Carousel functionality
    const carouselTrack = document.querySelector('.carousel-track');
    const shopItems = document.querySelectorAll('.shop-item');
    const leftArrow = document.querySelector('.carousel-arrow-left');
    const rightArrow = document.querySelector('.carousel-arrow-right');
    
    if (carouselTrack && shopItems.length > 0) {
        let currentIndex = 2; // Start with main_3.jpg (index 2)
        const totalItems = shopItems.length;
        let isTransitioning = false;

        // Initialize carousel position
        const updateCarousel = (index, animate = true) => {
            if (isTransitioning && animate) return;
            
            isTransitioning = animate;
            
            // Remove active class from all items
            shopItems.forEach(item => {
                item.classList.remove('active');
                // Hide dots on non-active items
                const dots = item.querySelector('.shop-dots');
                if (dots) {
                    dots.style.display = 'none';
                }
            });

            // Add active class to current item
            shopItems[index].classList.add('active');
            const activeDots = shopItems[index].querySelector('.shop-dots');
            if (activeDots) {
                activeDots.style.display = 'block';
            }

            // Update track position
            const translateX = -index * 100;
            if (animate) {
                carouselTrack.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            } else {
                carouselTrack.style.transition = 'none';
            }
            carouselTrack.style.transform = `translateX(${translateX}%)`;

            if (animate) {
                setTimeout(() => {
                    isTransitioning = false;
                }, 800);
            } else {
                isTransitioning = false;
            }
        };

        // Navigate to next item
        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % totalItems;
            updateCarousel(currentIndex);
        };

        // Navigate to previous item
        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + totalItems) % totalItems;
            updateCarousel(currentIndex);
        };

        // Arrow click handlers
        if (leftArrow) {
            leftArrow.addEventListener('click', prevSlide);
        }
        
        if (rightArrow) {
            rightArrow.addEventListener('click', nextSlide);
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        });

        // Initialize carousel
        updateCarousel(currentIndex, false);
    }
});

