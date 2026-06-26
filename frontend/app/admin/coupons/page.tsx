'use client'

import { useEffect, useState } from 'react'
import {
  Ticket,
  Plus,
  Trash2,
  Edit2,
  X,
  Search,
  Calendar,
  Percent,
  Tag,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast-context'

interface Coupon {
  _id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maxDiscountAmount?: number
  minCoursePrice?: number
  expiryDate?: string
  isActive: boolean
  usageLimit?: number
  usedCount: number
  createdBy: {
    _id: string
    name: string
    email: string
  }
  createdAt: string
}

export default function AdminCouponsPage() {
  const toast = useToast()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')

  // Modals / Drawer State
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Form State
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('')
  const [minCoursePrice, setMinCoursePrice] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/admin/coupons')
      setCoupons(data.coupons || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch coupons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCoupons()
  }, [])

  const openCreateModal = () => {
    setFormMode('create')
    setEditingId(null)
    setCode('')
    setDiscountType('percentage')
    setDiscountValue('')
    setMaxDiscountAmount('')
    setMinCoursePrice('')
    setExpiryDate('')
    setUsageLimit('')
    setIsActive(true)
    setFormOpen(true)
    // Collapse layout sidebar to give more screen real estate
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: true }))
  }

  const openEditModal = (coupon: Coupon) => {
    setFormMode('edit')
    setEditingId(coupon._id)
    setCode(coupon.code)
    setDiscountType(coupon.discountType)
    setDiscountValue(String(coupon.discountValue))
    setMaxDiscountAmount(coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '')
    setMinCoursePrice(coupon.minCoursePrice ? String(coupon.minCoursePrice) : '')
    setExpiryDate(coupon.expiryDate ? coupon.expiryDate.split('T')[0] : '')
    setUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : '')
    setIsActive(coupon.isActive)
    setFormOpen(true)
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: true }))
  }

  const closeFormModal = () => {
    setFormOpen(false)
    window.dispatchEvent(new CustomEvent('set-admin-sidebar-collapse', { detail: false }))
  }

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !discountValue) {
      toast.error('Code and discount value are required')
      return
    }

    try {
      setFormLoading(true)
      const payload: any = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        isActive,
      }

      if (maxDiscountAmount) payload.maxDiscountAmount = Number(maxDiscountAmount)
      else payload.maxDiscountAmount = undefined

      if (minCoursePrice) payload.minCoursePrice = Number(minCoursePrice)
      else payload.minCoursePrice = undefined

      if (usageLimit) payload.usageLimit = Number(usageLimit)
      else payload.usageLimit = undefined

      if (expiryDate) {
        payload.expiryDate = new Date(expiryDate).toISOString()
      } else {
        payload.expiryDate = undefined
      }

      if (formMode === 'create') {
        await api.post('/api/admin/coupons', payload)
        toast.success('Coupon created successfully')
      } else {
        await api.put(`/api/admin/coupons/${editingId}`, payload)
        toast.success('Coupon updated successfully')
      }

      closeFormModal()
      fetchCoupons()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save coupon')
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const updated = await api.put(`/api/admin/coupons/${coupon._id}`, {
        isActive: !coupon.isActive,
      })
      toast.success(`Coupon ${coupon.code} ${updated.coupon.isActive ? 'activated' : 'deactivated'}`)
      setCoupons((prev) =>
        prev.map((c) => (c._id === coupon._id ? { ...c, isActive: updated.coupon.isActive } : c))
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  const triggerDelete = (coupon: Coupon) => {
    setCouponToDelete(coupon)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return
    try {
      setDeleteLoading(true)
      await api.del(`/api/admin/coupons/${couponToDelete._id}`)
      toast.success('Coupon deleted successfully')
      setCoupons((prev) => prev.filter((c) => c._id !== couponToDelete._id))
      setDeleteModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete coupon')
    } finally {
      setDeleteLoading(false)
      setCouponToDelete(null)
    }
  }

  // Helper to determine status badge
  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date()
    const expired = coupon.expiryDate && new Date(coupon.expiryDate) < now
    const limitReached = coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit

    if (!coupon.isActive) return <Badge variant="default">Inactive</Badge>
    if (expired) return <Badge variant="error">Expired</Badge>
    if (limitReached) return <Badge variant="warning">Limit Reached</Badge>
    return <Badge variant="success">Active</Badge>
  }

  // Filter and search logic
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    const now = new Date()
    const expired = c.expiryDate && new Date(c.expiryDate) < now

    if (filterType === 'active') return c.isActive && !expired
    if (filterType === 'inactive') return !c.isActive
    if (filterType === 'expired') return expired !== undefined && expired

    return true
  })

  return (
    <div className="p-6 sm:p-8 space-y-8 flex-1 w-full relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] text-indigo-600 font-bold uppercase tracking-wider">
            Finance & Promotion
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-primary mt-1">Discount Coupons.</h2>
          <p className="text-body text-xs mt-1">
            Create and manage promotional discount coupons for student course checkouts.
          </p>
        </div>
        <div>
          <Button onClick={openCreateModal} size="sm" className="bg-primary text-xs cursor-pointer">
            <Plus className="w-4 h-4 mr-1" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
          <input
            type="text"
            placeholder="Search by coupon code (e.g. PROMO50)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-hairline rounded-lg text-sm bg-white placeholder-mute focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive', 'expired'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterType === type
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-body border-hairline hover:bg-canvas-soft-2 hover:text-ink'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      {loading ? (
        <div className="h-64 flex items-center justify-center border border-hairline border-dashed rounded-2xl bg-white">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="w-8 h-8" />
            <p className="text-xs text-mute font-medium">Fetching promotions catalog...</p>
          </div>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center border border-hairline border-dashed rounded-2xl bg-white p-8">
          <Ticket className="w-10 h-10 text-zinc-300 mb-3" />
          <h3 className="font-bold text-gray-900 text-sm">No coupons found</h3>
          <p className="text-gray-500 text-xs mt-1 max-w-xs leading-relaxed">
            {searchQuery || filterType !== 'all'
              ? 'No coupons match your search query or filter selection.'
              : 'Create promotional coupon codes to offer percent-based or fixed discounts on courses.'}
          </p>
          {(searchQuery || filterType !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => {
                setSearchQuery('')
                setFilterType('all')
              }}
            >
              Reset Search & Filters
            </Button>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden border border-hairline shadow-sm rounded-2xl" padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-canvas-soft border-b border-hairline text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Discount Applied</th>
                  <th className="px-6 py-4">Requirements & Limits</th>
                  <th className="px-6 py-4">Redemption Count</th>
                  <th className="px-6 py-4">Valid Until</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredCoupons.map((coupon) => {
                  const expiryStr = coupon.expiryDate
                    ? new Date(coupon.expiryDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Lifetime'

                  return (
                    <tr key={coupon._id} className="hover:bg-canvas-soft/40 transition-colors text-xs">
                      {/* Code */}
                      <td className="px-6 py-4.5 font-bold text-gray-900">
                        <span className="font-mono bg-canvas-soft-2 border border-hairline px-2 py-1 rounded text-primary text-[13px] tracking-wide uppercase shadow-sm">
                          {coupon.code}
                        </span>
                      </td>

                      {/* Discount amount */}
                      <td className="px-6 py-4.5">
                        <div className="font-semibold text-zinc-800 text-sm">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}% Off`
                            : `₹${coupon.discountValue} Off`}
                        </div>
                        {coupon.maxDiscountAmount && coupon.discountType === 'percentage' && (
                          <div className="text-[10px] text-mute mt-0.5">
                            Max Cap: ₹{coupon.maxDiscountAmount}
                          </div>
                        )}
                      </td>

                      {/* Requirements */}
                      <td className="px-6 py-4.5">
                        <div className="text-zinc-700">
                          Min Course Price:{' '}
                          <span className="font-semibold text-zinc-800">
                            {coupon.minCoursePrice ? `₹${coupon.minCoursePrice}` : 'None'}
                          </span>
                        </div>
                        {coupon.usageLimit ? (
                          <div className="text-[10px] text-mute mt-0.5">
                            Redemption limit: {coupon.usageLimit} times
                          </div>
                        ) : (
                          <div className="text-[10px] text-mute mt-0.5">Unlimited redemptions</div>
                        )}
                      </td>

                      {/* Redemptions count */}
                      <td className="px-6 py-4.5">
                        <div className="font-semibold text-zinc-800">
                          {coupon.usedCount} Redemptions
                        </div>
                        {coupon.usageLimit && (
                          <div className="w-24 bg-canvas-soft-2 h-1.5 rounded-full overflow-hidden mt-1 border border-hairline">
                            <div
                              className="bg-zinc-800 h-full rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (coupon.usedCount / coupon.usageLimit) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Valid Until */}
                      <td className="px-6 py-4.5 font-medium text-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-mute" />
                          <span>{expiryStr}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">{getStatusBadge(coupon)}</td>

                      {/* Actions */}
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active Switch */}
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            className="p-1.5 hover:bg-canvas-soft-2 rounded-lg text-mute hover:text-ink transition-colors cursor-pointer"
                            title={coupon.isActive ? 'Deactivate Coupon' : 'Activate Coupon'}
                          >
                            {coupon.isActive ? (
                              <ToggleRight className="w-5 h-5 text-zinc-800" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(coupon)}
                            className="p-1.5 hover:bg-canvas-soft-2 rounded-lg text-mute hover:text-ink transition-colors cursor-pointer"
                            title="Edit Promotion"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => triggerDelete(coupon)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-mute hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Promotion"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Confirm Deletion Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Coupon Code"
        message={`Are you sure you want to permanently delete coupon "${
          couponToDelete?.code || ''
        }"? Once deleted, students will not be able to use it, and existing data will lose this code reference.`}
        confirmText="Permanently Delete"
        cancelText="Keep Coupon"
        isDestructive={true}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          setDeleteModalOpen(false)
          setCouponToDelete(null)
        }}
      />

      {/* Create / Edit Drawer Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          {/* Overlay to close */}
          <div className="absolute inset-0 cursor-default" onClick={closeFormModal} />

          {/* Form Content panel */}
          <div className="relative w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col justify-between z-10 border-l border-hairline animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  {formMode === 'create' ? 'Create Promo Coupon' : 'Update Coupon Settings'}
                </h3>
              </div>
              <button
                onClick={closeFormModal}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-canvas-soft-2 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveCoupon} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Code */}
              <Input
                label="Coupon Code"
                placeholder="e.g. WINTER50, WELCOME100"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                disabled={formMode === 'edit'} // Don't allow changing code in edit mode to preserve references
                className="font-mono uppercase tracking-wider text-[15px]"
                leftIcon={<Ticket className="w-4 h-4" />}
              />

              {/* Discount Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Discount Model</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage')
                      if (Number(discountValue) > 100) setDiscountValue('100')
                    }}
                    className={`flex items-center justify-center gap-2 py-3.5 border rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      discountType === 'percentage'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-zinc-700 border-hairline hover:bg-canvas-soft-2'
                    }`}
                  >
                    <Percent className="w-4 h-4" /> Percentage Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`flex items-center justify-center gap-2 py-3.5 border rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      discountType === 'fixed'
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-zinc-700 border-hairline hover:bg-canvas-soft-2'
                    }`}
                  >
                    <span className="font-sans font-bold">₹</span> Fixed Amount Discount
                  </button>
                </div>
              </div>

              {/* Discount value & Max cap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={discountType === 'percentage' ? 'Percentage Off (%)' : 'Amount Off (₹)'}
                  type="number"
                  placeholder={discountType === 'percentage' ? 'e.g. 15' : 'e.g. 299'}
                  value={discountValue}
                  onChange={(e) => {
                    const val = e.target.value
                    if (discountType === 'percentage' && Number(val) > 100) {
                      setDiscountValue('100')
                    } else {
                      setDiscountValue(val)
                    }
                  }}
                  required
                  min="0.01"
                  step="any"
                />

                {discountType === 'percentage' && (
                  <Input
                    label="Max Cap Discount (₹)"
                    type="number"
                    placeholder="e.g. 500 (Optional)"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    min="0"
                  />
                )}
              </div>

              {/* Min Course Price & Usage Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Min Course Price Required (₹)"
                  type="number"
                  placeholder="e.g. 999 (Optional)"
                  value={minCoursePrice}
                  onChange={(e) => setMinCoursePrice(e.target.value)}
                  min="0"
                />

                <Input
                  label="Total Usage limit"
                  type="number"
                  placeholder="e.g. 100 (Optional)"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  min="1"
                />
              </div>

              {/* Expiry date & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <Input
                  label="Coupon Expiration Date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />

                <div className="flex items-center justify-between border border-hairline p-3 h-11 bg-canvas-soft rounded-lg">
                  <span className="text-xs font-semibold text-zinc-700">Coupon Active</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="p-1 rounded text-zinc-800 transition-colors cursor-pointer"
                  >
                    {isActive ? (
                      <ToggleRight className="w-6 h-6 text-zinc-950" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Help Banner */}
              <div className="flex gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed">
                <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-bold">Security & Limits Enforcement</p>
                  <p className="mt-0.5 text-indigo-800">
                    This coupon will enforce the minimum course price during checkout. Students can use this promo code only once, preventing multi-purchase exploitation.
                  </p>
                </div>
              </div>
            </form>

            {/* Footer Panel */}
            <div className="p-6 border-t border-hairline bg-canvas-soft flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={closeFormModal}
                disabled={formLoading}
                className="bg-white text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                onClick={handleSaveCoupon}
                loading={formLoading}
                className="text-xs bg-primary cursor-pointer"
              >
                {formMode === 'create' ? 'Create Promotion' : 'Update Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
