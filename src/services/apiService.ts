export interface ApiProduct {
  product_id: number;
  product_name: string;
  specifications: Array<{ spec_name: string; spec_value: string }>;
  price: string;
  image: string;
  page_number: number;
}

export interface ApiResponse {
  results: ApiProduct[];
}

export class ApiService {
  private static readonly API_URL = 'https://17b798809fc5.ngrok-free.app/extract';

  static async sendPdfAndProducts(pdfFile: File, extractedProducts: any[]): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('products', JSON.stringify(extractedProducts));

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw new Error(`Failed to process PDF with API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}