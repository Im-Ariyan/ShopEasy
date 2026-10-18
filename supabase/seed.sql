insert into public.categories(name, slug, image_url) values
  ('Shirts', 'shirts', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=85'),
  ('Pants & Jeans', 'pants-jeans', 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=85'),
  ('Sarees', 'sarees', 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=85'),
  ('Ethnic Wear', 'ethnic-wear', 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=800&q=85'),
  ('T-shirts & Hoodies', 'tshirts-hoodies', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85'),
  ('Accessories', 'accessories', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=85'),
  ('Winter Clothes', 'winter-clothes', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=85')
on conflict (slug) do nothing;

with product_seed(category_slug, slug, name, description, price, image_url) as (
  values
  ('shirts','linen-overshirt','Relaxed Linen Overshirt','A breathable relaxed-fit shirt for everyday layering.',899,'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85'),
  ('shirts','classic-oxford','Classic Oxford Shirt','A versatile cotton Oxford with a clean button-down collar.',799,'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85'),
  ('shirts','everyday-check-shirt','Everyday Check Shirt','Soft brushed cotton in an easy weekend check.',749,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85'),
  ('shirts','formal-poplin-shirt','Tailored Poplin Shirt','Crisp poplin and a neat tailored silhouette for workdays.',999,'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'),
  ('shirts','striped-camp-shirt','Striped Camp Shirt','Lightweight camp-collar style for warm-weather plans.',849,'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85'),

  ('pants-jeans','straight-fit-denim','Straight Fit Jeans','Classic mid-rise denim with a comfortable straight leg.',1299,'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85'),
  ('pants-jeans','relaxed-cargo-pants','Relaxed Cargo Pants','Utility pockets and a relaxed fit for everyday wear.',1199,'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=900&q=85'),
  ('pants-jeans','tapered-chinos','Tapered Cotton Chinos','Stretch cotton chinos with a clean tapered finish.',1099,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85'),
  ('pants-jeans','wide-leg-denim','Wide Leg Denim','A modern wide-leg silhouette in sturdy soft denim.',1399,'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85'),
  ('pants-jeans','everyday-trousers','Everyday Trousers','Easy-care trousers with a comfortable straight fit.',1249,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85'),

  ('sarees','cotton-everyday-saree','Handloom Cotton Saree','A breathable handloom cotton saree for everyday elegance.',1199,'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85'),
  ('sarees','silk-evening-saree','Silk Blend Evening Saree','A softly lustrous drape for celebrations and special evenings.',2499,'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85'),
  ('sarees','festive-woven-saree','Festive Woven Saree','Traditional woven detail with a graceful festive finish.',1999,'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85'),
  ('sarees','printed-soft-saree','Printed Soft Saree','A lightweight printed saree with a soft drape.',999,'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85'),
  ('sarees','border-cotton-saree','Contrast Border Cotton Saree','Classic cotton weave finished with a contrast border.',1399,'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85'),

  ('ethnic-wear','everyday-cotton-kurti','Everyday Cotton Kurti','An easy straight-fit cotton kurti for daily comfort.',799,'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=900&q=85'),
  ('ethnic-wear','embroidered-kurta-set','Embroidered Kurta Set','A coordinated kurta set with subtle embroidery.',1899,'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=900&q=85'),
  ('ethnic-wear','festive-anarkali','Festive Anarkali','A flowing festive silhouette with delicate detailing.',2199,'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=900&q=85'),
  ('ethnic-wear','printed-ethnic-tunic','Printed Ethnic Tunic','A versatile printed tunic with an easy relaxed shape.',899,'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=900&q=85'),
  ('ethnic-wear','linen-kurta','Textured Linen Kurta','A lightweight textured kurta for smart casual occasions.',1199,'https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=900&q=85'),

  ('tshirts-hoodies','everyday-cotton-tee','Everyday Cotton T-shirt','A soft midweight cotton tee with a comfortable regular fit.',399,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85'),
  ('tshirts-hoodies','oversized-logo-tee','Oversized Graphic T-shirt','A roomy oversized tee with a minimal graphic print.',549,'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85'),
  ('tshirts-hoodies','classic-polo-tee','Classic Pique Polo','A breathable pique polo with a neat button placket.',599,'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85'),
  ('tshirts-hoodies','lightweight-pullover-hoodie','Lightweight Pullover Hoodie','A soft cotton-blend hoodie for comfortable layering.',1199,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85'),
  ('tshirts-hoodies','zip-through-hoodie','Zip-through Fleece Hoodie','A practical zip hoodie with a brushed fleece interior.',1399,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85'),

  ('accessories','everyday-canvas-tote','Everyday Canvas Tote','A sturdy canvas carryall sized for daily essentials.',399,'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85'),
  ('accessories','woven-crossbody-bag','Woven Crossbody Bag','A compact woven bag with an adjustable shoulder strap.',899,'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85'),
  ('accessories','minimal-card-holder','Minimal Card Holder','A slim everyday card holder with multiple compartments.',299,'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85'),
  ('accessories','classic-belt','Classic Everyday Belt','A versatile adjustable belt with a brushed metal buckle.',499,'https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=900&q=85'),
  ('accessories','soft-knit-scarf','Soft Knit Scarf','A lightweight soft-knit scarf for easy seasonal layering.',699,'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=900&q=85'),

  ('winter-clothes','insulated-puffer-jacket','Insulated Puffer Jacket','A warm quilted jacket for chilly commutes and weekend outings.',2499,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85'),
  ('winter-clothes','everyday-denim-jacket','Everyday Denim Jacket','A versatile midweight denim layer for cool-weather days.',1899,'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85'),
  ('winter-clothes','classic-knit-sweater','Classic Knit Sweater','A soft, cozy knit sweater made for everyday layering.',1499,'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85'),
  ('winter-clothes','ribbed-turtleneck-sweater','Ribbed Turtleneck Sweater','A comfortable ribbed knit with a warm, easy-to-layer neckline.',1699,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85'),
  ('winter-clothes','thermal-base-layer-top','Thermal Base-Layer Top','A lightweight thermal top designed to add warmth under everyday clothes.',699,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85'),
  ('winter-clothes','thermal-leggings','Thermal Leggings','Soft insulating leggings for a comfortable cold-weather base layer.',799,'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85')
)
insert into public.products(category_id, slug, name, description, price, image_url)
select category.id, product.slug, product.name, product.description, product.price, product.image_url
from product_seed as product
join public.categories as category on category.slug = product.category_slug
on conflict (slug) do nothing;

insert into public.product_variants(product_id, size_label, stock)
select product.id, sizes.size_label, 20
from public.products as product
join public.categories as category on category.id = product.category_id
cross join lateral unnest(
  case
    when category.slug = 'pants-jeans' then array['30', '32', '34', '36']::text[]
    when category.slug in ('shirts', 'ethnic-wear', 'tshirts-hoodies', 'winter-clothes') then array['S', 'M', 'L', 'XL']::text[]
    else array['One Size']::text[]
  end
) as sizes(size_label)
on conflict (product_id, size_label) do nothing;
