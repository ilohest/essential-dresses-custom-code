if (!customElements.get('recently-viewed-products')) {
  class RecentlyViewed extends customElements.get('card-product-slider') {
    constructor() {
      super();

      this.section = this.closest('.js-section');
      this.sliderWrapper = this.querySelector('.swiper-wrapper');
      this.productHandle = this.dataset.productHandle;

      this.fetchRecentProducts();

      if (document.querySelector('quick-cart-drawer') && this.querySelector('.swiper-slide')) {
        document.querySelector('quick-cart-drawer').init();
      }

      if (Shopify.designMode) {
        if (document.querySelector('quick-cart-drawer') && this.querySelector('.swiper-slide')) {
          document.querySelector('quick-cart-drawer').init();
        }
      }
    }

    // start custom — Exclut les produits avec la balise showroom,
    // même déjà présents dans l’historique, puis initialise le carrousel.
    async fetchRecentProducts() {
      if (!window.Shopify?.routes?.root) {
        setTimeout(() => this.fetchRecentProducts(), 100);
        return;
      }

      let productHandles;

      try {
        productHandles = localStorage.getItem('recently-viewed');
      } catch (error) {
        return;
      }

      if (!productHandles) return;

      const productHandlesArray = [...new Set(
        productHandles
          .split(',')
          .map(handle => handle.trim())
          .filter(handle =>
            handle &&
            handle !== this.productHandle &&
            handle !== 'undefined'
          )
      )];

      if (!productHandlesArray.length) return;

      const removeFromHistory = (handle) => {
        try {
          const history = localStorage.getItem('recently-viewed') || '';

          localStorage.setItem(
            'recently-viewed',
            history
              .split(',')
              .filter(item => item.trim() !== handle)
              .join(',')
          );
        } catch (error) {
          // Le filtrage fonctionne même si le stockage est inaccessible.
        }
      };

      const slides = await Promise.all(
        productHandlesArray.map(async (productHandle) => {
          try {
            const productURL =
              `${window.Shopify.routes.root}products/${encodeURIComponent(productHandle)}`;

            const productResponse = await fetch(`${productURL}.js`);

            if (!productResponse.ok) {
              if (productResponse.status === 404) {
                removeFromHistory(productHandle);
              }
              return null;
            }

            const product = await productResponse.json();
            const isShowroom = (product.tags || []).some(
              tag => tag.trim().toLowerCase() === 'showroom'
            );

            if (isShowroom) {
              removeFromHistory(productHandle);
              return null;
            }

            const cardResponse = await fetch(`${productURL}?view=card`);

            if (!cardResponse.ok) {
              if (cardResponse.status === 404) {
                removeFromHistory(productHandle);
              }
              return null;
            }

            const productSlide = document.createElement('div');

            productSlide.classList.add(
              'swiper-slide',
              'card-product-slider__slide'
            );

            productSlide.innerHTML = await cardResponse.text();

            if (
              !productSlide.querySelector('product-card') ||
              !productSlide.querySelector('.product-card')
            ) {
              return null;
            }

            return productSlide;
          } catch (error) {
            return null;
          }
        })
      );

      const visibleSlides = slides.filter(Boolean);

      if (!visibleSlides.length) return;

      this.sliderWrapper.append(...visibleSlides);
      this.initSlider();
      this.section?.classList.remove('hidden');

      document.querySelector('quick-cart-drawer')?.init();
    }
    // end custom
  }

  customElements.define('recently-viewed-products', RecentlyViewed);
}
