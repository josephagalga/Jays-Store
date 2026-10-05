import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminInventoryPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', price: '', discount_price: '', category: '', stock: 0, is_active: true })

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-inventory'],
    queryFn: () => adminApi.getInventory(),
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createProduct(data),
    onSuccess: () => { qc.invalidateQueries(['admin-inventory']); setShowForm(false); toast.success('Product created') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create product'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries(['admin-inventory']); setEditingProduct(null); toast.success('Product updated') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update product'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries(['admin-inventory']); toast.success('Product deleted') },
    onError: () => toast.error('Failed to delete product'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      discount_price: product.discount_price || '',
      category: product.category,
      stock: product.stock,
      is_active: product.is_active,
    })
    setShowForm(true)
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Inventory Management</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Manage products, stock, and variants</p>
          </div>
          <button
            onClick={() => { setEditingProduct(null); setFormData({ name: '', description: '', price: '', discount_price: '', category: '', stock: 0, is_active: true }); setShowForm(true) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Product
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-6 mb-8">
            <h2 className="serif text-xl font-medium text-[var(--ink)] mb-6">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="Product name"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="Product description"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Price (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Discount Price (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_price}
                  onChange={e => setFormData({ ...formData, discount_price: e.target.value })}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Stock</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="Category name"
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 accent-[var(--ink)]" />
                  <span className="text-sm text-[var(--ink)]">Active</span>
                </label>
              </div>
              <div className="md:col-span-2 flex gap-3 pt-4 border-t border-[var(--border)]">
                <button type="submit" className="flex-1 px-6 py-3 bg-[var(--ink)] text-white text-sm font-semibold rounded-xl hover:opacity-80 transition-opacity">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingProduct(null); setFormData({ name: '', description: '', price: '', discount_price: '', category: '', stock: 0, is_active: true }) }} className="px-6 py-3 border border-[var(--border)] text-[var(--ink)] text-sm font-semibold rounded-xl hover:bg-[var(--off)] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Product</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Category</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Price</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Stock</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {products?.map(product => (
                <tr key={product.id} className="hover:bg-[var(--off)]/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--ink)]">{product.name}</p>
                    <p className="text-xs text-[var(--muted)] line-clamp-1">{product.description}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.category}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[var(--ink)]">GHS {parseFloat(product.price).toFixed(2)}</p>
                    {product.discount_price && <p className="text-xs text-[var(--muted)] line-through">GHS {parseFloat(product.discount_price).toFixed(2)}</p>}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <span className={product.stock > 0 ? 'text-[var(--ink)]' : 'text-rose-600 font-medium'}>{product.stock}</span>
                    {product.stock < 5 && product.stock > 0 && <span className="ml-1 text-xs text-amber-600">Low</span>}
                    {product.stock === 0 && <span className="ml-1 text-xs text-rose-600 font-medium">Out of stock</span>}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={product.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(product)} className="px-3 py-1.5 text-xs font-medium text-[var(--ink)] border border-[var(--border)] rounded-xl hover:bg-[var(--off)] transition-colors">Edit</button>
                      <button onClick={() => handleDelete(product.id)} className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!products || !products.length) && (
                <tr>
                  <td colSpan="6" className="text-center py-20 text-sm text-[var(--muted)]">No products yet. Click "Add Product" to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
