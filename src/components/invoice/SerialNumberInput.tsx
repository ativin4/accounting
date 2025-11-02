'use client';

import { useState, useEffect } from 'react';

interface SerialNumberInputProps {
  productId: string | undefined;
  quantity: number;
  value: string[];
  onChange: (serialNumbers: string[]) => void;
  disabled?: boolean;
}

export default function SerialNumberInput({
  productId,
  quantity,
  value,
  onChange,
  disabled = false
}: SerialNumberInputProps) {
  const [availableSerialNumbers, setAvailableSerialNumbers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchAvailableSerialNumbers();
    } else {
      setAvailableSerialNumbers([]);
    }
  }, [productId]);

  const fetchAvailableSerialNumbers = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/serial-numbers?status=available`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSerialNumbers(data.serialNumbers.map((sn: any) => sn.serialNumber));
      }
    } catch (err) {
      console.error('Error fetching serial numbers:', err);
      setError('Failed to fetch serial numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleSerialNumberChange = (index: number, serialNumber: string) => {
    const newValue = [...value];
    newValue[index] = serialNumber;
    onChange(newValue);
  };

  const addSerialNumberField = () => {
    onChange([...value, '']);
  };

  const removeSerialNumberField = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleSelectSerialNumber = (index: number, serialNumber: string) => {
    handleSerialNumberChange(index, serialNumber);
  };

  if (!productId) {
    return (
      <div className="text-sm text-gray-500">
        Select a product first to manage serial numbers
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500 flex items-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        Loading serial numbers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
        <button
          onClick={fetchAvailableSerialNumbers}
          className="ml-2 text-blue-600 hover:text-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (availableSerialNumbers.length === 0 && quantity === 1) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">No serial numbers available for this product</p>
        <input
          type="text"
          value={value[0] || ''}
          onChange={(e) => handleSerialNumberChange(0, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter serial number manually"
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Serial Numbers ({value.length}/{quantity})
        </label>
        {availableSerialNumbers.length > 0 && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            {availableSerialNumbers.length} available
          </span>
        )}
      </div>

      {Array.from({ length: Math.max(quantity, value.length) }).map((_, index) => (
        <div key={index} className="flex gap-2">
          {availableSerialNumbers.length > 0 ? (
            <select
              value={value[index] || ''}
              onChange={(e) => handleSelectSerialNumber(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={disabled}
            >
              <option value="">Select serial number</option>
              {availableSerialNumbers
                .filter(sn => !value.includes(sn) || value[index] === sn)
                .map(serialNumber => (
                  <option key={serialNumber} value={serialNumber}>
                    {serialNumber}
                  </option>
                ))
              }
            </select>
          ) : (
            <input
              type="text"
              value={value[index] || ''}
              onChange={(e) => handleSerialNumberChange(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Serial number ${index + 1}`}
              disabled={disabled}
            />
          )}

          {quantity > 1 && index >= quantity && (
            <button
              type="button"
              onClick={() => removeSerialNumberField(index)}
              className="px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              disabled={disabled}
            >
              Remove
            </button>
          )}
        </div>
      ))}

      {availableSerialNumbers.length === 0 && quantity > value.length && (
        <button
          type="button"
          onClick={addSerialNumberField}
          className="px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50"
          disabled={disabled}
        >
          + Add Serial Number Field
        </button>
      )}

      <p className="text-xs text-gray-500">
        {availableSerialNumbers.length > 0
          ? 'Select from available serial numbers or enter manually'
          : 'Enter serial numbers manually for tracking'
        }
      </p>
    </div>
  );
}