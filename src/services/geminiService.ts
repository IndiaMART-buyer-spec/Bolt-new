import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedProduct } from '../types/product';

// Replace this with your actual Gemini API key
const GEMINI_API_KEY = 'AIzaSyA-gpzf0nPK7gVmbfSd-etM94AyZq9J2RQ';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_ACTUAL_GEMINI_API_KEY_HERE') {
      throw new Error('Please configure your Gemini API key in the service file');
    }
    
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  private getExtractionPrompt(categoryName: string = "Industrial Products"): string {
    return `You are a structured data extraction system for "${categoryName}" product specifications.
Extract clean, normalized product data from the provided content. 

Schema (output format):
{
  "product_id": int,
  "product_name": string,
  "specifications": [
    {"spec_name": string, "spec_value": string}
  ],
  "images": [base64 string],
  "price": string,
  "Description": string,
  "page_number": int
}
-Use descriptive product names only (e.g., "Decorative Table Lamp") and do not include model numbers or internal codes (e.g., MK-AB-1147740)

2. **Specifications Extraction**:
-Extract all relevant specifications found in the document
-Preserve special characters (≤, ≥, ±, °C, %) in their original form
-For each specification, create a spec_name and spec_value pair.
-If no specifications are available for a product, both the spec_name and spec_value should be set to "Not Present"
Example- {"spec_name": "Not Present", "spec_value": "Not Present"}
-Use normalized, consistent spec_name values (e.g., "Weight", "Dimensions", "Capacity", "Material", "Brand", "Model", "Power", "Voltage", "Pressure", "Temperature Range").
-Do not include price information in the specifications.

3. **Price Extraction**:
-Extract product price if available.
-Standardize with currency (e.g., "₹100/kg", "₹500/piece")
-If price is missing or ambiguous, set "price":"Not Present"
-Provide the price in Indian Rupees (₹)

4. **Extract product description**:
-Extract product description provided in the PDF.
-Summarize in max 250 characters
-Focus on key differentiators and main features.
-If the description is not provided in the PDF, set "Description": "Not Present". 
-Do not create descriptions if not explicitly mentioned in the PDF

5. **Data Quality**:
-Standardize similar specification names (e.g., "Wi-Fi" and "Wireless LAN" → "Wi-Fi").
-Correct spelling errors (e.g., "Batery Life" → "Battery Life").
-Ensure consistent units for measurements.
-Preserve special characters (≤, ≥, ±, °C, %) and do not escape them into Unicode.
-Mark unclear values as "unclear"

6. **Multiple Products**: 
-Treat variants as separate products with unique integer IDs.
-Focus on extracting comprehensive, meaningful specifications as name-value pairs that enable product comparison and proper categorization.
-Extract only top 3 products from each PDF exactly in the order they appear in the PDF.
Output Format (JSON):
[
{
"product_id": 1,
"product_name": "Exact Product Name",
"specifications": [
{"spec_name": "Maximum Power", "spec_value": "500W"},
{"spec_name": "Module Efficiency", "spec_value": "21%"},
{"spec_name": "Operating Temperature Range", "spec_value": "-40°C to +85°C"},
{"spec_name": "Maximum Voltage", "spec_value": "42.02V"},
{"spec_name": "Weight", "spec_value": "28kg"},
{"spec_name": "Material", "spec_value": "Mono PERC, Bifacial 144 Cells"}
],
"price": "₹12000",
"images": ["base64_encoded_image_data"],
"Description": "A high-efficiency product made with Mono PERC, Bifacial 144 cells, providing 500W maximum power output. Ideal for various solar energy applications with excellent temperature resistance from -40°C to +85°C.",
"page_number": 1
},
{
"product_id": 2,
"product_name": "Exact Product Name",
"specifications": [
{"spec_name": "Not Present", "spec_value": "Not Present"}
],
"price": "₹500",
"images": ["unclear"],
"Description": "Not Present",
"page_number": 3
}
]

- Ensure that each product variant is considered as a unique product entry.
- Extract only top 3 products from each PDF exactly in the order they appear in the PDF.
- Include "page_number" to specify the page number each product appears on in the pdf
- Return only valid JSON, no additional text or explanations.`;
  }

  async extractProductsFromPDF(file: File, categoryName?: string): Promise<ExtractedProduct[]> {
    try {
      // Convert PDF to base64
      const base64Data = await this.fileToBase64(file);
      
      const prompt = this.getExtractionPrompt(categoryName);
      
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extractedProducts: ExtractedProduct[] = JSON.parse(jsonMatch[0]);
      return extractedProducts;
    } catch (error) {
      console.error('Error extracting products:', error);
      throw new Error(`Failed to extract products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64Data = result.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  }
}