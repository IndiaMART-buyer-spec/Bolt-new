import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractedProduct } from '../types/product';

// Replace this with your actual Gemini API key
const GEMINI_API_KEY = 'AIzaSyCJgOshJzaS05KTPh3zQHMQKM7rmSwbEoU';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'Your Actual Gemini APi Key here') {
      throw new Error('Please configure your Gemini API key in the service file');
    }
    
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      }
    });
  }

  private getExtractionPrompt(categoryName: string = "Industrial Products"): string {
    return `You are a structured data extraction system for "${categoryName}" product specifications.
Extract clean, normalized product data from the provided PDF content including ALL images present in the PDF.

CRITICAL IMAGE EXTRACTION REQUIREMENTS:
- Extract EVERY image found in the PDF document
- Convert ALL images to base64 format
- Include product images, diagrams, charts, logos, and any visual content
- Do NOT skip any images, even if they seem unrelated
- If an image cannot be processed, mark it as "extraction_failed" instead of omitting it
- Images array should contain actual base64 data, not empty arrays

Schema (output format):
{
  "product_id": int,
  "product_name": string,
  "specifications": [
    {"spec_name": string, "spec_value": string}
  ],
  "images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."] or [],
  "price": string,
  "Description": string,
  "page_number": int
}

CRITICAL INSTRUCTIONS:
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

4. **Image Extraction**:
- MANDATORY: Extract ALL images from the PDF document
- Convert each image to complete base64 data URL format: "data:image/[type];base64,[base64_data]"
- Include ALL visual content: product photos, technical diagrams, charts, logos, illustrations
- Process images in high quality - do not compress or reduce quality
- If image extraction fails for technical reasons, include "extraction_failed" in the images array
- NEVER return empty images array if images exist in the PDF
- Associate images with the most relevant product based on proximity and context

5. **Extract product description**:
-Extract product description provided in the PDF.
-Summarize in max 250 characters
-Focus on key differentiators and main features.
-If the description is not provided in the PDF, set "Description": "Not Present". 
-Do not create descriptions if not explicitly mentioned in the PDF

6. **Data Quality**:
-Standardize similar specification names (e.g., "Wi-Fi" and "Wireless LAN" → "Wi-Fi").
-Correct spelling errors (e.g., "Batery Life" → "Battery Life").
-Ensure consistent units for measurements.
-Preserve special characters (≤, ≥, ±, °C, %) and do not escape them into Unicode.
-Mark unclear values as "unclear"

7. **Multiple Products**: 
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
"images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="],
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
"images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."],
"Description": "Not Present",
"page_number": 3
}
]

CRITICAL REMINDERS:
- Images array must contain actual base64 data URLs, not empty arrays or placeholders
- Extract ALL images from the PDF, even if they seem unrelated to specific products
- Use complete data URL format: "data:image/[jpeg|png|gif];base64,[actual_base64_data]"
- If PDF contains images but extraction fails, include "extraction_failed" rather than empty array
- Quality and completeness of image extraction is critical for this application

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
      
      console.log('Starting PDF extraction with enhanced image processing...');
      
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
      
      console.log('Raw AI response:', text);
      
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extractedProducts: ExtractedProduct[] = JSON.parse(jsonMatch[0]);
      
      // Log image extraction results
      extractedProducts.forEach((product, index) => {
        console.log(`Product ${index + 1}: ${product.product_name}`);
        console.log(`Images found: ${product.images?.length || 0}`);
        if (product.images && product.images.length > 0) {
          product.images.forEach((img, imgIndex) => {
            console.log(`Image ${imgIndex + 1}: ${img.substring(0, 50)}...`);
          });
        }
      });
      
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