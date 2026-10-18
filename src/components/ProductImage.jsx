import { useState } from 'react'

function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return <div className={`product-image-fallback ${className}`} role="img" aria-label={alt}>ShopEasy</div>
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export default ProductImage
