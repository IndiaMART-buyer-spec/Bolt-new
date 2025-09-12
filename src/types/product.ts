export interface ProductSpecification {
  spec_name: string;
  spec_value: string;
}

export interface ExtractedProduct {
  product_id: number;
  product_name: string;
  specifications: ProductSpecification[];
  images: string[];
  price: string;
  Description: string;
  page_number: number;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  currency: string;
  category: string;
  description: string;
  specifications: { [key: string]: string };
  images: string[];
  isEditing?: boolean;
  page_number?: number;
}