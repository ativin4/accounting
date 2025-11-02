'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ProductSelector from './ProductSelector';
import ProductModal from './ProductModal';
import SerialNumberInput from './SerialNumberInput';
import type { Customer, Product, InvoiceItem } from '../../types';

interface InvoiceFormData {
  customerId: string;
  date: string;
  gst: boolean;
  freight: number;
  discount: number;
  paymentType: 'cash' | 'credit';
  items: InvoiceItem[];
}

interface InvoiceFormProps {
  initialData?: Partial<InvoiceFormData>;
  onSuccess?: (invoice: any) => void;
  onCancel?: () => void;
}

export default function InvoiceForm({ initialData, onSuccess, onCancel }: InvoiceFormProps) {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, Product>>(new Map());

  const [formData, setFormData] = useState<InvoiceFormData>({
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    gst: false,
    freight: 0,
    discount: 0,
    paymentType: 'cash',
    items: [],
    ...initialData
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      name: '',
      hsn: '',
      quantity: 1,
      price: 0,
      type: 'retail',
      invoiceId: '',
      serialNumbers: []
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleProductSelect = (product: Product | null, itemIndex: number) => {
    if (product) {
      setSelectedProducts(prev => new Map(prev.set(formData.items[itemIndex].id, product)));
      updateItem(itemIndex, 'name', product.name);
      updateItem(itemIndex, 'hsn', product.hsn);
      updateItem(itemIndex, 'price', product.retailPrice);
      updateItem(itemIndex, 'productId', product.id);
    } else {
      setSelectedProducts(prev => {
        const newMap = new Map(prev);
        newMap.delete(formData.items[itemIndex].id);
        return newMap;
      });
    }
  };

  const handleProductCreated = (product: Product) => {
    setShowProductModal(false);
    // If there's an empty item, populate it with the new product
    const emptyItemIndex = formData.items.findIndex(item => !item.name);
    if (emptyItemIndex !== -1) {
      handleProductSelect(product, emptyItemIndex);
    } else {
      addItem();
      setTimeout(() => handleProductSelect(product, formData.items.length), 100);
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateGST = () => {
    if (!formData.gst) return 0;
    const subtotal = calculateSubtotal();
    return subtotal * 0.18; // 18% GST
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateGST();
    return subtotal + gst + formData.freight - formData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        total: calculateTotal(),
        items: formData.items.map(item => ({
          ...item,
          serialNumbers: item.serialNumbers?.filter(sn => sn.trim()) || []
        }))
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      const result = await response.json();
      onSuccess?.(result);
    } catch (err) {
      console.error('Error creating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Customer and Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.gstin && `(GST: ${customer.gstin})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="invoiceType"
                    checked={!formData.gst}
                    onChange={() => setFormData(prev => ({ ...prev, gst: false }))}
                    className="mr-2"
                  />
                  Regular Invoice
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="invoiceType"
                    checked={formData.gst}
                    onChange={() => setFormData(prev => ({ ...prev, gst: true }))}
                    className="mr-2"
                  />
                  GST Invoice
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentType: e.target.value as 'cash' | 'credit' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Freight/Shipping
              </label>
              <input
                type="number"
                value={formData.freight}
                onChange={(e) => setFormData(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount
              </label>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {selectedCustomer && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Customer Details</h4>
              <p className="text-sm text-gray-600">
                {selectedCustomer.address && <span>{selectedCustomer.address}</span>}
                {selectedCustomer.address && selectedCustomer.mobile && <span> • </span>}
                {selectedCustomer.mobile && <span>{selectedCustomer.mobile}</span>}
              </p>
              {formData.gst && !selectedCustomer.gstin && (
                <p className="text-sm text-orange-600 mt-2">
                  ⚠️ Customer GSTIN is required for GST invoices
                </p>
              )}
            </div>
          )}
        </div>

        {/* Invoice Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Invoice Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Search
                    </label>
                    <ProductSelector
                      onProductSelect={(product) => handleProductSelect(product, index)}
                      onAddNewProduct={() => setShowProductModal(true)}
                      selectedProduct={selectedProducts.get(item.id)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price Type
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="retail">Retail</option>
                        <option value="wholesale">Wholesale</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter item name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HSN/SAC
                    </label>
                    <input
                      type="text"
                      value={item.hsn}
                      onChange={(e) => updateItem(index, 'hsn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="HSN/SAC code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-full px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                      disabled={formData.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="text-right text-sm text-gray-600">
                  Subtotal: {formatCurrency(item.quantity * item.price)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            {formData.gst && (
              <div className="flex justify-between">
                <span>GST (18%):</span>
                <span>{formatCurrency(calculateGST())}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Freight:</span>
              <span>{formatCurrency(formData.freight)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(formData.discount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || formData.items.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>

      {/* Product Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
}