// app/invoices/list/page.js
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
    FileText, Calendar, Filter, Download, Eye, Edit, Trash2, 
    Loader2, Plus, X, AlertTriangle, Printer, Clock 
} from 'lucide-react'
import { supabase } from '@/lib/supabase' 
import { createInvoicePDF } from '@/lib/createInvoicePDF'
import toast, { Toaster } from 'react-hot-toast'

// =========================================================================
// 1. CONFIGURATION & HELPERS
// =========================================================================

const INVOICES_TABLE = 'invoices'
const ITEMS_PER_PAGE = 10
const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// Helper for date comparison - FIXED to properly filter dates
const getDateRange = (filter) => {
    const today = new Date()
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    
    let startDate = new Date()
    
    switch (filter) {
        case 'day':
            startDate.setHours(0, 0, 0, 0)
            break
        case 'week':
            startDate.setHours(0, 0, 0, 0)
            const dayOfWeek = startDate.getDay()
            const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            startDate.setDate(startDate.getDate() - diff)
            break
        case 'month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1)
            startDate.setHours(0, 0, 0, 0)
            break
        case 'year':
            startDate = new Date(today.getFullYear(), 0, 1)
            startDate.setHours(0, 0, 0, 0)
            break
        case 'all':
        default:
            return { startDate: null, endDate: null }
    }
    
    return { 
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0] 
    }
}

// =========================================================================
// 2. INVOICE DETAIL MODAL - FIXED to show service names correctly
// =========================================================================

const InvoiceDetailModal = ({ isOpen, onClose, invoice, onDownloadPDF }) => {
    if (!isOpen || !invoice) return null

    const totalPaid = toNumber(invoice.total_paid)
    const finalPayable = toNumber(invoice.final_payable)
    const balanceDue = finalPayable - totalPaid

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Invoice Details: {invoice.invoice_number}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Summary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                        <div className="text-sm">
                            <p className="font-semibold text-gray-600 mb-1">Patient</p>
                            <p className="font-medium text-gray-900">{invoice.patient_name || 'N/A'}</p>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold text-gray-600 mb-1">Date</p>
                            <p className="font-medium text-gray-900">
                                {new Date(invoice.invoice_date).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </p>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold text-gray-600 mb-1">Doctor</p>
                            <p className="font-medium text-gray-900">{invoice.doctor_name || 'N/A'}</p>
                        </div>
                        <div className="text-sm">
                            <p className="font-semibold text-gray-600 mb-1">Status</p>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                invoice.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : invoice.status === 'partially_paid'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {invoice.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Line Items Table - FIXED to show service names */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            Services & Charges
                        </h4>
                        <div className="border rounded-lg overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">Service</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Rate (Rs.)</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Discount (%)</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">Amount (Rs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoice.line_items && invoice.line_items.length > 0 ? (
                                        invoice.line_items.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {item.name || item.service || 'Unnamed Service'}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-600">
                                                    {toNumber(item.rate || item.charges).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-red-600 font-medium">
                                                    {toNumber(item.discount_percent || item.discount || 0).toFixed(0)}%
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                                                    {toNumber(item.final_amount || item.amount || (item.rate - (item.rate * (item.discount_percent || 0) / 100))).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                No services found for this invoice
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between text-sm font-medium text-gray-600">
                                <span>Gross Total:</span> 
                                <span className="text-gray-900">Rs. {toNumber(invoice.gross_total).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-red-600">
                                <span>Total Discount:</span> 
                                <span>- Rs. {toNumber(invoice.total_discount).toFixed(2)}</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between font-bold text-lg text-gray-900">
                                <span>Final Payable:</span> 
                                <span className="text-purple-600">Rs. {finalPayable.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium text-blue-600">
                                <span>Amount Paid:</span> 
                                <span>Rs. {totalPaid.toFixed(2)}</span>
                            </div>
                            <div className={`border-t pt-3 flex justify-between font-bold text-lg ${
                                balanceDue > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                                <span>Balance Due:</span> 
                                <span>
                                    Rs. {Math.abs(balanceDue).toFixed(2)} 
                                    {balanceDue < 0 ? ' (Credit)' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700 transition-all"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => onDownloadPDF(invoice)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
                    >
                        <Printer size={18} /> Print/Download PDF
                    </button>
                </div>
            </div>
        </div>
    )
}

// =========================================================================
// 3. MAIN INVOICE LIST PAGE COMPONENT
// =========================================================================

export default function InvoiceListPage() {
    const router = useRouter()
    const [invoices, setInvoices] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterPeriod, setFilterPeriod] = useState('month')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [invoiceToDelete, setInvoiceToDelete] = useState(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState(null)

    // Fetch full invoice data including nested items for PDF/Detail
    const fetchInvoices = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from(INVOICES_TABLE)
                .select(`
                    *,
                    patient:patient_id (name, mr_number, phone),
                    doctor:doctor_id (name, specialization, phone)
                `, { count: 'exact' })

            const { startDate, endDate } = getDateRange(filterPeriod)
            
            if (startDate && endDate) {
                query = query
                    .gte('invoice_date', startDate)
                    .lte('invoice_date', endDate)
            }
            
            const offset = (currentPage - 1) * ITEMS_PER_PAGE
            query = query
                .order('invoice_date', { ascending: false })
                .order('created_at', { ascending: false })
                .range(offset, offset + ITEMS_PER_PAGE - 1)
            
            const { data, error, count } = await query

            if (error) throw error
            
            // Map the data to flatten patient/doctor names for easier rendering
            const mappedData = (data || []).map(invoice => ({
                ...invoice,
                patient_name: invoice.patient?.name || 'Unknown Patient',
                doctor_name: invoice.doctor?.name || 'N/A'
            }))

            setInvoices(mappedData)
            setTotalCount(count || 0)

        } catch (error) {
            console.error('Error fetching invoices:', error.message)
            setInvoices([])
            setTotalCount(0)
            toast.error('Failed to load invoices: ' + error.message, { 
                position: 'top-right',
                duration: 4000 
            })
        } finally {
            setLoading(false)
        }
    }

    // --- Action Handlers ---

    const handleViewEdit = (invoice, mode) => {
        if (mode === 'Edit') {
            router.push(`/invoices/create?id=${invoice.id}`)
        } else if (mode === 'View') {
            setSelectedInvoice(invoice)
            setShowDetailModal(true)
        }
    }
    
    const handleDownloadPDF = async (invoice) => {
        try {
            toast.loading('Generating PDF...', { id: 'pdf-gen' })
            
            // Prepare the comprehensive data structure required by createInvoicePDF
            const invoiceData = {
                // Patient/Doctor Info
                patient: { 
                    name: invoice.patient_name, 
                    mr_number: invoice.patient?.mr_number || 'N/A',
                    phone: invoice.patient?.phone || 'N/A'
                },
                doctor: {
                    name: invoice.doctor_name,
                    specialization: invoice.doctor?.specialization || 'N/A',
                    phone: invoice.doctor?.phone || 'N/A'
                },
                
                // Invoice Details
                date: new Date(invoice.invoice_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                }),
                invoiceNumber: invoice.invoice_number,
                
                // Line Items - map to match PDF expectations
                services: (invoice.line_items || []).map(item => ({
                    service: item.name || item.service || 'Unnamed Service',
                    charges: toNumber(item.rate || item.charges),
                    discount: toNumber(item.discount_percent || item.discount || 0)
                })),
                
                // Financials
                grossTotal: toNumber(invoice.gross_total),
                totalDiscount: toNumber(invoice.total_discount),
                finalPayable: toNumber(invoice.final_payable),
                totalPaid: toNumber(invoice.total_paid),
                balanceDue: toNumber(invoice.balance_due),
                
                notes: invoice.notes || ''
            }
            
            // Call the shared utility function to generate and download the PDF
            await createInvoicePDF(invoiceData)
            
            toast.success(`Invoice ${invoice.invoice_number} downloaded successfully`, { 
                id: 'pdf-gen',
                position: 'top-right',
                duration: 3000 
            })

        } catch (error) {
            console.error('PDF download failed:', error)
            toast.error('Failed to generate PDF: ' + error.message, { 
                id: 'pdf-gen',
                position: 'top-right',
                duration: 4000 
            })
        }
    }
    
    const handleDeleteInvoice = (invoice) => {
        setInvoiceToDelete(invoice)
        setShowDeleteConfirm(true)
    }

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return
        
        const deleteToast = toast.loading('Deleting invoice...', { position: 'top-right' })
        
        try {
            const { error } = await supabase
                .from(INVOICES_TABLE)
                .delete()
                .eq('id', invoiceToDelete.id)
            
            if (error) throw error

            toast.success('Invoice deleted successfully', { 
                id: deleteToast,
                position: 'top-right',
                duration: 3000 
            })
            
            setShowDeleteConfirm(false)
            setInvoiceToDelete(null)
            
            // Refetch data after deletion
            fetchInvoices()
        } catch (error) {
            console.error('Error deleting invoice:', error.message)
            toast.error('Failed to delete invoice: ' + error.message, { 
                id: deleteToast,
                position: 'top-right',
                duration: 4000 
            })
        }
    }

    // --- Effects and Memoization ---

    useEffect(() => {
        fetchInvoices()
    }, [filterPeriod, currentPage])

    const totalPages = useMemo(() => Math.ceil(totalCount / ITEMS_PER_PAGE), [totalCount])
    
    const statusClasses = {
        paid: 'bg-green-100 text-green-800',
        partially_paid: 'bg-yellow-100 text-yellow-800',
        unpaid: 'bg-red-100 text-red-800',
    }

    const periodOptions = [
        { value: 'day', label: 'Today', icon: '📅' },
        { value: 'week', label: 'This Week', icon: '📆' },
        { value: 'month', label: 'This Month', icon: '🗓️' },
        { value: 'year', label: 'This Year', icon: '📊' },
        { value: 'all', label: 'All Time', icon: '♾️' },
    ]

    // --- Render ---

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            {/* Toast Container */}
            <Toaster />
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-2">
                        <FileText className="w-8 h-8 text-purple-600" />
                        Invoice Management
                    </h1>
                    <p className="text-gray-600 text-sm">
                        Total Invoices: <span className="font-semibold text-purple-600">{totalCount}</span>
                    </p>
                </div>
                <button 
                    onClick={() => router.push('/invoices/create')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                    <Plus size={20} /> Create New Invoice
                </button>
            </div>

            {/* Filters - IMPROVED STYLING */}
            <div className="bg-white rounded-xl shadow-md p-5 mb-6 border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Filter className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-700">Filter Period:</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        {periodOptions.map(option => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    setFilterPeriod(option.value)
                                    setCurrentPage(1)
                                }}
                                disabled={loading}
                                className={`
                                    px-4 py-2 rounded-lg font-medium text-sm transition-all
                                    ${filterPeriod === option.value
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }
                                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                                `}
                            >
                                <span className="mr-1">{option.icon}</span>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-purple-600 to-blue-600">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Invoice No.</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Patient</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Net Payable (Rs.)</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">Balance Due (Rs.)</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-12 text-gray-500">
                                        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-600" />
                                        <p className="font-medium">Loading Invoices...</p>
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-12 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p className="font-medium">No invoices found for the selected period</p>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-purple-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                                            {invoice.invoice_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                            {invoice.patient_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {new Date(invoice.invoice_date).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric' 
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                            {toNumber(invoice.final_payable).toFixed(2)}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${
                                            invoice.balance_due > 0 ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                            {Math.abs(toNumber(invoice.balance_due)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                statusClasses[invoice.status] || 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {invoice.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewEdit(invoice, 'View')}
                                                    className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-100 transition-colors"
                                                    title="View Invoice Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewEdit(invoice, 'Edit')}
                                                    className="text-purple-600 hover:text-purple-900 p-2 rounded-full hover:bg-purple-100 transition-colors"
                                                    title="Edit Invoice"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(invoice)}
                                                    className="text-green-600 hover:text-green-900 p-2 rounded-full hover:bg-green-100 transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteInvoice(invoice)}
                                                    className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-100 transition-colors"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-white p-5 rounded-xl shadow-md border border-gray-200">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                        className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        ← Previous
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                        Page <span className="font-bold text-purple-600">{currentPage}</span> of <span className="font-bold text-purple-600">{totalPages}</span>
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || loading}
                        className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* View Invoice Details Modal */}
            <InvoiceDetailModal
                isOpen={showDetailModal}
                onClose={() => {
                    setShowDetailModal(false)
                    setSelectedInvoice(null)
                }}
                invoice={selectedInvoice}
                onDownloadPDF={handleDownloadPDF}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && invoiceToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                        <div className="p-6 text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Are you sure you want to permanently delete invoice{' '}
                                <span className="font-semibold text-gray-900">{invoiceToDelete.invoice_number}</span>?
                            </p>
                            <p className="text-xs text-red-600 font-medium">
                                ⚠️ This action cannot be undone
                            </p>
                        </div>
                        
                        <div className="flex gap-3 p-5 bg-gray-50 border-t border-gray-200">
                            <button
                                onClick={() => { 
                                    setShowDeleteConfirm(false)
                                    setInvoiceToDelete(null)
                                }}
                                className="flex-1 px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700 transition-all"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={loading}
                                className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                <div className='flex items-center justify-center gap-2'>
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className='animate-spin' />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18} />
                                            Delete
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}