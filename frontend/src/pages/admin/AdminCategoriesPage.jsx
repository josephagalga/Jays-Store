import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { DataTable } from '../../components/shared/DataTable'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminApi.getCategories,
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createCategory(data),
    onSuccess: () => { qc.invalidateQueries(['admin-categories']); setShowForm(false); toast.success('Category created') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries(['admin-categories']); setEditingCategory(null); toast.success('Category updated') },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update category'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries(['admin-categories']); toast.success('Category deleted') },
    onError: () => toast.error('Failed to delete category'),
  })

  if (isLoading) return (
    <>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </>
  )

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Category Management</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Manage product categories</p>
          </div>
          <button
            onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '', is_active: true }); setShowForm(true) }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Category
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-6 mb-8">
            <h2 className="serif text-xl font-medium text-[var(--ink)] mb-6">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (editingCategory) updateMutation.mutate({ id: editingCategory.id, data: formData }); else createMutation.mutate(formData) }} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="e.g. Men's Fashion"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="Category description (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} className="w-5 h-5 accent-[var(--ink)]" />
                  <span className="text-sm text-[var(--ink)]">Active</span>
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                <button type="submit" className="flex-1 px-6 py-3 bg-[var(--ink)] text-white text-sm font-semibold rounded-xl hover:opacity-80 transition-opacity">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingCategory(null); setFormData({ name: '', description: '', is_active: true }) }} className="px-6 py-3 border border-[var(--border)] text-[var(--ink)] text-sm font-semibold rounded-xl hover:bg-[var(--off)] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <DataTable
          columns={[
            { key: 'name', label: 'Name', width: '200px', render: (v) => <p className="font-medium text-[var(--ink)]">{v}</p> },
            { key: 'description', label: 'Description', width: '300px', render: (v) => <p className="text-sm text-[var(--muted)] line-clamp-1 max-w-xs">{v || '—'}</p> },
            { key: 'is_active', label: 'Status', width: '100px', render: (v) => <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${v ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{v ? 'Active' : 'Inactive'}</span> },
            { key: 'actions', label: 'Actions', width: '120px', render: (v, row) => (
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingCategory(row); setFormData({ name: row.name, description: row.description || '', is_active: row.is_active }); setShowForm(true) }} className="px-3 py-1.5 text-xs font-medium text-[var(--ink)] border border-[var(--border)] rounded-xl hover:bg-[var(--off)] transition-colors">Edit</button>
                <button onClick={() => { if (confirm('Delete this category?')) { deleteMutation.mutate(row.id) } }} className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors">Delete</button>
              </div>
            )},
          ]}
          data={categories || []}
          keyField="id"
          emptyMessage="No categories yet. Click 'Add Category' to create one."
        />
      </div>
    </>
  )
}
