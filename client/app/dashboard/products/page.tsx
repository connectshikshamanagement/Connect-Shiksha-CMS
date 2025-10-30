'use client';

import { useEffect, useState } from 'react';
import { productAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiPlus, FiEdit, FiTrash2, FiPackage, FiAlertTriangle } from 'react-icons/fi';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    costPrice: '',
    sellPrice: '',
    stock: '',
    lowStockThreshold: '',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll();
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const costNum = formData.costPrice === '' ? 0 : Number(formData.costPrice);
    const sellNum = formData.sellPrice === '' ? 0 : Number(formData.sellPrice);
    const stockNum = formData.stock === '' ? 0 : Number(formData.stock);
    const lowStockNum = formData.lowStockThreshold === '' ? 0 : Number(formData.lowStockThreshold);

    if (!formData.name || !formData.sku || !formData.category || sellNum <= 0) {
      showToast.error('Please fill in all required fields');
      return;
    }

    if (sellNum < costNum) {
      showToast.error('Sell price must be greater than or equal to cost price');
      return;
    }

    const loadingToast = showToast.loading(editingProduct ? 'Updating product...' : 'Creating product...');

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category: formData.category,
        costPrice: costNum,
        sellPrice: sellNum,
        stock: stockNum,
        lowStockThreshold: lowStockNum || 0,
      };

      if (editingProduct) {
        await productAPI.update(editingProduct._id, payload);
        showToast.success('Product updated successfully!');
      } else {
        await productAPI.create(payload);
        showToast.success('Product created successfully!');
      }
      
      showToast.dismiss(loadingToast);
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      category: product.category,
      costPrice: product.costPrice ? String(product.costPrice) : '',
      sellPrice: product.sellPrice ? String(product.sellPrice) : '',
      stock: product.stock ? String(product.stock) : '',
      lowStockThreshold: product.lowStockThreshold ? String(product.lowStockThreshold) : '',
    });
    setShowModal(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const loadingToast = showToast.loading('Deleting product...');

    try {
      await productAPI.delete(productId);
      showToast.dismiss(loadingToast);
      showToast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: '',
      costPrice: '',
      sellPrice: '',
      stock: '',
      lowStockThreshold: '',
    });
    setEditingProduct(null);
  };

  const profitMargin = (product: any) => {
    return product.sellPrice - product.costPrice;
  };

  const profitPercentage = (product: any) => {
    if (product.costPrice === 0) return 0;
    return ((product.sellPrice - product.costPrice) / product.costPrice * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Products" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading products...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Products" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Product Catalog</h2>
              <p className="mt-1 text-sm text-gray-600">Manage inventory and product listings</p>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <FiPlus className="mr-2" />
              Add Product
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product: any) => (
              <div key={product._id} className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FiPackage className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{product.category}</p>
                    <p className="mt-1 text-xs font-mono text-gray-400">SKU: {product.sku}</p>
                  </div>
                  {!product.active && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{product.description}</p>
                )}

                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost Price:</span>
                    <span className="font-medium">₹{product.costPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sell Price:</span>
                    <span className="font-medium text-green-600">₹{product.sellPrice}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Margin:</span>
                    <span className="font-medium text-blue-600">
                      ₹{profitMargin(product)} ({profitPercentage(product)}%)
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Stock:</span>
                    <span className={`font-bold ${
                      product.stock === 0 ? 'text-red-600' :
                      product.stock < product.lowStockThreshold ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {product.stock} units
                      {product.stock < product.lowStockThreshold && product.stock > 0 && (
                        <FiAlertTriangle className="ml-1 inline h-4 w-4" />
                      )}
                    </span>
                  </div>
                </div>

                {product.stock < product.lowStockThreshold && (
                  <div className="mt-3 rounded bg-orange-50 px-3 py-2 text-xs text-orange-800">
                    <FiAlertTriangle className="mr-1 inline" />
                    Low stock alert! Below threshold of {product.lowStockThreshold} units
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <FiEdit className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(product._id)}
                  >
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {products.length === 0 && (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <FiPackage className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No products in catalog</p>
              <p className="mt-1 text-sm text-gray-500">Add your first product to get started</p>
              <Button className="mt-4" onClick={() => { resetForm(); setShowModal(true); }}>
                <FiPlus className="mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormInput
                label="Product Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., IoT Development Kit"
              />
            </div>

            <FormInput
              label="SKU (Stock Keeping Unit)"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g., IOT-KIT-001"
            />

            <FormSelect
              label="Category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'IoT Kits', label: 'IoT Kits' },
                { value: 'Drones', label: 'Drones' },
                { value: 'Robotics Kits', label: 'Robotics Kits' },
                { value: 'Educational Materials', label: 'Educational Materials' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormInput
              label="Cost Price (₹)"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="0"
            />

            <FormInput
              label="Sell Price (₹)"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.sellPrice}
              onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
              placeholder="0"
            />

            <FormInput
              label="Initial Stock"
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="0"
            />

            <FormInput
              label="Low Stock Threshold"
              type="number"
              min="0"
              value={formData.lowStockThreshold}
              onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              placeholder="10"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Product description and specifications..."
              />
            </div>

            {Number(formData.costPrice) > 0 && Number(formData.sellPrice) > 0 && (
              <div className="col-span-2 rounded bg-green-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-800">Profit Margin:</span>
                  <span className="font-bold text-green-900">
                    ₹{(Number(formData.sellPrice) - Number(formData.costPrice)).toFixed(2)} 
                    ({(((Number(formData.sellPrice) - Number(formData.costPrice)) / Number(formData.costPrice)) * 100).toFixed(1)}%)
                  </span>
                </div>
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
            <Button type="submit">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
