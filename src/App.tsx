import React, { useState } from 'react';
import { Upload, FileText, Image, ChevronRight, Save, Eye, X, Edit3, Check, Plus, File, Grid, List, CheckCircle, Download, AlertCircle } from 'lucide-react';
import { GeminiService } from './services/geminiService';
import { ApiService, ApiProduct } from './services/apiService';
import { Product, ExtractedProduct } from './types/product';
import { convertExtractedToProduct, downloadProductsAsJSON } from './utils/productUtils';

const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];
function App() {
  const [activeTab, setActiveTab] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isUploading, setIsUploading] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [selectedImages, setSelectedImages] = useState<{ productId: string; images: string[] } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [categoryName, setCategoryName] = useState('Industrial Products');
  const [extractionError, setExtractionError] = useState('');
  const [isProcessingApi, setIsProcessingApi] = useState(false);
  const [apiError, setApiError] = useState('');

  // Check if API key is configured
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  React.useEffect(() => {
    // Check if API key is properly configured
    try {
      new GeminiService();
      setApiKeyConfigured(true);
    } catch (error) {
      setApiKeyConfigured(false);
      setExtractionError('API key not configured. Please add your Gemini API key to the service file.');
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === 'application/pdf') {
      processFile(files[0]);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setUploadedFile(file);
    extractProductsFromPDF(file);
  };

  const extractProductsFromPDF = async (file: File) => {
    if (!apiKeyConfigured) {
      setExtractionError('API key not configured. Please add your Gemini API key to the service file.');
      return;
    }

    // Clear previous data
    setProducts([]);
    setExtractedProducts([]);
    setApiProducts([]);
    setExtractionError('');
    setApiError('');
    
    setIsUploading(true);
    setExtractionProgress('Initializing AI extraction...');

    try {
      const geminiService = new GeminiService();
      
      setExtractionProgress('Analyzing PDF content and extracting images...');
      const extracted = await geminiService.extractProductsFromPDF(file, categoryName);
      
      console.log('Extracted data:', extracted); // Debug log
      
      setExtractionProgress('Converting product data...');
      const convertedProducts = extracted.map(product => convertExtractedToProduct(product, categoryName));
      
      setExtractedProducts(extracted);
      setProducts(convertedProducts);
      setExtractionProgress(`Gemini extraction completed! Found ${extracted.length} products. Now sending to Python API...`);
      
      // Send to Python API
      await sendToApi(file, extracted);
      
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract products');
    } finally {
      setIsUploading(false);
    }
  };

  const sendToApi = async (file: File, extractedProducts: ExtractedProduct[]) => {
    setIsProcessingApi(true);
    setExtractionProgress('Sending data to Python API for image processing...');
    
    try {
      const apiResponse = await ApiService.sendPdfAndProducts(file, extractedProducts);
      setApiProducts(apiResponse.results);
      setExtractionProgress(`API processing completed! Received ${apiResponse.results.length} products with processed images.`);
      
      setTimeout(() => {
        setExtractionProgress('');
      }, 3000);
    } catch (error) {
      console.error('API error:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to process with Python API');
    } finally {
      setIsProcessingApi(false);
    }
  };

  const handleSaveAndProceed = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setActiveTab(2);
    }, 1500);
  };

  const handleSaveAndFinish = () => {
    setIsFinishing(true);
    setTimeout(() => {
      setIsFinishing(false);
      alert('Products saved successfully!');
    }, 2000);
  };
  const toggleEdit = (productId: string) => {
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, isEditing: !product.isEditing }
        : product
    ));
  };

  const updateProduct = (productId: string, field: string, value: string) => {
    setProducts(products.map(product => 
      product.id === productId 
        ? { ...product, [field]: value }
        : product
    ));
  };

  const openImageGallery = (productId: string, images: string[]) => {
    setSelectedImages({ productId, images });
  };

  const closeImageGallery = () => {
    setSelectedImages(null);
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '₹';
  };

  const handleDownloadJSON = () => {
    if (extractedProducts.length > 0) {
      downloadProductsAsJSON(extractedProducts);
    }
  };
  const ProgressIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
          activeTab >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <div className={`h-1 w-16 rounded-full ${
          activeTab >= 2 ? 'bg-blue-600' : 'bg-gray-200'
        }`}></div>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
          activeTab >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
      </div>
      <div className="ml-6 text-sm text-gray-600">
        Step {activeTab} of 2
      </div>
    </div>
  );

  const ProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      <div className="p-6">
        {/* Product Image Thumbnail - Only show if images exist */}
        {product.images.length > 0 ? (
          <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Image size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No images extracted</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-sm text-blue-600 font-medium">{product.category}</p>
          </div>
          <span className="text-2xl font-bold text-green-600 ml-4">
            {getCurrencySymbol(product.currency)} {product.price}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm leading-relaxed mb-4">{product.description}</p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={16} />
            Specifications
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(product.specifications).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-600">{key}:</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
        
        {product.images.length > 0 ? (
          <button
            onClick={() => openImageGallery(product.id, product.images)}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Image size={18} />
            View Images ({product.images.length})
          </button>
        ) : (
          <div className="w-full bg-gray-50 text-gray-500 font-medium py-3 px-4 rounded-lg text-center">
            No images available
          </div>
        )}
      </div>
    </div>
  );

  const ApiProductCard = ({ product }: { product: ApiProduct }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
      <div className="p-6">
        {/* Product Image from API */}
        {product.image && product.image !== "Not Present" ? (
          <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
            <img
              src={`data:image/png;base64,${product.image}`}
              alt={product.product_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Image size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No image available</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{product.product_name}</h3>
            <p className="text-sm text-blue-600 font-medium">Page {product.page_number}</p>
          </div>
          <span className="text-2xl font-bold text-green-600 ml-4">
            {product.price}
          </span>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText size={16} />
            Specifications
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {product.specifications.map((spec, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600">{spec.spec_name}:</span>
                <span className="font-medium text-gray-900">{spec.spec_value}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            API Processed
          </span>
        </div>
      </div>
    </div>
  );

  const EditableProductCard = ({ product }: { product: Product }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Product Images */}
        <div className="lg:w-1/3 p-6">
          <div className="space-y-4">
            {product.images.length > 0 ? (
              <>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-red-500">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(0, 4).map((image, imgIndex) => (
                    <div key={imgIndex} className="aspect-square rounded-md overflow-hidden bg-gray-100 border">
                      <img
                        src={image}
                        alt={`${product.name} ${imgIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => openImageGallery(product.id, product.images)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="aspect-square rounded-lg bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Image size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No images extracted</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, imgIndex) => (
                    <div key={imgIndex} className="aspect-square rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <Image size={16} className="text-gray-400 opacity-50" />
                    </div>
                  ))}
                </div>
              </>
            )}
            <button className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors">
              View PDF
            </button>
          </div>
        </div>

        {/* Center: Product Details */}
        <div className="lg:w-1/3 p-6 border-l border-r border-gray-200">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {product.isEditing ? (
                  <input
                    type="text"
                    value={product.name}
                    onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                    className="text-xl font-bold text-gray-900 mb-1 w-full border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h2>
                )}
                <div className="flex items-center gap-2">
                  {product.isEditing ? (
                    <>
                      <select
                        value={product.currency}
                        onChange={(e) => updateProduct(product.id, 'currency', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {currencies.map(currency => (
                          <option key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={product.price}
                        onChange={(e) => updateProduct(product.id, 'price', e.target.value)}
                        placeholder="Enter price"
                        className="text-2xl font-bold text-green-600 border border-gray-300 rounded px-2 py-1 flex-1"
                      />
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">
                      {getCurrencySymbol(product.currency)} {product.price || 'Price not set'}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleEdit(product.id)}
                className={`p-2 rounded-lg transition-colors ${
                  product.isEditing 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                {product.isEditing ? <Check size={16} /> : <Edit3 size={16} />}
              </button>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Product Description</h3>
              {product.isEditing ? (
                <textarea
                  value={product.description}
                  onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                  className="text-sm text-gray-600 leading-relaxed w-full border border-gray-300 rounded px-2 py-1 h-20 resize-none"
                />
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Specifications */}
        <div className="lg:w-1/3 p-6 bg-gray-50">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Specification/Additional Details</h3>
              <span className="text-red-600 text-sm font-medium">Specifications</span>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                  <span className="text-sm text-gray-600 font-medium">{key}</span>
                  {product.isEditing ? (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        const newSpecs = { ...product.specifications };
                        newSpecs[key] = e.target.value;
                        setProducts(products.map(p => 
                          p.id === product.id ? { ...p, specifications: newSpecs } : p
                        ));
                      }}
                      className="text-sm text-blue-600 font-medium border border-gray-300 rounded px-1 py-0.5 w-24"
                    />
                  ) : (
                    <span className="text-sm text-blue-600 font-medium">{value}</span>
                  )}
                </div>
              ))}
            </div>
            
            <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1">
              <Plus size={12} />
              Add more
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const TableView = () => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specifications</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12">
                      {product.images.length > 0 ? (
                        <img className="h-12 w-12 rounded-lg object-cover" src={product.images[0]} alt={product.name} />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Image size={20} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getCurrencySymbol(product.currency)} {product.price}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {Object.keys(product.specifications).length} specs
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.images.length > 0 ? (
                    <button
                      onClick={() => openImageGallery(product.id, product.images)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      {product.images.length} images
                    </button>
                  ) : (
                    <span className="text-gray-400">No images</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => toggleEdit(product.id)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {product.isEditing ? 'Save' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  const ImageGallery = () => {
    if (!selectedImages) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">Product Images</h3>
            <button
              onClick={closeImageGallery}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedImages.images.map((image, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={image}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
          <p className="text-gray-600">Manage your product catalog and specifications</p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator />

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab(1)}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 1
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Upload size={18} />
              Product Upload
            </button>
            <button
              onClick={() => setActiveTab(2)}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === 2
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Eye size={18} />
              Product Listing
            </button>
          </div>
        </div>

        {/* Tab 1: Product Upload */}
        {activeTab === 1 && (
          <div className="max-w-6xl mx-auto">
            {/* PDF Upload Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Product Extraction</h2>
                <p className="text-gray-600 mb-6">Upload your product catalog PDF and let AI extract structured product information with images</p>
                
                {/* Drag and Drop Zone */}
                {apiKeyConfigured ? (
                  <div
                  className={`border-2 border-dashed rounded-xl p-8 transition-all duration-200 ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  >
                  <div className="flex flex-col items-center">
                    <File className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drag and drop your PDF here, or
                    </p>
                    <label className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg cursor-pointer transition-colors duration-200">
                      <FileText size={20} />
                      Choose PDF File
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-gray-500 mt-2">Maximum file size: 10MB</p>
                  </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-red-300 rounded-xl p-8 bg-red-50">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                      <p className="text-lg font-medium text-red-700 mb-2">
                        API Key Required
                      </p>
                      <p className="text-sm text-red-600 text-center max-w-md">
                        Please configure your Gemini API key in the <code>src/services/geminiService.ts</code> file to enable PDF extraction.
                      </p>
                    </div>
                  </div>
                )}

                {/* File Info */}
                {uploadedFile && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center gap-3 text-green-700">
                      <FileText size={20} />
                      <span className="font-medium">{uploadedFile.name}</span>
                      <span className="text-sm">({formatFileSize(uploadedFile.size)})</span>
                    </div>
                  </div>
                )}
              </div>
              
              {(isUploading || isProcessingApi || extractionProgress) && (
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-3 text-blue-600">
                    {(isUploading || isProcessingApi) && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
                    <span>{extractionProgress || 'Processing PDF...'}</span>
                  </div>
                </div>
              )}

              {extractionError && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <div>
                      <p className="font-medium">Extraction Error</p>
                      <p className="text-sm">{extractionError}</p>
                      <p className="text-sm mt-1">Please check your API key configuration and try again.</p>
                    </div>
                  </div>
                </div>
              )}

              {apiError && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <div>
                      <p className="font-medium">API Processing Error</p>
                      <p className="text-sm">{apiError}</p>
                      <p className="text-sm mt-1">Make sure your Python API is running on http://127.0.0.1:8000</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Products Grid */}
            {apiProducts.length > 0 ? (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    API Processed Products ({apiProducts.length})
                  </h3>
                  <button
                    onClick={() => downloadProductsAsJSON(apiProducts)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Download API Results
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {apiProducts.map((product) => (
                    <ApiProductCard key={product.product_id} product={product} />
                  ))}
                </div>
              </div>
            ) : products.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Extracted Products ({products.length})
                  </h3>
                  {extractedProducts.length > 0 && (
                    <button
                      onClick={handleDownloadJSON}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      <Download size={16} />
                      Download Extracted Data
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Product Listing */}
        {activeTab === 2 && (
          <div className="max-w-6xl mx-auto">
            {/* View Toggle */}
            {products.length > 0 && (
              <div className="flex justify-end mb-6">
                <div className="bg-white rounded-lg p-1 shadow-md">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                      viewMode === 'card'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <Grid size={16} />
                    Card View
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                      viewMode === 'table'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600'
                    }`}
                  >
                    <List size={16} />
                    Table View
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'card' ? (
              <div className="space-y-6">
                {products.map((product) => (
                  <EditableProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <TableView />
            )}
            
            {products.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Eye className="w-8 h-8 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Available</h2>
                <p className="text-gray-600 mb-4">Please upload a PDF in the first tab to see products here</p>
              </div>
            )}
          </div>
        )}

        {/* Sticky Save Button */}
        {activeTab === 1 && (products.length > 0 || apiProducts.length > 0) && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
            <button
              onClick={handleSaveAndProceed}
              disabled={isSaving}
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save and Proceed
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Sticky Save & Finish Button */}
        {activeTab === 2 && (products.length > 0 || apiProducts.length > 0) && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
            <button
              onClick={handleSaveAndFinish}
              disabled={isFinishing}
              className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              {isFinishing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Finishing...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Save & Finish
                </>
              )}
            </button>
          </div>
        )}
        {/* Image Gallery Modal */}
        <ImageGallery />
      </div>
    </div>
  );
}

export default App;