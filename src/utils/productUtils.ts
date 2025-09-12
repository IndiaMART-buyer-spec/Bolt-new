import { ExtractedProduct, Product } from '../types/product';

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
        // If it's base64 data, convert to data URL
        if (base64 && base64 !== 'unclear' && !base64.startsWith('http') && !base64.startsWith('data:')) {
          return `data:image/jpeg;base64,${base64}`;
        }
        // If it's already a URL or unclear, return as is (or empty for unclear)
        return base64 === 'unclear' ? '' : base64;
      }).filter(img => img !== '') // Remove empty/unclear images
    : []; // No placeholder images - show empty array if no images extracted

  return {
    id: extracted.product_id.toString(),
    name: extracted.product_name,
    price: price,
    currency: currency,
    category: 'Extracted Product',
    description: extracted.Description === 'Not Present' ? '' : extracted.Description,
    specifications: specifications,
    images: images,
    page_number: extracted.page_number
  };
};

export const downloadProductsAsJSON = (products: ExtractedProduct[]) => {
  const dataStr = JSON.stringify(products, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `extracted_products_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};