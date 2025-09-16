import { ExtractedProduct, Product } from '../types/product';
import { ApiProduct } from '../services/apiService';

export const convertExtractedToProduct = (extracted: ExtractedProduct): Product => {
  // Convert specifications array to object
  const specifications: { [key: string]: string } = {};
  extracted.specifications.forEach(spec => {
    specifications[spec.spec_name] = spec.spec_value;
  });

  // Extract price and currency
  let price = extracted.price;
  let currency = 'INR';
  
  if (price && price !== 'Not Present') {
    // Remove currency symbol and extract numeric value
    price = price.replace(/[₹$€£]/g, '').trim();
    if (extracted.price.includes('₹')) currency = 'INR';
    else if (extracted.price.includes('$')) currency = 'USD';
    else if (extracted.price.includes('€')) currency = 'EUR';
    else if (extracted.price.includes('£')) currency = 'GBP';
  } else {
    price = '';
  }

  // Only use images that are actually extracted from PDF
  const images = extracted.images && extracted.images.length > 0 
    ? extracted.images.map(base64 => {
        // Handle different image formats from PDF extraction
        if (base64 && 
            base64 !== 'unclear' && 
            base64 !== 'Not Present' && 
            base64 !== 'extraction_failed' &&
            base64.trim() !== '') {
          // If it's already a data URL, return as is
          if (base64.startsWith('data:')) {
            return base64;
          }
          // If it's a URL, return as is
          if (base64.startsWith('http')) {
            return base64;
          }
          // If it's base64 data, convert to data URL
          // Try to detect image type from base64 header
          if (base64.startsWith('/9j/')) {
            return `data:image/jpeg;base64,${base64}`;
          } else if (base64.startsWith('iVBORw0KGgo')) {
            return `data:image/png;base64,${base64}`;
          } else if (base64.startsWith('R0lGODlh')) {
            return `data:image/gif;base64,${base64}`;
          } else {
            // Default to jpeg if type cannot be determined
            return `data:image/jpeg;base64,${base64}`;
          }
        }
        return '';
      }).filter(img => img !== '' && img !== 'unclear' && img !== 'Not Present' && img !== 'extraction_failed') // Remove invalid images
    : []; // Empty array if no valid images extracted from PDF

  console.log(`Product ${extracted.product_name}: ${images.length} valid images processed`);

  return {
    id: extracted.product_id.toString(),
    name: extracted.product_name,
    price: price,
    currency: currency,
    category: categoryName || 'Extracted Product',
    description: extracted.Description === 'Not Present' ? '' : extracted.Description,
    specifications: specifications,
    images: images,
    page_number: extracted.page_number
  };
};

export const downloadProductsAsJSON = (products: ExtractedProduct[] | ApiProduct[]) => {
  const dataStr = JSON.stringify(products, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const isApiProducts = products.length > 0 && 'image' in products[0];
  const exportFileDefaultName = `${isApiProducts ? 'api_processed' : 'extracted'}_products_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};