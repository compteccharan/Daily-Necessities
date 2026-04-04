function normalizeAssetPath(path) {
  return (path || '').replace(/^\.?\//, '')
}

export function slugifyProductName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildProductId(name, index) {
  return `${slugifyProductName(name) || 'product'}-${index}`
}

export function readProductCard(card, index) {
  const name = card.querySelector('.product-name')?.textContent?.trim() || `Product ${index + 1}`
  const priceText = card.querySelector('.current-price')?.textContent?.replace(/[^\d.]/g, '') || '0'
  const price = Number.parseFloat(priceText) || 0
  const image = normalizeAssetPath(card.querySelector('.product-image')?.getAttribute('src') || '')
  const sectionName = card.closest('.product-section')?.querySelector('.section-title')?.textContent?.trim() || ''
  const productId = card.getAttribute('data-product-id') || buildProductId(name, index)

  card.setAttribute('data-product-id', productId)

  return {
    id: productId,
    name,
    price,
    image,
    sectionName,
  }
}

function extractCatalogFromDocument(doc, live = false) {
  const cards = [...doc.querySelectorAll('.product-card')]
  return cards.map((card, index) => readProductCard(card, index))
}

let cachedCatalogPromise = null

export function assignProductIds(root = document) {
  extractCatalogFromDocument(root, true)
}

async function fetchCatalogDocument() {
  const response = await fetch('/Daily-Necessities/index.html', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Unable to load product catalog')
  }

  const html = await response.text()
  return new DOMParser().parseFromString(html, 'text/html')
}

export async function getCatalog() {
  if (!cachedCatalogPromise) {
    cachedCatalogPromise = (async () => {
      if (document.querySelector('.product-card')) {
        assignProductIds(document)
        return extractCatalogFromDocument(document, true)
      }

      const parsedDocument = await fetchCatalogDocument()
      return extractCatalogFromDocument(parsedDocument)
    })()
  }

  return cachedCatalogPromise
}

export async function getCatalogMap() {
  const catalog = await getCatalog()
  return new Map(catalog.map((product) => [product.id, product]))
}

export async function getProductById(productId) {
  const catalogMap = await getCatalogMap()
  return catalogMap.get(productId) || null
}

export async function enrichItemWithCatalog(item) {
  const product = await getProductById(item.product_id || item.id)

  return {
    ...item,
    product_name: item.product_name || product?.name || 'Product',
    price_at_add: Number(item.price_at_add ?? item.price ?? product?.price ?? 0),
    price: Number(item.price ?? item.price_at_add ?? product?.price ?? 0),
    product_image: item.product_image || product?.image || '',
    section_name: item.section_name || product?.sectionName || '',
  }
}
