'use client';

import { useEffect, useState } from 'react';
import { salesAPI, productAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiPlus, FiShoppingCart, FiPackage, FiAlertTriangle } from 'react-icons/fi';

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    buyer: {
      name: '',
      email: '',
      phone: '',
      organization: '',
      address: '',
    },
    paymentStatus: 'pending',
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, productsRes] = await Promise.all([
        salesAPI.getAll(),
        productAPI.getAll()
      ]);
      
      if (salesRes.data.success) setSales(salesRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p: any) => p._id === productId);
    setSelectedProduct(product);
    setFormData({
      ...formData,
      productId,
      unitPrice: product?.sellPrice || 0,
    });
  };

  const calculateTotal = () => {
    const subtotal = formData.quantity * formData.unitPrice;
    return subtotal - formData.discount;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productId || !formData.buyer.name || !formData.buyer.phone) {
      showToast.error('Please fill in all required fields');
      return;
    }

    if (!selectedProduct) {
      showToast.error('Please select a product');
      return;
    }

    if (formData.quantity > selectedProduct.stock) {
      showToast.error(`Insufficient stock! Only ${selectedProduct.stock} units available`);
      return;
    }

    const loadingToast = showToast.loading('Creating sale...');

    try {
      await salesAPI.create(formData);
      showToast.dismiss(loadingToast);
      showToast.success(`Sale created! Stock decremented. Profit-sharing computed automatically.`);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      buyer: {
        name: '',
        email: '',
        phone: '',
        organization: '',
        address: '',
      },
      paymentStatus: 'pending',
      paymentMethod: 'bank_transfer',
      notes: '',
    });
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Sales" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading sales...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Sales" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Sales Management</h2>
              <p className="mt-1 text-sm text-gray-600">Record sales and track inventory</p>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <FiPlus className="mr-2" />
              New Sale
            </Button>
          </div>

          <div className="rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sales.map((sale: any) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{sale.productId?.name}</div>
                        <div className="text-gray-500">{sale.productId?.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{sale.buyer?.name}</div>
                        <div className="text-gray-500">{sale.buyer?.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {sale.quantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="font-bold text-green-600">₹{sale.finalAmount.toLocaleString()}</div>
                        {sale.discount > 0 && (
                          <div className="text-xs text-gray-500">
                            Discount: ₹{sale.discount}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          sale.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sales.length === 0 && (
                <div className="p-12 text-center">
                  <FiShoppingCart className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">No sales records</p>
                  <p className="mt-1 text-sm text-gray-500">Create your first sale</p>
                  <Button className="mt-4" onClick={() => { resetForm(); setShowModal(true); }}>
                    <FiPlus className="mr-2" />
                    New Sale
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Sale Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title="Create New Sale"
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormSelect
                label="Product"
                required
                value={formData.productId}
                onChange={(e) => handleProductChange(e.target.value)}
                options={products.map((product: any) => ({
                  value: product._id,
                  label: `${product.name} (Stock: ${product.stock}) - ₹${product.sellPrice}`,
                }))}
              />
              {selectedProduct && selectedProduct.stock < selectedProduct.lowStockThreshold && (
                <div className="mt-2 rounded bg-orange-50 px-3 py-2 text-sm text-orange-800">
                  <FiAlertTriangle className="mr-1 inline" />
                  Low stock! Only {selectedProduct.stock} units available
                </div>
              )}
            </div>

            <FormInput
              label="Quantity"
              type="number"
              required
              min="1"
              max={selectedProduct?.stock || 999}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            />

            <FormInput
              label="Unit Price (₹)"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
            />

            <FormInput
              label="Discount (₹)"
              type="number"
              min="0"
              step="0.01"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
              placeholder="0"
            />

            <FormSelect
              label="Payment Status"
              required
              value={formData.paymentStatus}
              onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'paid', label: 'Paid' },
              ]}
            />

            <FormSelect
              label="Payment Method"
              required
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'upi', label: 'UPI' },
                { value: 'cash', label: 'Cash' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]}
            />

            <div className="col-span-2 border-t pt-4">
              <h4 className="mb-3 font-medium text-gray-900">Buyer Information</h4>
            </div>

            <FormInput
              label="Buyer Name"
              required
              value={formData.buyer.name}
              onChange={(e) => setFormData({ 
                ...formData, 
                buyer: { ...formData.buyer, name: e.target.value }
              })}
              placeholder="e.g., ABC School"
            />

            <FormInput
              label="Phone"
              required
              value={formData.buyer.phone}
              onChange={(e) => setFormData({ 
                ...formData, 
                buyer: { ...formData.buyer, phone: e.target.value }
              })}
              placeholder="9876543210"
            />

            <FormInput
              label="Email"
              type="email"
              value={formData.buyer.email}
              onChange={(e) => setFormData({ 
                ...formData, 
                buyer: { ...formData.buyer, email: e.target.value }
              })}
              placeholder="buyer@example.com"
            />

            <FormInput
              label="Organization"
              value={formData.buyer.organization}
              onChange={(e) => setFormData({ 
                ...formData, 
                buyer: { ...formData.buyer, organization: e.target.value }
              })}
              placeholder="Optional"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                value={formData.buyer.address}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  buyer: { ...formData.buyer, address: e.target.value }
                })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Delivery address..."
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Additional notes..."
              />
            </div>

            <div className="col-span-2 rounded bg-blue-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-900">Subtotal:</span>
                  <span className="font-medium">₹{(formData.quantity * formData.unitPrice).toLocaleString()}</span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between text-red-700">
                    <span>Discount:</span>
                    <span>- ₹{formData.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-blue-200 pt-2 text-base font-bold text-blue-900">
                  <span>Total Amount:</span>
                  <span>₹{calculateTotal().toLocaleString()}</span>
                </div>
              </div>
            </div>

            {selectedProduct && (
              <div className="col-span-2 rounded bg-green-50 p-3 text-sm text-green-800">
                <strong>Note:</strong> Stock will be automatically decremented from {selectedProduct.stock} to {selectedProduct.stock - formData.quantity} units after this sale.
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success">
              Complete Sale
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

