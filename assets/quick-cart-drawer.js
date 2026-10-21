if (!customElements.get('quick-cart-drawer')) {
  class QuickCartDrawer extends HTMLElement {
    constructor() {
      super();
      if (Shopify.designMode) {
        window.addEventListener('shopify:section:load', this.init.bind(this));
        this.parentElement.addEventListener('shopify:section:select', () => this.open());
        this.parentElement.addEventListener('shopify:section:deselect', () => this.close());
      }
    }

    connectedCallback() {
      this.init();
    }

    init() {
      this.toggleState = false;

      if (!this.classList.contains('is--open')) {
        document.querySelector('body').classList.remove('overflow-hidden');
      }

      this.querySelector('.button--close').addEventListener('click', this.close.bind(this));
      this.querySelector('.quick-cart-drawer__backdrop').addEventListener('click', this.close.bind(this));

      this.querySelector('.quick-cart-drawer__blocks').addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.toggleState) {
          this.close();
        }

        if (this.toggleState) {
          const focusableElements = this.querySelectorAll(
            'button, [href], input, select, label, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstFocusableElement = focusableElements[0];
          const lastFocusableElement = focusableElements[focusableElements.length - 1];

          let isTabPressed = e.key === 'Tab';

          if (!isTabPressed) {
            return;
          }

          if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement) {
              e.preventDefault();
              lastFocusableElement.focus();
            }
          } else {
            if (document.activeElement === lastFocusableElement) {
              e.preventDefault();
              firstFocusableElement.focus();
            }
          }
        }
      });

      this.initTriggers();
    }

    initTriggers() {
      const observer = new MutationObserver(() => {
        document.querySelectorAll('.quick-cart-drawer__trigger').forEach(element => {
          if (!element._init) {
            element.addEventListener('click', event => {
              this.fetchProductForQuickCartDrawer(event);
            });
            element._init = true;
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    /* START – Custom methods for quick cart Achat / Location logic */
    getQuickCartSelectedType() {
      const fieldsets = this.querySelectorAll('.quick-cart-drawer__main fieldset.js-product-card-options');

      for (const fieldset of fieldsets) {
        const legend = fieldset.querySelector('legend');
        if (!legend) continue;

        if (legend.textContent.toLowerCase().includes('type')) {
          const checkedInput = fieldset.querySelector('input[type="radio"]:checked');
          return checkedInput ? checkedInput.value : null;
        }
      }

      return null;
    }

    getQuickCartSelectedVariantId() {
      const variantInput = this.querySelector(".quick-cart-drawer__main .product-card__add-to-cart--form input[name='id']");
      return variantInput ? variantInput.value : '';
    }

    updateQuickCartPurchaseMode() {
      const quickCartProduct = this.querySelector('.quick-cart-drawer__main .quick-cart-product');
      if (!quickCartProduct) return;

      const selectedType = this.getQuickCartSelectedType();
      const selectedVariantId = this.getQuickCartSelectedVariantId();

      const addToCartBtn = quickCartProduct.querySelector('.quick-cart-add-to-cart');
      const dynamicCheckout = quickCartProduct.querySelector('.quick-cart-dynamic-checkout');
      const quantityWrapper = quickCartProduct.querySelector('.product-selector__quantity--quick-cart');
      const appointmentBtn = quickCartProduct.querySelector('.quick-cart-appointment-button');
      const purchasePrice = quickCartProduct.querySelector('[data-quick-purchase-price]');
      const rentalPrice = quickCartProduct.querySelector('[data-quick-rental-price]');

      if (appointmentBtn) {
        const productLink = quickCartProduct.querySelector('.product__title');
        const productUrl = productLink ? productLink.getAttribute('href') : '';
        const productHandle = productUrl.split('/products/')[1]?.split('?')[0];

        if (productHandle) {
          appointmentBtn.href = `/pages/rental-agenda?product=${productHandle}&variant=${selectedVariantId}`;
        }
      }

      if (selectedType === 'Location') {
        if (addToCartBtn) addToCartBtn.style.display = 'none';
        if (dynamicCheckout) dynamicCheckout.style.display = 'none';
        if (quantityWrapper) quantityWrapper.style.display = 'none';
        if (purchasePrice) purchasePrice.style.display = 'none';
        if (rentalPrice) rentalPrice.style.display = 'block';
        if (appointmentBtn) appointmentBtn.style.display = 'flex';
      } else {
        if (addToCartBtn) addToCartBtn.style.display = '';
        if (dynamicCheckout) dynamicCheckout.style.display = '';
        if (quantityWrapper) quantityWrapper.style.display = '';
        if (purchasePrice) purchasePrice.style.display = '';
        if (rentalPrice) rentalPrice.style.display = 'none';
        if (appointmentBtn) appointmentBtn.style.display = 'none';
      }
    }

    updateQuickCartDisplayedPrice() {
      const quickCartProduct = this.querySelector('.quick-cart-drawer__main .quick-cart-product');
      if (!quickCartProduct) return;

      const selectedVariantId = this.getQuickCartSelectedVariantId();
      if (!selectedVariantId) return;

      const productCard = this.querySelector('.quick-cart-drawer__main product-card');
      if (!productCard || !productCard.variantsObj) return;

      const selectedVariant = productCard.variantsObj.find(variant => String(variant.id) === String(selectedVariantId));
      if (!selectedVariant) return;

      const purchasePriceWrapper = quickCartProduct.querySelector('[data-quick-purchase-price]');
      if (!purchasePriceWrapper) return;

      const regularPriceEl = purchasePriceWrapper.querySelector('.price-item--regular');
      const salePriceEl = purchasePriceWrapper.querySelector('.price-item--sale');

      const formatter = new Intl.NumberFormat(Shopify.locale || 'fr', {
        style: 'currency',
        currency: Shopify.currency.active
      });

      const formattedPrice = formatter.format((selectedVariant.price || 0) / 100);
      const formattedCompareAt = selectedVariant.compare_at_price
        ? formatter.format(selectedVariant.compare_at_price / 100)
        : null;

      if (salePriceEl && formattedCompareAt && selectedVariant.compare_at_price > selectedVariant.price) {
        salePriceEl.textContent = formattedPrice;
        if (regularPriceEl) {
          regularPriceEl.textContent = formattedCompareAt;
        }
      } else if (regularPriceEl) {
        regularPriceEl.textContent = formattedPrice;
      }
    }
    /* END – Custom methods for quick cart Achat / Location logic */

    async fetchProductForQuickCartDrawer(event) {
      /** stop autoplay on quick cart trigger */
      if (event.target.closest('card-product-slider')) {
        event.target.closest('card-product-slider').slider.autoplay.stop();
        event.target.closest('card-product-slider').classList.add('product--open-on-quick-cart');
      }

      const isRecommendations = event.target.classList.contains('quick-cart-drawer__trigger--recommendations');

      const productCard = event.target.closest('product-card');
      let productOptions = null;

      if (!isRecommendations) {
        if (!productCard) return;
        productOptions = productCard.querySelectorAll('input[type="radio"]:checked, select');
      }

      const trigger = event.target.closest('[data-product-url]');
      trigger.classList.toggle('is--loading');
      try {
        let fetchPrefix = '';
        if (window.Shopify.routes.root.includes(`/${window.Shopify.locale}/`)) {
          fetchPrefix = `/${window.Shopify.locale}`;
        }

        const productCardResponse = await fetch(`${fetchPrefix}${trigger.dataset.productUrl}/?view=quick-cart`);
        if (!productCardResponse) return;

        const productCardHTML = await productCardResponse.text();
        const productCard = document.createElement('DIV');
        productCard.insertAdjacentHTML('beforeend', productCardHTML);
        if (!productCard.querySelector('.quick-cart-product')) return;

        this.querySelector('.quick-cart-drawer__main').innerHTML = '';
        this.querySelector('.quick-cart-drawer__main').append(productCard.querySelector('.quick-cart-product'));

        this.sliderInstance = new Swiper('.quick-cart-drawer__media-swiper', {
          slidesPerView: 1.25,
          spaceBetween: 8,
          freeMode: {
            enabled: true
          },
          breakpoints: {
            750: {
              slidesPerView: 2
            }
          }
        });
      } catch (error) {
        // console.log(error);
      } finally {
        trigger.classList.toggle('is--loading');

        if (!isRecommendations) {
          productOptions.forEach(productOption => {
            let productOptionName = productOption.name;
            const optionSectionIdAttribute = productOption.dataset?.sectionId;

            if (optionSectionIdAttribute) {
              productOptionName = productOptionName.replace(optionSectionIdAttribute, '');
            }

            const quickCartDrawerOption = this.querySelector(
              `[name="${CSS.escape(productOptionName)}-quick-cart-product"][value="${CSS.escape(productOption.value)}"]`
            );

            if (!quickCartDrawerOption) return;

            const quickCartDrawerOptionLabel = quickCartDrawerOption.parentElement.parentElement.querySelector('legend');

            this.querySelectorAll(`[name="${productOptionName}"]`).forEach(radioInput => {
              radioInput.removeAttribute('checked');
              radioInput.closest('li')?.classList.remove('checked');
            });

            quickCartDrawerOption.setAttribute('checked', '');

            const quickCartDrawerOptionLabelSpan = quickCartDrawerOptionLabel.querySelector('[data-selected-variant]');
            if (quickCartDrawerOptionLabelSpan) {
              quickCartDrawerOptionLabelSpan.innerHTML = productOption.value;
            }

            this.querySelector('product-card').querySelector('input[name="id"]').value =
              productCard.querySelector('input[name="id"]').value;

            quickCartDrawerOption.closest('li')?.classList.add('checked');

            this.querySelector('product-card').init();
          });

          /* START – Custom initial sync for quick cart Achat / Location logic */
          this.updateQuickCartDisplayedPrice();
          this.updateQuickCartPurchaseMode();
          /* END – Custom initial sync for quick cart Achat / Location logic */
        }

        setTimeout(() => {
          this.open();
        }, 500);

        this.querySelector('.quick-cart-drawer__main')
          .querySelectorAll('.variant-option-radio-input')
          .forEach(radioInput => {
            radioInput.addEventListener('change', event => {
              const quickCartDrawerOptionLabel = event.target.parentElement.parentElement.querySelector('legend');
              const quickCartDrawerOptionLabelSpan = quickCartDrawerOptionLabel.querySelector('[data-selected-variant]');
              if (quickCartDrawerOptionLabelSpan) {
                quickCartDrawerOptionLabelSpan.innerHTML = event.target.value;
              }

              /* START – Modified variant change handler for quick cart Achat / Location logic */
              setTimeout(() => {
                const selectedVariantId = this.querySelector(".product-card__add-to-cart--form input[name='id']").value;

                const productVariantsData = this.querySelector('product-card').variantsObj;
                const featuredMedia = productVariantsData.find(variant => variant.id == selectedVariantId)?.featured_media;

                if (featuredMedia) {
                  this.setActiveMedia(featuredMedia.id);
                }

                this.updateQuickCartDisplayedPrice();
                this.updateQuickCartPurchaseMode();
              }, 0);
              /* END – Modified variant change handler for quick cart Achat / Location logic */
            });
          });
      }
    }

    setActiveMedia(id) {
      const mediaFound = Array.from(this.querySelectorAll('[data-media-id]')).find(
        media => Number(media.dataset.mediaId) === id
      );
      if (mediaFound) {
        this.sliderInstance.slideTo(Number(mediaFound.dataset.index));
      }
    }

    toggle() {
      if (!this.toggleState) {
        this.open();
      } else {
        this.close();
      }
    }

    open() {
      this.toggleState = true;
      document.querySelector('body').classList.add('overflow-hidden');
      const quickCartDrawer = document.querySelector('.quick-cart-drawer__blocks');
      const closeButton = quickCartDrawer.querySelector('.button--close');
      quickCartDrawer.setAttribute('tabindex', '0');
      closeButton.setAttribute('tabindex', '0');
      this.classList.add('is--open');
      this.opened();

      const firstFocusableElement = this.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      }
    }

    close() {
      this.toggleState = false;

      const shopTheLookDrawer = document.querySelector('shop-the-look-drawer');

      if (shopTheLookDrawer && !shopTheLookDrawer.classList.contains('is--open')) {
        document.querySelector('body').classList.remove('overflow-hidden');
      }
      if (!shopTheLookDrawer) {
        document.querySelector('body').classList.remove('overflow-hidden');
      }

      this.classList.remove('is--open');
      this.closed();
      this.toggleAriaExpanded();

      if (document.querySelector('card-product-slider.product--open-on-quick-cart')) {
        document.querySelector('card-product-slider.product--open-on-quick-cart').slider.autoplay.start();
        document.querySelector('card-product-slider.product--open-on-quick-cart').classList.remove('product--open-on-quick-cart');
      }
    }

    toggleAriaExpanded(event) {
      if (event) {
        if (event.target.closest('button')) event.target.closest('button').setAttribute('aria-expanded', true);
        this.querySelector('.button--close').setAttribute('aria-expanded', true);
      } else {
        document.querySelectorAll('[aria-controls="quick-cart-drawer"]').forEach(button => {
          button.setAttribute('aria-expanded', false);
        });
      }
    }

    opened() {
      const openedEvent = new Event('opened', { bubbles: true });
      this.dispatchEvent(openedEvent);
    }

    closed() {
      const closedEvent = new Event('closed', { bubbles: true });
      this.dispatchEvent(closedEvent);
    }
  }

  customElements.define('quick-cart-drawer', QuickCartDrawer);
}