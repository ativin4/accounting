'use client';

import { useState } from 'react';
import type { Product } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Product) => void;
  initialProductName?: string;
}

export default function ProductModal({
  isOpen,
  onClose,
  onProductCreated,
  initialProductName = ''
}: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: initialProductName,
    hsn: '',
    wholesalePrice: '',
    retailPrice: '',
    stock: '0',
    category: '',
    trackSerialNumbers: false,
    serialNumbers: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: initialProductName,
      hsn: '',
      wholesalePrice: '',
      retailPrice: '',
      stock: '0',
      category: '',
      trackSerialNumbers: false,
      serialNumbers: []
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        hsn: formData.hsn.trim(),
        wholesalePrice: parseFloat(formData.wholesalePrice),
        retailPrice: parseFloat(formData.retailPrice),
        stock: parseInt(formData.stock),
        category: formData.category.trim() || null,
        trackSerialNumbers: formData.trackSerialNumbers,
        serialNumbers: formData.trackSerialNumbers ? formData.serialNumbers.filter(sn => sn.trim()) : []
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      const result = await response.json();
      onProductCreated(result.product);
      onClose();
      resetForm();
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Clear serial numbers if tracking is disabled
        serialNumbers: checked ? prev.serialNumbers : []
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSerialNumberChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      serialNumbers: prev.serialNumbers.map((sn, i) => i === index ? value : sn)
    }));
  };

  const addSerialNumberField = () => {
    setFormData(prev => ({
      ...prev,
      serialNumbers: [...prev.serialNumbers, '']
    }));
  };

  const removeSerialNumberField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serialNumbers: prev.serialNumbers.filter((_, i) => i !== index)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Product</h2>
          <p className="text-gray-600 mt-1">Add a new product to your inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label htmlFor="hsn" className="block text-sm font-medium text-gray-700 mb-2">
                HSN/SAC Code
              </label>
              <input
                type="text"
                id="hsn"
                name="hsn"
                value={formData.hsn}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter HSN/SAC code"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter category"
              />
            </div>

            <div>
              <label htmlFor="wholesalePrice" className="block text-sm font-medium text-gray-700 mb-2">
                Wholesale Price *
              </label>
              <input
                type="number"
                id="wholesalePrice"
                name="wholesalePrice"
                value={formData.wholesalePrice}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="retailPrice" className="block text-sm font-medium text-gray-700 mb-2">
                Retail Price *
              </label>
              <input
                type="number"
                id="retailPrice"
                name="retailPrice"
                value={formData.retailPrice}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                Initial Stock *
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="trackSerialNumbers"
                name="trackSerialNumbers"
                checked={formData.trackSerialNumbers}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="trackSerialNumbers" className="ml-2 block text-sm text-gray-900">
                Track serial numbers for this product
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enable this to track individual items by serial numbers (useful for electronics, vehicles, etc.)
            </p>
          </div>

          {formData.trackSerialNumbers && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serial Numbers
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Add serial numbers for individual items (optional)
              </p>
              <div className="space-y-2">
                {formData.serialNumbers.map((serialNumber, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Serial number ${index + 1}`}
                    />
                    {formData.serialNumbers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSerialNumberField(index)}
                        className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSerialNumberField}
                  className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
                >
                  + Add Serial Number
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}