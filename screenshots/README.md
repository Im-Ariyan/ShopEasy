# ShopEasy screenshot checklist

Ten supplied application captures are saved under `captures/` and embedded in
the root README. They cover the home page, shop/collections, bag, wishlist,
orders, settings, sign-in, and the admin dashboard/product form. Personal
profile values and order details have been redacted where visible. The images
show supplied application states; live Supabase configuration and the
authenticity of underlying test data have not been independently verified.

Capture the remaining screens from a development Supabase project with
non-production test accounts and data. Do not fabricate order states or use
production customer records. Redact names, email addresses, phone numbers,
delivery addresses, order identifiers, and credentials before adding captures.

- [x] Home page.
- [x] Explore page and product collections (`Accessories` and `Sarees`).
- [ ] Product details with variant/stock selection and price.
- [x] Shopping bag with quantities and displayed total.
- [ ] COD checkout form; use test details and redact address and phone.
- [ ] Order confirmation after a development order is placed.
- [x] Order history; personal order contents have been redacted in the capture.
- [ ] Expanded order tracking/status timeline.
- [ ] Eligible order cancellation control or completed cancellation result.
- [x] Admin dashboard.
- [ ] Admin product/category management and inventory view (capture the
  management state beyond the visible product form).
- [ ] Admin order listing and status controls.
- [x] Wishlist, settings, and sign-in pages (additional supplied captures).

The screenshots in this folder are local PNG files referenced by relative
paths in `README.md`. Keep those references aligned with files that exist.
