import { useEffect, useMemo, useState } from 'react'
import { requireSupabase } from '../lib/supabase.js'
import ProductCard from '../components/ProductCard.jsx'
import ProductImage from '../components/ProductImage.jsx'

function ShopPage() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategorySlug, setSelectedCategorySlug] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('featured')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadCatalogue() {
      setLoading(true)
      setError('')
      try {
        const client = requireSupabase()
        const [categoryResult, productResult] = await Promise.all([
          client.from('categories').select('id,name,slug,image_url').eq('active', true).order('name'),
          client.from('products')
            .select('id,slug,name,description,price,image_url,category_id,categories(name,slug),product_variants(id,size_label,stock)')
            .eq('active', true)
            .order('name'),
        ])
        if (categoryResult.error) throw categoryResult.error
        if (productResult.error) throw productResult.error
        if (mounted) {
          setCategories(categoryResult.data ?? [])
          setProducts(productResult.data ?? [])
        }
      } catch (loadError) {
        if (mounted) setError(loadError.message || 'Unable to load the catalogue.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadCatalogue()
    return () => { mounted = false }
  }, [])

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const result = products.filter((product) => {
      const matchesSearch = !normalizedSearch
        || `${product.name} ${product.description} ${product.categories?.name}`.toLowerCase().includes(normalizedSearch)
      return matchesSearch
    })

    if (sort === 'price-low') result.sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price-high') result.sort((a, b) => Number(b.price) - Number(a.price))
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  }, [products, search, sort])

  function scrollToCollection(slug = '') {
    setSelectedCategorySlug(slug)
    const target = document.getElementById(slug ? `collection-${slug}` : 'catalogue-top')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const categorySections = categories
    .map((category) => ({
      ...category,
      products: filteredProducts.filter((product) => product.categories?.slug === category.slug),
    }))
    .filter((category) => category.products.length > 0)
  const uncategorizedProducts = filteredProducts.filter((product) => !product.categories?.slug)

  return (
    <main className="page-shell">
      <section className="shop-heading">
        <p className="eyebrow">Style that moves with you</p>
        <h1>Explore the shop</h1>
        <p>Thoughtful everyday clothing and accessories, selected for your wardrobe.</p>
      </section>

      {error && <p className="notice" role="alert">{error} Apply `supabase/migrations/20261018000200_shopping_schema.sql` and `supabase/seed.sql` first.</p>}

      <section className="collection-section" aria-label="Shop by collection">
        <div className="section-heading-row">
          <h2>Shop by collection</h2>
        </div>
        <div className="collection-grid">
          <button
            className="collection-card collection-all"
            type="button"
            onClick={() => scrollToCollection()}
          >
            <span>All Products</span>
            <small>See every collection below</small>
          </button>
          {categories.map((category) => (
            <button
              className={`collection-card ${selectedCategorySlug === category.slug ? 'collection-selected' : ''}`}
              key={category.id}
              type="button"
              onClick={() => scrollToCollection(category.slug)}
            >
              <ProductImage className="collection-image" src={category.image_url} alt="" />
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="catalogue-section" aria-label="Products">
        <div id="catalogue-top" className="catalogue-toolbar">
          <h2>All products <span>({filteredProducts.length})</span></h2>
          <div className="catalogue-controls">
            <label className="catalogue-search">
              <span className="visually-hidden">Search products</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
            </label>
            <label className="sort-select">
              <span className="visually-hidden">Sort products</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>
        {loading && <p className="state-message" role="status">Loading products…</p>}
        {!loading && !error && filteredProducts.length === 0 && <p className="state-message">No products match. Try another search or collection.</p>}
        {categorySections.map((category) => (
          <section className="catalogue-category" id={`collection-${category.slug}`} key={category.id} aria-labelledby={`heading-${category.slug}`}>
            <div className="section-heading-row">
              <h2 id={`heading-${category.slug}`}>{category.name} <span>({category.products.length})</span></h2>
              <button className="text-button" type="button" onClick={() => scrollToCollection()}>Back to top</button>
            </div>
            <div className="product-grid">
              {category.products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        ))}
        {uncategorizedProducts.length > 0 && (
          <section className="catalogue-category" aria-labelledby="heading-other">
            <div className="section-heading-row">
              <h2 id="heading-other">Other products <span>({uncategorizedProducts.length})</span></h2>
            </div>
            <div className="product-grid">
              {uncategorizedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default ShopPage
