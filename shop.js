/* ============================================================
   Labora Cafe — shop
   The two product sections are written into shop.html by hand, so the
   copy and layout are ours. This file does three things:
     1. the image carousel in each product's media half
     2. add-to-cart, against a Shopify variant id on each button
     3. the cart drawer, which hands off to Shopify's secure checkout
        — the only step that leaves this site

   >>> SETUP, two parts:
   (a) fill in the store below
       domain ................ Settings > Domains ("xxx.myshopify.com")
       storefrontAccessToken . Settings > Apps and sales channels >
                               Develop apps > create an app > Storefront
                               API, with unauthenticated_read_product_*
                               and unauthenticated_write_checkouts scopes
   (b) put each product's variant id in its data-variant-id in shop.html

   Until both are done the page still renders in full; only the buttons
   say the cart isn't connected yet.
   ============================================================ */
var LABORA_SHOP = {
  domain: "YOUR-STORE.myshopify.com",
  storefrontAccessToken: "YOUR_STOREFRONT_ACCESS_TOKEN",
};

(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  var nav = document.querySelector(".nav");
  var navToggle = document.querySelector(".nav__toggle");
  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.textContent = open ? "CLOSE" : "MENU";
    });
  }

  /* ============================================================
     1. Carousels
     ============================================================ */
  Array.prototype.forEach.call(
    document.querySelectorAll(".product"),
    function (product) {
      var hero = product.querySelector(".product__hero");
      var thumbs = Array.prototype.slice.call(
        product.querySelectorAll(".product__thumb")
      );
      var prev = product.querySelector(".product__arrow--prev");
      var next = product.querySelector(".product__arrow--next");
      if (!hero || thumbs.length < 2) {
        /* a single image needs no arrows */
        if (prev) prev.hidden = true;
        if (next) next.hidden = true;
        return;
      }

      var sources = thumbs.map(function (t) {
        return t.querySelector("img").getAttribute("src");
      });
      var name = (product.querySelector(".product__name") || {}).textContent || "";
      var index = 0;

      function show(i) {
        index = (i + sources.length) % sources.length; // wrap both ways
        hero.src = sources[index];
        hero.alt = name.trim() + " — image " + (index + 1) + " of " + sources.length;
        thumbs.forEach(function (t, n) {
          t.classList.toggle("is-active", n === index);
        });
      }

      thumbs.forEach(function (t, n) {
        t.addEventListener("click", function () {
          show(n);
        });
      });
      if (prev) prev.addEventListener("click", function () { show(index - 1); });
      if (next) next.addEventListener("click", function () { show(index + 1); });

      /* arrow keys work once a thumb has been focused */
      product.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") show(index - 1);
        else if (e.key === "ArrowRight") show(index + 1);
      });

      /* the frames the visitor hasn't seen can wait until they might */
      sources.slice(1).forEach(function (src) {
        var pre = new Image();
        pre.src = src;
      });
    }
  );

  /* ============================================================
     2 + 3. Cart and checkout
     ============================================================ */
  var addButtons = Array.prototype.slice.call(
    document.querySelectorAll(".product__add")
  );
  if (!addButtons.length) return;

  var cartEl = document.getElementById("cart");
  var cartItemsEl = document.getElementById("cartItems");
  var cartCountEl = document.getElementById("cartCount");
  var cartSubtotalEl = document.getElementById("cartSubtotal");
  var cartToggleEl = document.getElementById("cartToggle");
  var cartScrimEl = document.getElementById("cartScrim");
  var checkoutBtn = document.getElementById("cartCheckout");

  var CHECKOUT_KEY = "laboraCheckoutId";
  var client = null;
  var checkout = null;

  function noteFor(button, message, isError) {
    var note = button.parentNode.querySelector(".product__note");
    if (!note) return;
    note.textContent = message || "";
    note.classList.toggle("is-error", !!isError);
  }

  function disableAll(message) {
    addButtons.forEach(function (b) {
      b.disabled = true;
      noteFor(b, message);
    });
  }

  var unconfigured =
    LABORA_SHOP.domain.indexOf("YOUR-STORE") !== -1 ||
    LABORA_SHOP.storefrontAccessToken.indexOf("YOUR_") !== -1;

  if (unconfigured) {
    disableAll("Online ordering opens soon.");
    return;
  }
  if (typeof ShopifyBuy === "undefined" || !ShopifyBuy.buildClient) {
    disableAll("The cart couldn't load. Please refresh.");
    return;
  }

  client = ShopifyBuy.buildClient({
    domain: LABORA_SHOP.domain,
    storefrontAccessToken: LABORA_SHOP.storefrontAccessToken,
  });

  /* The SDK has returned prices as a bare string in older versions and as
     {amount, currencyCode} in newer ones. Handle both. */
  function money(price) {
    if (price == null) return "";
    var amount = typeof price === "object" ? price.amount : price;
    var currency = (typeof price === "object" && price.currencyCode) || "USD";
    var n = parseFloat(amount);
    if (isNaN(n)) return "";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(n);
    } catch (e) {
      return "$" + n.toFixed(2);
    }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- The checkout object is the cart ---------- */
  function createCheckout() {
    return client.checkout.create().then(function (fresh) {
      checkout = fresh;
      try {
        localStorage.setItem(CHECKOUT_KEY, fresh.id);
      } catch (e) {}
      renderCart();
      return fresh;
    });
  }

  function loadCheckout() {
    var stored = null;
    try {
      stored = localStorage.getItem(CHECKOUT_KEY);
    } catch (e) {}
    if (!stored) return createCheckout();

    return client.checkout.fetch(stored).then(function (existing) {
      /* a completed checkout can't take new line items — start fresh */
      if (!existing || existing.completedAt) return createCheckout();
      checkout = existing;
      renderCart();
      return checkout;
    }, createCheckout);
  }

  function addToCart(button) {
    var variantId = button.getAttribute("data-variant-id");
    if (!variantId) {
      noteFor(button, "This item isn't available online yet.", true);
      return;
    }
    if (!checkout) return;

    var label = button.textContent;
    button.disabled = true;
    button.textContent = "Adding…";
    noteFor(button, "");

    client.checkout
      .addLineItems(checkout.id, [{ variantId: variantId, quantity: 1 }])
      .then(function (updated) {
        checkout = updated;
        renderCart();
        openCart();
      })
      .catch(function () {
        noteFor(button, "Couldn't add that. Please try again.", true);
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  }

  addButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      addToCart(button);
    });
  });

  function setQuantity(lineItemId, quantity) {
    if (!checkout) return;
    var op =
      quantity > 0
        ? client.checkout.updateLineItems(checkout.id, [
            { id: lineItemId, quantity: quantity },
          ])
        : client.checkout.removeLineItems(checkout.id, [lineItemId]);
    op.then(function (updated) {
      checkout = updated;
      renderCart();
    });
  }

  function renderCart() {
    if (!checkout || !cartItemsEl) return;
    var items = checkout.lineItems || [];

    cartItemsEl.innerHTML = "";
    var count = 0;

    items.forEach(function (item) {
      count += item.quantity;
      var row = el("div", "cart__item");

      var thumb = el("div", "cart__thumb");
      if (item.variant && item.variant.image) {
        var img = new Image();
        img.src = item.variant.image.src;
        img.alt = "";
        thumb.appendChild(img);
      }
      row.appendChild(thumb);

      var body = el("div", "cart__body");
      body.appendChild(el("p", "cart__name", item.title));
      if (
        item.variant &&
        item.variant.title &&
        item.variant.title !== "Default Title"
      ) {
        body.appendChild(el("p", "cart__variant", item.variant.title));
      }

      var qty = el("div", "cart__qty");
      var minus = el("button", "cart__qty-btn", "−");
      minus.type = "button";
      minus.setAttribute("aria-label", "Decrease " + item.title);
      minus.addEventListener("click", function () {
        setQuantity(item.id, item.quantity - 1);
      });
      var plus = el("button", "cart__qty-btn", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", "Increase " + item.title);
      plus.addEventListener("click", function () {
        setQuantity(item.id, item.quantity + 1);
      });
      qty.appendChild(minus);
      qty.appendChild(el("span", "cart__qty-num", String(item.quantity)));
      qty.appendChild(plus);
      body.appendChild(qty);
      row.appendChild(body);

      row.appendChild(
        el("span", "cart__line-price", money(item.variant && item.variant.price))
      );
      cartItemsEl.appendChild(row);
    });

    if (!items.length) {
      cartItemsEl.appendChild(el("p", "cart__empty", "Your cart is empty."));
    }

    if (cartCountEl) cartCountEl.textContent = String(count);
    if (cartToggleEl) cartToggleEl.hidden = count === 0;
    if (cartSubtotalEl) {
      cartSubtotalEl.textContent = money(
        checkout.subtotalPriceV2 || checkout.subtotalPrice
      );
    }
    if (checkoutBtn) checkoutBtn.disabled = !items.length;
  }

  /* ---------- Drawer ---------- */
  function openCart() {
    if (!cartEl) return;
    cartEl.classList.add("is-open");
    cartEl.setAttribute("aria-hidden", "false");
    if (cartScrimEl) cartScrimEl.hidden = false;
    document.body.classList.add("cart-open");
  }
  function closeCart() {
    if (!cartEl) return;
    cartEl.classList.remove("is-open");
    cartEl.setAttribute("aria-hidden", "true");
    if (cartScrimEl) cartScrimEl.hidden = true;
    document.body.classList.remove("cart-open");
  }

  if (cartToggleEl) cartToggleEl.addEventListener("click", openCart);
  if (cartScrimEl) cartScrimEl.addEventListener("click", closeCart);
  var cartCloseEl = document.getElementById("cartClose");
  if (cartCloseEl) cartCloseEl.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCart();
  });

  /* ---------- Handoff to Shopify ---------- */
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function () {
      if (!checkout || !checkout.webUrl) return;
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Taking you to checkout…";
      window.location.href = checkout.webUrl;
    });
  }

  loadCheckout().catch(function () {
    disableAll("The cart couldn't load. Please refresh.");
  });
})();
