'use client'
import { useState, useEffect, useMemo } from 'react'
import { 
  Calendar, Search, FileSpreadsheet, Eye, Columns, 
  X, Trash2, ChevronLeft, ChevronRight, RotateCw, 
  Clock, User, Stethoscope, AlertTriangle
} from 'lucide-react'
import { toast } from 'react-hot-toast'; 
import { supabase } from '@/lib/supabase'
// Import the new modal component
import AddEditAppointmentModal from '../app/appointments/AddEditAppointmentModal'; 

// --- Configuration & Master Field Definitions ---
const APPOINTMENT_TABLE = 'appointments';
const DOCTOR_TABLE = 'doctors';
const PATIENT_TABLE = 'patients';

// Master list of fields for the appointment table
const MASTER_APPOINTMENT_FIELDS = [
    { id: 'appointment_date', label: 'Date', type: 'date', category: 'Time', display: true },
    { id: 'start_time', label: 'Start Time', type: 'time', category: 'Time', display: true },
    { id: 'end_time', label: 'End Time', type: 'time', category: 'Time', display: false },
    { id: 'doctor_name', label: 'Doctor', type: 'text', category: 'Link', display: true },
    { id: 'patient_name', label: 'Patient', type: 'text', category: 'Link', display: true },
    { id: 'patient_phone', label: 'Patient Phone', type: 'tel', category: 'Link', display: false },
    { id: 'status', label: 'Status', type: 'select', category: 'Status', display: true },
    { id: 'appointment_type', label: 'Type', type: 'text', category: 'Status', display: true },
    { id: 'fee', label: 'Fee (PKR)', type: 'number', category: 'Status', display: true },
    { id: 'notes', label: 'Notes', type: 'textarea', category: 'Details', display: false },
];

// --- Supabase API Implementation (CRITICAL: Joins required for data display) ---
const appointmentsAPI = {
    getAll: async () => {
        // Fetch appointments and join with doctors and patients tables
        const { data, error } = await supabase
            .from(APPOINTMENT_TABLE)
            .select(`
                appointment_id, 
                appointment_date, 
                start_time, 
                end_time, 
                status, 
                appointment_type, 
                fee,
                notes,
                doctor:doctors!inner(doctor_id, name, specialization),
                patient:patients!inner(id, name, phone, mr_number)
            `);

        if (error) {
            console.error('Supabase Fetch Error:', error);
            throw error;
        }
        
        // Map the flattened data for easier frontend consumption
        return data.map(app => ({ 
            id: app.appointment_id,
            appointment_date: app.appointment_date,
            start_time: app.start_time,
            end_time: app.end_time,
            status: app.status,
            appointment_type: app.appointment_type,
            fee: app.fee || 0,
            notes: app.notes,
            
            // Flattened linked data
            doctor_id: app.doctor.doctor_id,
            doctor_name: app.doctor.name,
            doctor_specialty: app.doctor.specialization,
            
            patient_id: app.patient.id,
            patient_name: app.patient.name,
            patient_phone: app.patient.phone,
            patient_mr_number: app.patient.mr_number,
        }));
    },
    
    // Deletion function
    delete: async (id) => {
        const { error } = await supabase
            .from(APPOINTMENT_TABLE)
            .delete()
            .eq('appointment_id', id);

        if (error) {
            console.error('Supabase Delete Error:', error);
            throw error;
        }
        return true;
    },
};

// --- Utility Functions ---
const formatTime = (time) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12; 
    return `${hour}:${minutes} ${ampm}`;
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-PK', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// --- Main Component ---
export default function AppointmentListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  
  // Modal States
  const [showAddEditModal, setShowAddEditModal] = useState(false) // NEW
  const [isEditMode, setIsEditMode] = useState(false) // NEW
  const [appointmentToEdit, setAppointmentToEdit] = useState(null) // NEW
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showViewAppointment, setShowViewAppointment] = useState(false)
  
  // Data for Modals
  const [appointmentToDelete, setAppointmentToDelete] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  
  // Table States
  const [showColumnVisibility, setShowColumnVisibility] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Default visible columns based on MASTER_APPOINTMENT_FIELDS
  const [visibleColumns, setVisibleColumns] = useState(
    MASTER_APPOINTMENT_FIELDS.reduce((acc, field) => {
        acc[field.id] = field.display;
        return acc;
    }, {})
  )

  // Load appointments data
  const loadData = async () => {
    try {
      setLoading(true)
      const appointmentsData = await appointmentsAPI.getAll();
      setAppointments(appointmentsData) 
    } catch (error) {
      toast.error('❌ Error loading appointment data. Please check Supabase tables.', { position: 'top-right' });
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, []) 
  
  // Function called after successfully adding or editing an appointment
  const handleSuccess = () => {
    loadData(); // Reload all data to reflect changes
  };

  // --- Modal Handlers (UPDATED) ---

  const handleOpenAddModal = () => {
      setIsEditMode(false);
      setAppointmentToEdit(null);
      setShowAddEditModal(true);
  };

  const handleOpenEditModal = (app) => {
      setIsEditMode(true);
      setAppointmentToEdit(app);
      setShowAddEditModal(true);
  };
  
  const handleCloseAddEditModal = () => {
      setShowAddEditModal(false);
      setAppointmentToEdit(null);
  };

  const openViewModal = (app) => {
    setSelectedAppointment(app)
    setShowViewAppointment(true)
  }

  const deleteAppointment = (app) => {
    setAppointmentToDelete(app)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;

    try {
        await appointmentsAPI.delete(appointmentToDelete.id);
        setAppointments(prev => prev.filter(a => a.id !== appointmentToDelete.id)); 
        toast.success(`✅ Appointment deleted successfully!`, { position: 'top-right' }); 
        setShowDeleteConfirm(false);
        setAppointmentToDelete(null);
    } catch (error) {
        toast.error('❌ Error deleting appointment. Check server logs.', { position: 'top-right' }); 
    }
  }

  // --- Filtering, Pagination, and Cell Rendering (Unchanged) ---
  const filteredAppointments = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    
    return appointments.filter(app => {
      return (
        app.doctor_name?.toLowerCase().includes(searchLower) ||
        app.patient_name?.toLowerCase().includes(searchLower) ||
        app.patient_phone?.includes(searchLower) ||
        app.patient_mr_number?.toLowerCase().includes(searchLower) ||
        app.status?.toLowerCase().includes(searchLower)
      )
    })
  }, [appointments, searchTerm])

  const indexOfLastApp = currentPage * rowsPerPage
  const indexOfFirstApp = indexOfLastApp - rowsPerPage
  const currentAppointments = filteredAppointments.slice(indexOfFirstApp, indexOfLastApp)
  const totalPages = Math.ceil(filteredAppointments.length / rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, rowsPerPage]) 

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))

  const renderCell = (fieldId, value) => {
    if (fieldId === 'appointment_date') {
        return <span className="font-semibold text-gray-900">{formatDate(value)}</span>;
    }
    if (fieldId === 'start_time') {
        return <span className="text-purple-600 font-medium">{formatTime(value)}</span>;
    }
    if (fieldId === 'fee') {
        return `PKR ${value.toLocaleString()}`;
    }
    if (fieldId === 'status') {
        const color = value === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                      value === 'Confirmed' ? 'bg-indigo-100 text-indigo-800' :
                      value === 'Completed' ? 'bg-green-100 text-green-800' :
                      value === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800';
        return <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>{value}</span>;
    }
    return value || <span className="text-gray-400">-</span>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments data...</p>
        </div>
      </div>
    )
  }

  // --- Main Render ---
  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-purple-600" />
              Appointment Scheduling
          </h1>
          <div className="p-3 bg-purple-100 rounded-xl flex items-center gap-3">
              <span className="text-xl font-bold text-purple-700">{appointments.length}</span>
              <span className="text-sm text-purple-600">Total Appointments</span>
          </div>
      </div>
      
      {/* 2. Global Search Bar and Actions (UPDATED) */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                  type="text"
                  placeholder="Search by Doctor, Patient Name, or Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
          </div>
          {/* Add New Appointment Button (NOW ENABLED) */}
          <button 
             onClick={handleOpenAddModal}
             className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
              <Calendar className="w-5 h-5" />
              Book New
          </button>
      </div>
        

      {/* 3. Appointment List Table */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100">
        
        {/* Table Actions & Filters (omitted for brevity, assume similar to original) */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowColumnVisibility(!showColumnVisibility)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all"
              >
                <Columns className="w-4 h-4" />
                Table Columns
              </button>
              {showColumnVisibility && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-10">
                  <div className="space-y-2">
                    {MASTER_APPOINTMENT_FIELDS
                        .map(field => (
                        <label key={field.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <input 
                              type="checkbox" 
                              checked={!!visibleColumns[field.id]}
                              onChange={(e) => setVisibleColumns({...visibleColumns, [field.id]: e.target.checked})}
                              className="rounded w-4 h-4 text-purple-600" 
                            />
                            <span className="text-sm text-gray-700">{field.label}</span>
                        </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Rows per page:</label>
            <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm transition-all focus:ring-purple-500"
            >
                {[10, 20, 50, 100].map(num => (
                    <option key={num} value={num}>{num}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {MASTER_APPOINTMENT_FIELDS
                    .filter(f => visibleColumns[f.id])
                    .map(field => (
                        <th key={field.id} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            {field.label}
                        </th>
                ))}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentAppointments.length === 0 ? (
                <tr>
                  <td colSpan={MASTER_APPOINTMENT_FIELDS.filter(f => visibleColumns[f.id]).length + 1} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">No appointments found</h3>
                      <p className="text-sm text-gray-500">Try booking a new one!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    {MASTER_APPOINTMENT_FIELDS
                        .filter(f => visibleColumns[f.id])
                        .map(field => (
                        <td key={field.id} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                            {renderCell(field.id, app[field.id], app)}
                        </td>
                    ))}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openViewModal(app)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(app)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Appointment"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteAppointment(app)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel/Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (omitted for brevity, unchanged) */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-800">{indexOfFirstApp + 1}</span> to{' '}
                <span className="font-semibold text-gray-800">
                {Math.min(indexOfLastApp, filteredAppointments.length)}
                </span>{' '}
                of <span className="font-semibold text-gray-800">{filteredAppointments.length}</span> entries
            </div>
            
            <div className="flex items-center gap-3">
                <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all 
                    ${currentPage === 1 
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }
                >
                <ChevronLeft className="w-4 h-4" />
                Previous
                </button>
                <span className="text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all 
                    ${currentPage === totalPages 
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`
                }
                >
                Next
                <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* --- 4. Modals --- */}
      
      {/* Add/Edit Modal (NEW INTEGRATION) */}
      <AddEditAppointmentModal
          isOpen={showAddEditModal}
          onClose={handleCloseAddEditModal}
          onSuccess={handleSuccess}
          isEdit={isEditMode}
          initialData={appointmentToEdit}
      />

      {/* View Appointment Modal (Unchanged for brevity) */}
      {showViewAppointment && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            {/* ... Modal content here (Same as previous response) ... */}
        </div>
      )}
      
      {/* Delete Confirmation Modal (Unchanged for brevity) */}
      {showDeleteConfirm && appointmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            {/* ... Modal content here (Same as previous response) ... */}
        </div>
      )}
    </div>
  )
}