// app/invoices/page.js
'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Trash2, FileText, User, Calendar, Stethoscope, DollarSign, X, AlertTriangle, CheckSquare, Square, Search } from 'lucide-react' // Added Search icon
import { supabase } from '@/lib/supabase' 
import { createInvoicePDF } from "@/lib/createInvoicePDF";

// =========================================================================
// 1. CONFIGURATION & TABLES
// =========================================================================

const PATIENTS_TABLE = 'patients';
const DOCTORS_TABLE = 'doctors';
const INVOICES_TABLE = 'invoices'; 
const CLINIC_SERVICES_TABLE = 'clinic_services'; 
const APPOINTMENTS_TABLE = 'appointments';
const TREATMENT_PLANS_TABLE = 'treatment_plans';
const PLAN_PROCEDURES_TABLE = 'plan_procedures';

// =========================================================================
// 2. HELPER FUNCTIONS
// =========================================================================

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// =========================================================================
// NEW: 2.1 TOAST NOTIFICATION COMPONENT
// =========================================================================
const Toast = ({ message, type, onClose }) => {
    if (!message) return null;

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const Icon = type === 'success' ? CheckSquare : AlertTriangle;

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-hide after 5 seconds
        return () => clearTimeout(timer);
    }, [message, onClose]);

    return (
        <div className="fixed top-5 right-5 z-[100] p-4">
            <div className={`flex items-center ${bgColor} text-white text-sm font-bold px-4 py-3 rounded-lg shadow-xl`} role="alert">
                <Icon className="w-5 h-5 mr-3" />
                <p>{message}</p>
                <button onClick={onClose} className="ml-auto text-white opacity-75 hover:opacity-100 transition-opacity">
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};


// =========================================================================
// 3. PATIENT FEES SELECTION MODAL
// =========================================================================

const PatientFeesModal = ({ isOpen, onClose, patientFees, onSelectFees }) => {
// ... (Modal code remains unchanged)
    const [selectedFees, setSelectedFees] = useState([])

    useEffect(() => {
        if (isOpen) {
            // Auto-select all fees by default
            setSelectedFees(patientFees.map(fee => fee.source_id))
        }
    }, [isOpen, patientFees])

    const toggleFeeSelection = (feeId) => {
        setSelectedFees(prev => 
            prev.includes(feeId) 
                ? prev.filter(id => id !== feeId)
                : [...prev, feeId]
        )
    }

    const handleAddSelected = () => {
        const feesToAdd = patientFees.filter(fee => selectedFees.includes(fee.source_id))
        onSelectFees(feesToAdd)
        onClose() // Close the modal after selection
    }

    const totalSelected = patientFees
        .filter(fee => selectedFees.includes(fee.source_id))
        .reduce((sum, fee) => sum + toNumber(fee.amount), 0)

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-purple-600" />
                        Outstanding Fees & Services
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto mb-4">
                    {patientFees.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                            <p className="text-lg">No outstanding fees found for this patient.</p>
                            <p className="text-sm mt-2">You can add custom services manually.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="bg-purple-50 p-3 rounded-lg mb-4">
                                <p className="text-sm text-purple-700 font-medium">
                                    Select the fees you want to include in this invoice. All items are selected by default.
                                </p>
                            </div>

                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Select</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Service/Type</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Doctor</th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount (Rs.)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {patientFees.map((fee) => (
                                        <tr 
                                            key={fee.source_id}
                                            className={`hover:bg-purple-50 cursor-pointer transition-colors ${
                                                selectedFees.includes(fee.source_id) ? 'bg-purple-50' : ''
                                            }`}
                                            onClick={() => toggleFeeSelection(fee.source_id)}
                                        >
                                            <td className="px-3 py-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleFeeSelection(fee.source_id)
                                                    }}
                                                    className="text-purple-600 hover:text-purple-800"
                                                >
                                                    {selectedFees.includes(fee.source_id) ? (
                                                        <CheckSquare size={20} />
                                                    ) : (
                                                        <Square size={20} />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    fee.source_type === 'Appointment' ? 'bg-blue-100 text-blue-800' :
                                                    fee.source_type === 'Treatment Plan' ? 'bg-green-100 text-green-800' :
                                                    'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {fee.source_type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-800">{fee.service_name}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600">
                                                {fee.service_date ? new Date(fee.service_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-600">{fee.doctor_name || 'N/A'}</td>
                                            <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                                                {toNumber(fee.amount).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="border-t pt-4 flex justify-between items-center flex-shrink-0">
                    <div className="text-lg font-semibold text-gray-800">
                        Total Selected: <span className="text-purple-600">Rs. {totalSelected.toFixed(2)}</span>
                        <span className="text-sm text-gray-500 ml-2">({selectedFees.length} items)</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSelected}
                            disabled={selectedFees.length === 0}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add {selectedFees.length} Item(s) to Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// 4. SERVICE REMINDER MODAL
// =========================================================================

const ServiceReminderModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
// ... (Modal code remains unchanged)
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl transform scale-100 transition-transform duration-300">
                <div className="flex items-center space-x-4 border-b pb-3 mb-4">
                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Missing Charges</h2>
                </div>
                
                <p className="text-gray-700 mb-6">
                    You have not added any **Services & Charges** with a non-zero amount. 
                    The invoice will have a Net Payable of zero.
                </p>
                <p className="text-sm text-red-600 font-medium">
                    Please add a service or click 'Continue Anyway' if this is a zero-charge invoice.
                </p>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={() => onClose(false)}
                        className="w-full px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                    >
                        Go Back to Add Services
                    </button>
                    <button
                        onClick={() => onClose(true)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
                    >
                        Continue Anyway
                    </button>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// 5. INVOICE PREVIEW MODAL COMPONENT
// =========================================================================
const InvoicePreviewModal = ({ invoiceData, onClose, onSave }) => {
// ... (Modal code remains unchanged)
    const handlePrint = () => {
        const printContent = document.getElementById('printable-invoice');
        if (printContent) {
            const originalContents = document.body.innerHTML;
            document.body.innerHTML = printContent.outerHTML;
            window.print();
            document.body.innerHTML = originalContents;
            // A smoother way than reload might be to restore the state,
            // but for simplicity and reliability with print, reload is kept.
            // window.location.reload(); 
            onClose(); // Just close the modal after printing instead of full reload
        } else {
            window.print();
        }
    };

    const {
        patient,
        doctor,
        date,
        services,
        payments,
        grossTotal,
        totalDiscount,
        finalPayable,
        totalPaid,
        balanceDue,
        notes,
        invoiceNumber
    } = invoiceData;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl w-full max-w-4xl shadow-2xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center border-b pb-3 mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-pink-600" />
                        Invoice Preview: {invoiceNumber}
                    </h2>
                    <button
                        onClick={() => createInvoicePDF(invoiceData)}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all"
                    >
                        Download Invoice
                    </button>
                </div>

                <div id="printable-invoice" className="flex-grow overflow-y-auto p-4 border rounded-lg bg-gray-50 print:p-0 print:border-none print:bg-white">
                    <div className="text-center mb-6 print:mb-4">
                        <h1 className="text-2xl font-extrabold text-purple-800">InstaCare Clinic</h1>
                        <p className="text-sm text-gray-600">123 Health Ave, City Center | Phone: (123) 456-7890</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 border-b pb-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-600">INVOICE TO:</p>
                            <p className="text-lg font-bold text-gray-900">{patient.name}</p>
                            <p className="text-sm text-gray-600">MR #: {patient.mr_number}</p>
                            <p className="text-sm text-gray-600">Phone: {patient.phone}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-gray-600">INVOICE NO:</p>
                            <p className="text-lg font-bold text-pink-600">{invoiceNumber}</p>
                            <p className="text-sm text-gray-600">Date: {date}</p>
                            <p className="text-sm text-gray-600">Doctor: {doctor}</p>
                        </div>
                    </div>

                    <h3 className="text-xl font-semibold mb-3 text-purple-700">Service Breakdown</h3>
                    <table className="min-w-full divide-y divide-gray-300 mb-6">
                        <thead>
                            <tr className="bg-purple-100">
                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">Service</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-700">Charges (Rs.)</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-700">Discount (Rs.)</th>
                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-700">Net Amount (Rs.)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {services.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-2 text-sm text-gray-800">
                                        {item.service}
                                        {item.source_type && (
                                            <span className="ml-2 text-xs text-gray-500">({item.source_type})</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-800">{toNumber(item.charges).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right text-sm text-red-600">({toNumber(item.discount).toFixed(2)})</td>
                                    <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">{item.subTotal.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 text-purple-700">Payments Made</h3>
                            <ul className="space-y-1 text-sm">
                                {payments.map((p, index) => (
                                    <li key={index} className="flex justify-between border-b border-dashed pb-1">
                                        <span className="text-gray-600">{p.mode} on {p.date}</span>
                                        <span className="font-medium text-gray-800">Rs. {toNumber(p.amount).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-4 text-sm text-gray-600 italic">
                                **Notes:** {notes || 'N/A'}
                            </p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-xl space-y-2 border border-purple-200">
                            <div className="flex justify-between text-base font-medium">
                                <span>Total Charges:</span>
                                <span>Rs. {grossTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base text-red-600">
                                <span>Total Discount:</span>
                                <span>- Rs. {totalDiscount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-purple-700 border-t pt-2">
                                <span>NET PAYABLE:</span>
                                <span>Rs. {finalPayable.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold text-green-600">
                                <span>Amount Paid:</span>
                                <span>Rs. {totalPaid.toFixed(2)}</span>
                            </div>
                            <div className={`flex justify-between text-2xl font-extrabold border-t border-purple-400 pt-3 ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                <span>BALANCE DUE:</span>
                                <span>Rs. {Math.abs(balanceDue).toFixed(2)} {balanceDue < 0 ? '(Credit)' : ''}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                    >
                        <X size={20} className="inline mr-2" />
                        Cancel / Close Preview
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all text-lg font-semibold shadow-md print:hidden"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-printer"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                        Print Invoice
                    </button>
                    <button
                        onClick={() => onSave(invoiceData)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all text-lg font-semibold shadow-md"
                    >
                        <FileText size={20} />
                        Confirm & Save Invoice
                    </button>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// 6. MAIN COMPONENT: Invoice Creation
// =========================================================================

export default function InvoiceCreationPage() {
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
    
    const [attendingDoctorId, setAttendingDoctorId] = useState(null)
    const [doctors, setDoctors] = useState([])
    const [patients, setPatients] = useState([]) // NEW: All patients list
    const [servicesList, setServicesList] = useState([]) 

    // NEW STATE FOR SEARCHABLE DROPDOWN
    const [searchQuery, setSearchQuery] = useState('')
    const [showPatientDropdown, setShowPatientDropdown] = useState(false)

    const [selectedPatientId, setSelectedPatientId] = useState(null) 
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [loading, setLoading] = useState(true)

    // Outstanding fees for selected patient
    const [patientFees, setPatientFees] = useState([])
    const [showFeesModal, setShowFeesModal] = useState(false)
    const [loadingFees, setLoadingFees] = useState(false)

    const [services, setServices] = useState([
        { id: Date.now(), service: '', charges: 0, discount: 0 },
    ])

    const [payments, setPayments] = useState([
        { id: Date.now() + 1, date: invoiceDate, amount: 0, mode: 'Cash' },
    ])

    const [settlementDiscount, setSettlementDiscount] = useState(0) 
    const [notes, setNotes] = useState('')
    
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [invoiceToPreview, setInvoiceToPreview] = useState(null)
    const [showServiceReminderModal, setShowServiceReminderModal] = useState(false) 
    
    // NEW STATE FOR TOAST
    const [toastMessage, setToastMessage] = useState(null)
    const [toastType, setToastType] = useState('success') // 'success' or 'error'


    // =========================================================================
    // COMPUTED VALUES
    // =========================================================================
    
    const attendingDoctor = useMemo(() => {
        return doctors.find(d => d.doctor_id === attendingDoctorId) || null
    }, [doctors, attendingDoctorId])

    const calculateTotals = () => {
        let grossTotal = 0;
        let serviceDiscount = 0;
        let totalPaid = 0;
        
        services.forEach(s => {
            const charges = toNumber(s.charges);
            const discount = toNumber(s.discount);
            grossTotal += charges;
            serviceDiscount += discount;
            
            // Add subTotal property for preview modal calculation
            s.subTotal = charges - discount;
        });

        payments.forEach(p => {
            totalPaid += toNumber(p.amount);
        });

        const totalDiscount = serviceDiscount + toNumber(settlementDiscount);
        const subTotal = grossTotal - serviceDiscount;
        const finalPayable = subTotal - toNumber(settlementDiscount);
        const balanceDue = finalPayable - totalPaid;

        return { grossTotal, totalDiscount, subTotal, finalPayable, totalPaid, balanceDue };
    };

    const { grossTotal, totalDiscount, subTotal, finalPayable, totalPaid, balanceDue } = useMemo(
        calculateTotals,
        [services, payments, settlementDiscount]
    );

    // Filter patients based on search query
    const filteredPatients = useMemo(() => {
        if (!searchQuery) {
            return patients;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return patients.filter(p => 
            p.name.toLowerCase().includes(lowerCaseQuery) ||
            p.mr_number.toLowerCase().includes(lowerCaseQuery) ||
            p.phone.includes(lowerCaseQuery)
        );
    }, [patients, searchQuery]);

 // =========================================================================
 // FETCH PATIENT OUTSTANDING FEES (FINAL FIX)
 // =========================================================================
     const fetchPatientFees = async (patientId) => {
         setLoadingFees(true)
         try {
             // Fetch Appointments
             const { data: appointments, error: aptError } = await supabase
                 .from(APPOINTMENTS_TABLE)
                 .select(`
                     appointment_id,
                     appointment_type,
                     appointment_date,
                     fee,
                     status,
                     doctor:doctor_id(doctor_id, name)
                 `)
                 .eq('patient_id', patientId)
                 .gt('fee', 0)
                 .neq('status', 'Cancelled')
                 .is('deleted_at', null)
 
             // Fetch Treatment Plans
             const { data: treatmentPlans, error: tpError } = await supabase
                 .from(TREATMENT_PLANS_TABLE)
                 .select(`
                     plan_id,
                     title,
                     consultation_date,
                     estimated_cost,
                     amount_paid,
                     status,
                     
                     doctor:doctor_id(doctor_id, name) 
                 `)
                 .eq('patient_id', patientId)
                 .eq('status', 'Active')
 
             // Fetch Procedures
             const { data: procedures, error: procError } = await supabase
                 .from(PLAN_PROCEDURES_TABLE)
                 .select(`
                     item_id,
                     name,
                     scheduled_date,
                     cost,
                     status,
                     plan_id,
                     treatment_plans!inner (
                         patient_id,
                         doctor:doctor_id(doctor_id, name)
                     )
                 `)
                 .eq('treatment_plans.patient_id', patientId)
                 .gt('cost', 0)
                 .neq('status', 'Complete')
 
             if (aptError) throw aptError
             if (tpError) throw tpError
             if (procError) throw procError
 
             // Format all fees
             const allFees = []
 
             // Add appointments
             if (appointments) {
                 appointments.forEach(apt => {
                     allFees.push({
                         source_id: apt.appointment_id,
                         source_type: 'Appointment',
                         service_name: apt.appointment_type,
                         amount: apt.fee,
                         service_date: apt.appointment_date,
                         // MAPPING FIX: Reads from the new 'doctor' property
                         doctor_name: apt.doctor?.name || 'N/A',
                         doctor_id: apt.doctor?.doctor_id
                     })
                 })
             }
 
             // Add treatment plans (only unpaid portion)
             if (treatmentPlans) {
                 treatmentPlans.forEach(tp => {
                     const unpaidAmount = toNumber(tp.estimated_cost) - toNumber(tp.amount_paid)
                     if (unpaidAmount > 0) {
                         allFees.push({
                             source_id: tp.plan_id,
                             source_type: 'Treatment Plan',
                             service_name: tp.title,
                             amount: unpaidAmount,
                             service_date: tp.consultation_date,
                             // MAPPING FIX: Reads from the new 'doctor' property
                             doctor_name: tp.doctor?.name || 'N/A',
                             doctor_id: tp.doctor?.doctor_id
                         })
                     }
                 })
             }
 
             // Add procedures
             if (procedures) {
                 procedures.forEach(proc => {
                     allFees.push({
                         source_id: proc.item_id,
                         source_type: 'Procedure',
                         service_name: proc.name,
                         amount: proc.cost,
                         service_date: proc.scheduled_date,
                         // MAPPING FIX: Reads from the new 'treatment_plans.doctor' property
                         doctor_name: proc.treatment_plans?.doctor?.name || 'N/A',
                         doctor_id: proc.treatment_plans?.doctor?.doctor_id
                     })
                 })
             }
 
             setPatientFees(allFees)
             
             // Auto-show fees modal if fees exist and no services have been added yet
             const hasRealServices = services.some(s => s.service !== '' || s.charges > 0);
             if (allFees.length > 0 && !hasRealServices) {
                 setShowFeesModal(true)
             } else if (allFees.length === 0) {
                 // Using a more subtle method than alert, but keeping the original logic's intent.
                 // This is better done with a toast or an in-page message.
                 // alert('No outstanding fees found for this patient. You can add custom services manually.')
             }
 
         } catch (error) {
             console.error('Error fetching patient fees:', error.message)
             setToastMessage('Failed to fetch patient fees: ' + error.message)
             setToastType('error')
         } finally {
             setLoadingFees(false)
         }
     }

    // =========================================================================
    // REAL-TIME DATA FETCHING (Unchanged - for brevity)
    // =========================================================================

    // Patients real-time subscription
    useEffect(() => {
        let isMounted = true;

        const fetchInitialPatients = async () => {
            const { data, error } = await supabase
                .from(PATIENTS_TABLE)
                .select('id, mr_number, name, phone')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching initial patients:', error.message);
            } else if (isMounted) {
                setPatients(data || []);
                // If a patient was already selected, update the selectedPatient object
                if (selectedPatientId) {
                    const patient = (data || []).find(p => p.id === selectedPatientId);
                    setSelectedPatient(patient || null);
                }
            }
        };

        const subscribeToPatients = () => {
            return supabase
                .channel('patients_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: PATIENTS_TABLE }, (payload) => {
                    if (!isMounted) return;
                    const newPatient = payload.new || payload.old;

                    setPatients(prev => {
                        const updatedList = prev.filter(p => p.id !== newPatient.id);
                        if (payload.eventType !== 'DELETE') {
                            updatedList.push(newPatient);
                        }
                        return updatedList.sort((a, b) => a.name.localeCompare(b.name));
                    });
                })
                .subscribe();
        };

        fetchInitialPatients();
        const channel = subscribeToPatients();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [selectedPatientId]); // Added selectedPatientId dependency

    // Doctors real-time subscription
    useEffect(() => {
        let isMounted = true;

        const fetchInitialDoctors = async () => {
            const { data, error } = await supabase
                .from(DOCTORS_TABLE)
                .select('doctor_id, name, specialization, consultation_fee') 
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching initial doctors:', error.message);
            } else if (isMounted) {
                setDoctors(data || []);
                if (data.length > 0 && !attendingDoctorId) {
                    setAttendingDoctorId(data[0].doctor_id); 
                }
            }
        };

        const subscribeToDoctors = () => {
            return supabase
                .channel('doctors_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: DOCTORS_TABLE }, (payload) => {
                    if (!isMounted) return;
                    const newDoctor = payload.new || payload.old;

                    setDoctors(prev => {
                        const updatedList = prev.filter(d => d.doctor_id !== newDoctor.doctor_id);
                        if (payload.eventType !== 'DELETE') {
                            updatedList.push(newDoctor);
                        }
                        return updatedList.sort((a, b) => a.name.localeCompare(b.name));
                    });
                })
                .subscribe();
        };

        fetchInitialDoctors();
        const channel = subscribeToDoctors();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [attendingDoctorId]); 

    // Services real-time subscription
    useEffect(() => {
        let isMounted = true;
        
        const fetchInitialServices = async () => {
            const { data, error } = await supabase
                .from(CLINIC_SERVICES_TABLE)
                .select('service_id, name, price') 
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching services:', error.message);
            } else if (isMounted) {
                setServicesList(data || []);
            }
            setLoading(false);
        };

        const subscribeToServices = () => {
            return supabase
                .channel('services_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: CLINIC_SERVICES_TABLE }, (payload) => {
                    if (!isMounted) return;
                    const newService = payload.new || payload.old;

                    setServicesList(prev => {
                        const updatedList = prev.filter(s => s.service_id !== newService.service_id);
                        if (payload.eventType !== 'DELETE') {
                            updatedList.push(newService);
                        }
                        return updatedList.sort((a, b) => a.name.localeCompare(b.name));
                    });
                })
                .subscribe();
        };

        fetchInitialServices();
        const channel = subscribeToServices();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    // =========================================================================
    // HANDLERS
    // =========================================================================
    
    const saveInvoiceToDB = async (invoiceData) => {
        setLoading(true);
        try {
            const { error: invoiceError } = await supabase
                .from(INVOICES_TABLE)
                .insert({
                    invoice_number: invoiceData.invoiceNumber,
                    invoice_date: invoiceData.date,
                    patient_id: invoiceData.patient.id, 
                    patient_name: invoiceData.patient.name,
                    patient_mr_number: invoiceData.patient.mr_number,
                    doctor_id: invoiceData.doctorId, 
                    gross_total: invoiceData.grossTotal,
                    total_discount: invoiceData.totalDiscount,
                    final_payable: invoiceData.finalPayable,
                    total_paid: invoiceData.totalPaid,
                    balance_due: invoiceData.balanceDue,
                    notes: invoiceData.notes,
                    line_items: invoiceData.services,
                    payments_record: invoiceData.payments,
                    status: invoiceData.balanceDue <= 0 ? 'paid' : invoiceData.totalPaid > 0 ? 'partially_paid' : 'unpaid'
                });

            if (invoiceError) {
                throw invoiceError;
            }

            // --- REPLACED ALERT WITH TOAST ---
            setToastMessage(`Invoice ${invoiceData.invoiceNumber} successfully created and saved!`);
            setToastType('success');
            // ---------------------------------
            
            // Reset the form
            setSelectedPatient(null);
            setSelectedPatientId(null); // Reset the ID as well
            setSearchQuery(''); // Reset search query
            setServices([{ id: Date.now(), service: '', charges: 0, discount: 0 }]);
            setPayments([{ id: Date.now() + 1, date: invoiceDate, amount: 0, mode: 'Cash' }]);
            setSettlementDiscount(0);
            setNotes('');
            setShowPreviewModal(false);
            setInvoiceToPreview(null);
            setPatientFees([]);
            
        } catch (error) {
            console.error('Error saving invoice:', error.message);
            // --- REPLACED ALERT WITH TOAST ---
            setToastMessage(`Failed to save invoice: ${error.message}`);
            setToastType('error');
            // ---------------------------------
        } finally {
            setLoading(false);
        }
    };
    
    const handleServiceChange = (id, field, value) => {
        setServices(prev => 
            prev.map(s => {
                if (s.id === id) {
                    if (field === 'service') {
                        const selectedService = servicesList.find(mock => mock.name === value);
                        const newCharges = selectedService ? selectedService.price : s.charges; 
                        return { ...s, [field]: value, charges: newCharges };
                    }
                    return { ...s, [field]: value }
                }
                return s
            })
        )
    }

    const addService = () => {
        setServices(prev => [...prev, { id: Date.now(), service: '', charges: 0, discount: 0 }])
    }

    const removeService = (id) => {
        setServices(prev => prev.filter(s => s.id !== id));
    }

    const handlePaymentChange = (id, field, value) => {
        setPayments(prev => 
            prev.map(p => p.id === id ? { ...p, [field]: value } : p)
        )
    }

    const addPayment = () => {
        setPayments(prev => [...prev, { id: Date.now() + Math.random(), date: invoiceDate, amount: 0, mode: 'Cash' }]);
    }

    const removePayment = (id) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    }

    // NEW: Handle patient selection from the list
    const handleSelectPatient = async (patient) => {
        setSelectedPatientId(patient.id);
        setSelectedPatient(patient);
        setSearchQuery(`${patient.name} - MR# ${patient.mr_number}`);
        setShowPatientDropdown(false); // Close the dropdown after selection
        
        // Fetch outstanding fees for this patient
        await fetchPatientFees(patient.id);
    };

    // The original handlePatientChange is now integrated into handleSelectPatient and the combobox
    const handlePatientChange = async (patientId) => {
        setSelectedPatientId(patientId);
        
        if (patientId) {
            const patient = patients.find(p => p.id === patientId);
            if (patient) {
                // Keep the patient object updated with latest list data
                setSelectedPatient(patient);
                // Update the search box content to the patient's name
                setSearchQuery(`${patient.name} - MR# ${patient.mr_number}`);
                await fetchPatientFees(patient.id);
            }
        } else {
            setSelectedPatient(null);
            setPatientFees([]);
            setSearchQuery('');
        }
    };


    // Handle selected fees from modal
    const handleSelectFees = (selectedFees) => {
        const newServices = selectedFees.map(fee => ({
            id: Date.now() + Math.random(),
            service: fee.service_name,
            charges: toNumber(fee.amount),
            discount: 0,
            source_type: fee.source_type,
            source_id: fee.source_id
        }));

        // Replace existing services or append
        setServices(prev => {
            // Remove the default empty service if it exists (only if charges is 0)
            const filtered = prev.filter(s => s.service !== '' && toNumber(s.charges) > 0);
            return [...filtered, ...newServices];
        });

        setShowFeesModal(false);
    };

    const proceedToPreview = () => {
        const invoiceData = {
            patient: selectedPatient,
            doctor: attendingDoctor?.name || 'N/A', 
            doctorId: attendingDoctor?.doctor_id,
            date: invoiceDate,
            services: services.map(s => ({
                ...s,
                subTotal: toNumber(s.charges) - toNumber(s.discount)
            })),
            payments,
            grossTotal,
            totalDiscount,
            subTotal,
            finalPayable,
            totalPaid,
            balanceDue,
            notes,
            invoiceNumber: `INV-${Date.now().toString().slice(-6)}`, 
        }

        setInvoiceToPreview(invoiceData)
        setShowPreviewModal(true)
    }

    const handleCreateInvoice = () => {
        if (!selectedPatient) {
            // --- REPLACED ALERT WITH TOAST ---
            setToastMessage('Please select a patient before creating the invoice.')
            setToastType('error')
            return
            // ---------------------------------
        }
        if (!attendingDoctor) {
             // --- REPLACED ALERT WITH TOAST ---
            setToastMessage('Please select the attending doctor.')
            setToastType('error')
            return
             // ---------------------------------
        }

        // Check if there are any services with a non-zero net charge (charge - discount > 0)
        const hasValidServices = services.some(s => s.service && (toNumber(s.charges) - toNumber(s.discount)) > 0)
        
        // OR check for non-zero finalPayable
        const hasNonZeroPayable = finalPayable > 0;

        // If no valid services and finalPayable is not zero (meaning discount/payments are 0), show reminder.
        // It's safer to check for a non-zero finalPayable as a good proxy for a *billable* invoice.
        if (finalPayable === 0 && !hasValidServices) {
             setShowServiceReminderModal(true)
             return
        }

        proceedToPreview()
    }
    
    // NEW: Handle document click to close patient dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click is outside the patient selection area (which is now a div for the combobox)
            if (event.target.closest('#patient-combobox') === null) {
                setShowPatientDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    // =========================================================================
    // JSX RENDER
    // =========================================================================

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            
            <Toast 
                message={toastMessage} 
                type={toastType} 
                onClose={() => setToastMessage(null)} 
            />

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <FileText className="w-7 h-7 text-purple-600" />
                    New Patient Invoice
                </h1>
                <button
                    onClick={handleCreateInvoice} 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all text-lg font-semibold shadow-md"
                    disabled={loading || !selectedPatient || !attendingDoctor}
                >
                    <DollarSign size={20} />
                    {loading ? 'Loading Data...' : 'Create Invoice'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* 1. Invoice Header and Patient Info */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold mb-4 text-purple-700 border-b pb-2">Invoice Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                            {/* Patient Selection - CHANGED TO SEARCHABLE COMBOBOX */}
                            <div className="relative" id="patient-combobox">
                                <label htmlFor="patientSearch" className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <User size={14} /> Patient <span className='text-red-500'>*</span>
                                </label>
                                <div className='relative'>
                                    <input
                                        type="text"
                                        id="patientSearch"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowPatientDropdown(true);
                                        }}
                                        onFocus={() => setShowPatientDropdown(true)}
                                        placeholder={loading ? 'Loading Patients...' : 'Search Patient by Name/MR#/Phone'}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-3 text-sm bg-white pr-10"
                                        disabled={loading}
                                    />
                                    <Search size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                
                                {showPatientDropdown && filteredPatients.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {filteredPatients.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectPatient(p)}
                                                className={`p-3 text-sm cursor-pointer hover:bg-purple-50 ${p.id === selectedPatientId ? 'bg-purple-100 font-semibold' : ''}`}
                                            >
                                                <span className="font-medium text-gray-900">{p.name}</span> - 
                                                <span className="text-gray-600"> MR# {p.mr_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Displaying selected patient info and fees button */}
                                {selectedPatient && (
                                    <div className='mt-2 text-sm text-gray-700 border-t pt-2'>
                                        <p>MR#: {selectedPatient.mr_number}</p>
                                        <p>Phone: {selectedPatient.phone}</p>
                                    </div>
                                )}

                                {selectedPatient && patientFees.length > 0 && (
                                    <button
                                        onClick={() => setShowFeesModal(true)}
                                        className="mt-2 text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                        disabled={loadingFees}
                                    >
                                        <DollarSign size={14} />
                                        {loadingFees ? 'Loading Fees...' : `View Outstanding Fees (${patientFees.length})`}
                                    </button>
                                )}
                            </div>

                            {/* Invoice Date */}
                            <div>
                                <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <Calendar size={14} /> Invoice Date
                                </label>
                                <input
                                    type="date"
                                    id="invoiceDate"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-3 text-sm"
                                />
                            </div>

                            {/* Attending Doctor */}
                            <div>
                                <label htmlFor="attendingDoctor" className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                                    <Stethoscope size={14} /> Attending Doctor <span className='text-red-500'>*</span>
                                </label>
                                <select
                                    id="attendingDoctor"
                                    value={attendingDoctorId || ''}
                                    onChange={(e) => setAttendingDoctorId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-3 text-sm bg-white"
                                    disabled={loading}
                                >
                                    <option value="" disabled>
                                        {loading ? 'Loading Doctors...' : 'Select Doctor'}
                                    </option>
                                    {doctors.map(d => (
                                        <option key={d.doctor_id} value={d.doctor_id}>
                                            {d.name} ({d.specialization})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 2. Services/Treatments Section (Unchanged - for brevity) */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h2 className="text-xl font-semibold text-purple-700">Services & Charges <span className='text-red-500'>*</span></h2>
                            {selectedPatient && (
                                <button
                                    onClick={() => setShowFeesModal(true)}
                                    disabled={loadingFees}
                                    className="text-sm bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
                                >
                                    <DollarSign size={16} />
                                    {loadingFees ? 'Loading...' : `Load Patient Fees (${patientFees.length})`}
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Service / Treatment</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Charges (Rs.)</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Discount (Rs.)</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Sub Total (Rs.)</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {services.map((service) => (
                                        <tr key={service.id}>
                                            <td className="py-2">
                                                <input
                                                    type="text"
                                                    value={service.service}
                                                    onChange={(e) => handleServiceChange(service.id, 'service', e.target.value)}
                                                    placeholder={service.source_type ? `${service.source_type} service` : "Enter service name or select below"}
                                                    className="w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-sm p-2"
                                                    disabled={service.source_type}
                                                />
                                                {service.source_type && (
                                                    <span className="text-xs text-purple-600 mt-1 block">
                                                        From: {service.source_type}
                                                    </span>
                                                )}
                                                {!service.source_type && servicesList.length > 0 && (
                                                    <select
                                                        value=""
                                                        onChange={(e) => handleServiceChange(service.id, 'service', e.target.value)}
                                                        className="w-full mt-1 rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-xs p-1 bg-white"
                                                    >
                                                        <option value="">Or select from list...</option>
                                                        {servicesList.map(s => (
                                                            <option key={s.service_id} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                            <td className="py-2">
                                                <input
                                                    type="number"
                                                    value={service.charges}
                                                    onChange={(e) => handleServiceChange(service.id, 'charges', toNumber(e.target.value))}
                                                    className="w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-sm p-2"
                                                />
                                            </td>
                                            <td className="py-2">
                                                <input
                                                    type="number"
                                                    value={service.discount}
                                                    onChange={(e) => handleServiceChange(service.id, 'discount', toNumber(e.target.value))}
                                                    className="w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-sm p-2"
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                                Rs. {(toNumber(service.charges) - toNumber(service.discount)).toFixed(2)}
                                            </td>
                                            <td className="py-2 text-center">
                                                <button
                                                    onClick={() => removeService(service.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                                    disabled={services.length === 1}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            onClick={addService}
                            className="mt-4 flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors text-sm font-medium"
                        >
                            <Plus size={16} />
                            Add Another Service
                        </button>
                    </div>

                    {/* 3. Payments Section (Unchanged - for brevity) */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold mb-4 text-purple-700 border-b pb-2">Record Payments</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Date</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Amount (Rs.)</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-1/4">Mode</th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="py-2">
                                                <input
                                                    type="date"
                                                    value={payment.date}
                                                    onChange={(e) => handlePaymentChange(payment.id, 'date', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-sm p-2"
                                                />
                                            </td>
                                            <td className="py-2">
                                                <input
                                                    type="number"
                                                    value={payment.amount}
                                                    onChange={(e) => handlePaymentChange(payment.id, 'amount', toNumber(e.target.value))}
                                                    className="w-full rounded-md border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-sm p-2"
                                                />
                                            </td>
                                            <td className="py-2">
                                                <select
                                                    value={payment.mode}
                                                    onChange={(e) => handlePaymentChange(payment.id, 'mode', e.target.value)}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm p-2 bg-white"
                                                >
                                                    <option value="Cash">Cash</option>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                    <option value="Card">Card</option>
                                                    <option value="Cheque">Cheque</option>
                                                </select>
                                            </td>
                                            <td className="py-2 text-center">
                                                <button
                                                    onClick={() => removePayment(payment.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                                                    disabled={payments.length === 1}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button
                            onClick={addPayment}
                            className="mt-4 flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors text-sm font-medium"
                        >
                            <Plus size={16} />
                            Add Another Payment
                        </button>
                    </div>

                    {/* 4. Notes Section (Unchanged - for brevity) */}
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                        <h2 className="text-xl font-semibold mb-4 text-purple-700 border-b pb-2">Notes</h2>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                            placeholder="Add private or public notes related to this invoice/transaction..."
                        />
                    </div>

                </div>
                
                {/* 5. Financial Summary Sidebar (Unchanged - for brevity) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-200 sticky top-4 self-start">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4 flex items-center gap-2">
                            <DollarSign size={20} className='text-purple-600' /> Financial Summary
                        </h2>

                        <div className="space-y-3">
                            <div className="flex justify-between text-base text-gray-700">
                                <span>Gross Total:</span>
                                <span>Rs. {grossTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base text-red-600 border-b border-dashed pb-3">
                                <span>Total Discount:</span>
                                <span>- Rs. {totalDiscount.toFixed(2)}</span>
                            </div>
                            
                            <h3 className='font-bold text-lg text-purple-700'>Sub Total: Rs. {subTotal.toFixed(2)}</h3>

                            {/* Settlement Discount */}
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700">Settlement Discount (Total)</label>
                                <input
                                    type="number"
                                    value={settlementDiscount}
                                    onChange={(e) => setSettlementDiscount(toNumber(e.target.value))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-lg p-3"
                                    placeholder="Extra Discount"
                                />
                            </div>

                            <div className="flex justify-between text-xl font-bold text-green-700 border-t pt-4">
                                <span>FINAL PAYABLE:</span>
                                <span>Rs. {finalPayable.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-lg text-blue-600 pt-2">
                                <span className="font-semibold">Total Paid:</span>
                                <span>Rs. {totalPaid.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between text-2xl font-extrabold border-t border-purple-400 pt-4">
                                <span className={balanceDue < 0 ? 'text-green-700' : 'text-red-700'}>BALANCE DUE:</span>
                                <span className={balanceDue < 0 ? 'text-green-700' : 'text-red-700'}>
                                    Rs. {Math.abs(balanceDue).toFixed(2)} {balanceDue < 0 ? '(Credit)' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        
            {/* MODALS */}
            <PatientFeesModal
                isOpen={showFeesModal}
                onClose={() => setShowFeesModal(false)}
                patientFees={patientFees}
                onSelectFees={handleSelectFees}
            />

            <ServiceReminderModal 
                isOpen={showServiceReminderModal}
                onClose={(shouldProceed) => {
                    setShowServiceReminderModal(false);
                    if (shouldProceed) {
                        proceedToPreview(); 
                    }
                }} 
            />

            {showPreviewModal && invoiceToPreview && (
                <InvoicePreviewModal 
                    invoiceData={invoiceToPreview} 
                    onSave={saveInvoiceToDB} 
                    onClose={() => {
                        setShowPreviewModal(false)
                        setInvoiceToPreview(null)
                    }} 
                />
            )}
        </div>
    )
}