// app/patients/list/page.js
'use client'
import { useState, useEffect, useCallback } from 'react'
import { 
  Search, Plus, FileSpreadsheet, FileText, Eye, Columns, 
  X, Edit, Trash2,
  ChevronLeft, ChevronRight, RotateCw, Users, AlertTriangle 
} from 'lucide-react'
import { patientsAPI, formConfigAPI } from '@/lib/supabase' 
import { toast } from 'react-hot-toast'
import { exportPatientsToExcel, exportPatientsToPDF, exportSinglePatientToPDF } from '@/lib/exportUtils'


// --- Data Persistence Utilities (MUST MATCH FormDesigner.js) ---
const STORAGE_KEY = 'patientFormConfig';

const loadLocalFormConfiguration = () => {
  // Return nothing here, only used in client
  return null;
};

// -----------------------------------------------------------------


export default function PatientListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [registrationDate, setRegistrationDate] = useState('')
  const [location, setLocation] = useState('Shafqat')
  const [tags, setTags] = useState('')
  const [showColumnVisibility, setShowColumnVisibility] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [formConfig, setFormConfig] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Custom delete confirmation states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState(null)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [patientsPerPage] = useState(10)
  
  const [newPatient, setNewPatient] = useState({})
  const [visibleColumns, setVisibleColumns] = useState({
    name: true, phone: true, mrNumber: true, registrationDate: true
  })

  // States for edit & view
  const [editingPatientId, setEditingPatientId] = useState(null)
  const [showViewPatient, setShowViewPatient] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)

  const locations = ['Main Branch', 'North Clinic', 'South Clinic']

  // Field definitions for mapping
  const fieldDefinitions = {
    phone: { label: 'Phone', type: 'tel', mandatory: true },
    name: { label: 'Name', type: 'text', mandatory: true },
    cnic: { label: 'CNIC', type: 'text' },
    email: { label: 'Email', type: 'email' },
    gender: { label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
    date_of_birth: { label: 'Date Of Birth', type: 'date' },
    height: { label: 'Height (cm)', type: 'number' },
    weight: { label: 'Weight (kg)', type: 'number' },
    bmi: { label: 'BMI', type: 'number' },
    blood_group: { label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    address: { label: 'Address', type: 'textarea' },
    secondary_phone: { label: 'Secondary Phone', type: 'tel' },
    picture: { label: 'Picture URL', type: 'text' },
    age: { label: 'Age', type: 'number' },
    marital_status: { label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
    religion: { label: 'Religion', type: 'text' },
    profession: { label: 'Profession', type: 'text' },
    nationality: { label: 'Nationality', type: 'text' },
    family_relationship: { label: 'Family Relationship', type: 'text' },
    reference: { label: 'Reference', type: 'text' },
    associated_service: { label: 'Associated Service', type: 'text' },
    referral: { label: 'Referral', type: 'text' },
    coverage: { label: 'Coverage', type: 'text' },
    membership_fee: { label: 'Membership Fee', type: 'number' },
    medical_alert: { label: 'Medical Alert', type: 'textarea' },
    tags: { label: 'Tags', type: 'text' },
    assign_doctor: { label: 'Assign Doctor', type: 'text' },
    manual_mr_no: { label: 'Manual MR No', type: 'text' },
    civil_id: { label: 'Civil ID', type: 'text' }
  }


  // Load data on mount and for refresh
  const loadData = async () => {
    try {
      setLoading(true)
      
      const [patientsData, apiConfigData] = await Promise.all([
        patientsAPI.getAll(),
        formConfigAPI.getConfig()
      ])
      
      const localConfig = loadLocalFormConfiguration();
      const finalConfig = localConfig || apiConfigData || {}; 
      
      setPatients(patientsData)
      setFormConfig(finalConfig)
      
      if (finalConfig) {
        const initialPatient = {}
        
        Object.keys(fieldDefinitions).forEach(key => {
            if (finalConfig[key]) {
                initialPatient[key] = ''
            }
        })
        
        if (!initialPatient.name) initialPatient.name = ''; 
        if (!initialPatient.phone) initialPatient.phone = '';

        setNewPatient(initialPatient)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('❌ Error loading data. Please refresh the page.', { position: 'top-right' });
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])


  // Get enabled fields from form config
  const getEnabledFields = () => {
    if (!formConfig) return ['name', 'phone']
    
    return Object.keys(formConfig)
      .filter(key => 
        formConfig[key] === true && 
        key !== 'id' && 
        key !== 'created_at' && 
        key !== 'updated_at' && 
        key !== 'configuration_name'
      )
  }

  // Handle opening the "Add Patient" modal (Refactored for auto-update)
  const handleOpenAddPatient = useCallback(async () => {
    await loadData(); 
    
    const enabledFields = getEnabledFields()
    const reset = {}
    enabledFields.forEach(f => reset[f] = '')
    setNewPatient(reset)
    
    setShowAddPatient(true); 
    setEditingPatientId(null); 
  }, [formConfig]);


  // Filter patients based on search terms
  const filteredPatients = patients.filter(patient => {
    const combinedSearch = searchTerm.toLowerCase()
    const tableSearchLower = tableSearch.toLowerCase()
    
    const matchesMainSearch = 
      patient.name?.toLowerCase().includes(combinedSearch) ||
      patient.phone?.includes(combinedSearch) ||
      patient.mr_number?.toLowerCase().includes(combinedSearch) ||
      patient.email?.toLowerCase().includes(combinedSearch) ||
      patient.cnic?.includes(combinedSearch)
    
    const matchesTableSearch = 
      patient.name?.toLowerCase().includes(tableSearchLower) ||
      patient.phone?.includes(tableSearchLower) ||
      patient.mr_number?.toLowerCase().includes(tableSearchLower)
    
    return matchesMainSearch && matchesTableSearch
  })

  // Pagination calculations
  const indexOfLastPatient = currentPage * patientsPerPage
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient)
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage)

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Reset to page 1 when search changes
  useEffect(() => {
    const localConfig = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      : null;
  
    const fetchData = async () => {
      try {
        setLoading(true);
        const [patientsData, apiConfigData] = await Promise.all([
          patientsAPI.getAll(),
          formConfigAPI.getConfig()
        ]);
  
        const finalConfig = localConfig || apiConfigData || {};
        setPatients(patientsData);
        setFormConfig(finalConfig);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('❌ Error loading data. Please refresh the page.', { position: 'top-right' });
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);
  

  // Save (Add or Update) Patient
  const handleSavePatient = async () => {
    if (!newPatient.name || !newPatient.phone) {
      toast.error('❌ Name and Phone are required!', { position: 'top-right' });
      return
    }

    try {
      setSaving(true)
      
      const patientData = {
        location: location
      }

      // Collect all enabled fields from newPatient state
      const allFields = Object.keys(newPatient);
      allFields.forEach(field => {
        // Ensure we only include fields that are enabled and not empty
        if (getEnabledFields().includes(field) || fieldDefinitions[field]?.mandatory) {
             patientData[field] = newPatient[field]
        }
      })
      
      // Ensure name and phone are always included if present in newPatient
      if (newPatient.name) patientData.name = newPatient.name;
      if (newPatient.phone) patientData.phone = newPatient.phone;


      if (editingPatientId) {
        const updated = await patientsAPI.update(editingPatientId, patientData)
        const updatedRow = updated?.id ? updated : { id: editingPatientId, ...patientData }
        setPatients(patients.map(p => p.id === editingPatientId ? { ...p, ...updatedRow } : p))
        toast.success('✅ Patient updated successfully!', { position: 'top-right' });
      } else {
        const createdPatient = await patientsAPI.create(patientData)
        setPatients([createdPatient, ...patients])
        toast.success('✅ Patient added successfully!', { position: 'top-right' });
      }
      
      // Reset form
      const resetPatient = {}
      getEnabledFields().forEach(field => {
        resetPatient[field] = ''
      })
      setNewPatient(resetPatient)
      setShowAddPatient(false)
      setEditingPatientId(null)
    } catch (error) {
      console.error('Error saving patient:', error)
      toast.error('❌ Error saving patient. Please try again.', { position: 'top-right' });
    } finally {
      setSaving(false)
    }
  }

  // Export functions - NOW FULLY FUNCTIONAL
  const exportToExcel = () => {
    try {
      exportPatientsToExcel(patients, fieldDefinitions)
      toast.success('✅ Excel file generated successfully!', { position: 'top-right' }); 
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      toast.error('❌ Error exporting to Excel', { position: 'top-right' });
    }
  }

  const exportToPDF = () => {
    try {
      // Export ALL patients, not filtered ones
      exportPatientsToPDF(patients, fieldDefinitions)
      toast.success('✅ PDF generated successfully!', { position: 'top-right' });
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      toast.error('❌ Error exporting to PDF', { position: 'top-right' });
    }
  }

  // NEW: Triggers the custom delete confirmation modal
  const deletePatient = (patient) => {
    setPatientToDelete(patient)
    setShowDeleteConfirm(true)
  }
  
  // NEW: Executes the deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!patientToDelete) return;

    try {
        await patientsAPI.delete(patientToDelete.id);
        setPatients(patients.filter(p => p.id !== patientToDelete.id));
        toast.success(`✅ Patient ${patientToDelete.name} deleted successfully!`, { position: 'top-right' }); 
        setShowDeleteConfirm(false);
        setPatientToDelete(null);
    } catch (error) {
        console.error('Error deleting patient:', error);
        toast.error('❌ Error deleting patient. Please try again.', { position: 'top-right' }); 
    }
  }

  // FIXED: Properly loads patient data for editing
  const openEditModal = async (patient) => {
    try {
      // 1. Reload the latest config
      await loadData();
      
      // 2. Get enabled fields from the current config
      const enabledFields = getEnabledFields();
      
      // 3. Populate the form with existing patient data
      const patientDataForForm = {};
      
      // Include all enabled fields
      enabledFields.forEach(field => {
        const value = patient[field];
        // Convert to string for input fields, handle null/undefined
        patientDataForForm[field] = value === null || value === undefined ? '' : String(value);
      });
      
      // Always include mandatory fields
      patientDataForForm.name = patient.name || '';
      patientDataForForm.phone = patient.phone || '';
      
      // Set the form state with existing data
      setNewPatient(patientDataForForm);
      setEditingPatientId(patient.id);
      setShowAddPatient(true);
    } catch (error) {
      console.error('Error loading patient for edit:', error);
      toast.error('❌ Error loading patient data', { position: 'top-right' });
    }
  }

  const openViewModal = (patient) => {
    setSelectedPatient(patient)
    setShowViewPatient(true)
  }
  
  // Print single patient - uses the export utility
  const printPatient = (patient) => {
    try {
      exportSinglePatientToPDF(patient, fieldDefinitions)
      toast.success(`🖨️ PDF generated for ${patient.name}`, { position: 'top-right' }); 
    } catch (error) {
      console.error('Error generating patient PDF:', error)
      toast.error('❌ Error generating PDF', { position: 'top-right' });
    }
  }


  // Render form field
  const renderFormField = (fieldKey) => {
    const field = fieldDefinitions[fieldKey]
    if (!field) return null
    
    // Uses newPatient state which is now properly populated in openEditModal
    const value = newPatient[fieldKey] || '' 

    if (field.type === 'select') {
      return (
        <div key={fieldKey} className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            {field.label}
            {field.mandatory && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={value}
            onChange={(e) => setNewPatient({...newPatient, [fieldKey]: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
          >
            <option value="">Select {field.label}</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <div key={fieldKey} className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            {field.label}
            {field.mandatory && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            value={value}
            onChange={(e) => setNewPatient({...newPatient, [fieldKey]: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            rows="3"
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        </div>
      )
    }

    return (
      <div key={fieldKey} className="space-y-2">
        <label className="block text-sm font-semibold text-gray-700">
          {field.label}
          {field.mandatory && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={field.type}
          value={value}
          onChange={(e) => setNewPatient({...newPatient, [fieldKey]: e.target.value})}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      </div>
    )
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Page Header */}
      <div className="flex items-center justify-between py-4 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              Patient List
          </h1>
          <div className="p-3 bg-purple-100 rounded-xl flex items-center gap-3">
              <span className="text-xl font-bold text-purple-700">{patients.length}</span>
              <span className="text-sm text-purple-600">Total Patients</span>
          </div>
      </div>
      
        

      {/* Patient List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Table Actions */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Export buttons */}
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
            <button 
  onClick={exportToPDF}
  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all"
>
  <FileText className="w-4 h-4" />
  PDF
</button>
            {/* Columns button */}
            <div className="relative">
              <button 
                onClick={() => setShowColumnVisibility(!showColumnVisibility)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all"
              >
                <Columns className="w-4 h-4" />
                Columns
              </button>
              {showColumnVisibility && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-10">
                  <div className="space-y-2">
                    {Object.keys(visibleColumns).map(col => (
                      <label key={col} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns[col]}
                          onChange={(e) => setVisibleColumns({...visibleColumns, [col]: e.target.checked})}
                          className="rounded w-4 h-4 text-purple-600" 
                        />
                        <span className="text-sm text-gray-700 capitalize">{col.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Quick search..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm w-56 transition-all"
            />
            <button 
              onClick={handleOpenAddPatient} 
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg text-sm font-medium transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Patient
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {visibleColumns.name && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>}
                {visibleColumns.phone && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>}
                {visibleColumns.mrNumber && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MR Number</th>}
                {visibleColumns.registrationDate && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registration Date</th>}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">No patients found</h3>
                      <p className="text-sm text-gray-500">Try adjusting your search or add a new patient</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    {visibleColumns.name && <td className="px-6 py-4 text-sm font-medium text-gray-900">{patient.name}</td>}
                    {visibleColumns.phone && <td className="px-6 py-4 text-sm text-gray-600">{patient.phone}</td>}
                    {visibleColumns.mrNumber && <td className="px-6 py-4 text-sm text-gray-600">{patient.mr_number}</td>}
                    {visibleColumns.registrationDate && <td className="px-6 py-4 text-sm text-gray-600">{patient.registration_date}</td>}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => openViewModal(patient)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEditModal(patient)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deletePatient(patient)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => printPatient(patient)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-800">{indexOfFirstPatient + 1}</span> to{' '}
            <span className="font-semibold text-gray-800">
              {Math.min(indexOfLastPatient, filteredPatients.length)}
            </span>{' '}
            of <span className="font-semibold text-gray-800">{filteredPatients.length}</span> entries
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentPage === index + 1
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Patient Modal */}
      {showAddPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-8 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingPatientId ? 'Edit Patient' : 'Add New Patient'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {editingPatientId ? 'Update patient information' : 'Fill in the patient details below'}
                </p>
              </div>
              <button 
                onClick={() => { setShowAddPatient(false); setEditingPatientId(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {formConfig === null ? (
                    <div className="col-span-full flex items-center justify-center p-8 text-gray-500">
                        <RotateCw className="w-5 h-5 mr-2 animate-spin" />
                        Loading form configuration...
                    </div>
                ) : (
                    getEnabledFields().map(fieldKey => renderFormField(fieldKey))
                )}
              </div>
            </div>

            <div className="flex gap-4 p-8 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { setShowAddPatient(false); setEditingPatientId(null); }}
                disabled={saving}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-semibold text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePatient}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {editingPatientId ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  editingPatientId ? 'Update Patient' : 'Add Patient'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Patient Modal */}
      {showViewPatient && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-teal-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Patient Details: {selectedPatient.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">MR No: <span className="font-semibold">{selectedPatient.mr_number}</span></p>
              </div>
              <button 
                onClick={() => setShowViewPatient(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {selectedPatient.picture && (
                <div className="flex justify-center">
                  <img 
                    src={selectedPatient.picture} 
                    alt="Patient" 
                    className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-white" 
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Object.keys(selectedPatient).map((key) => {
                  const val = selectedPatient[key]
                  if (val === null || val === undefined || key === 'id' || key === 'created_at' || key === 'updated_at' || key === 'configuration_name') return null
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  return (
                    <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                        {label}
                      </span>
                      <span className="font-semibold text-gray-800 text-sm block">
                        {String(val)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && patientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to permanently delete the record for <span className="font-semibold text-gray-700">{patientToDelete.name}</span>? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3 p-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => { setShowDeleteConfirm(false); setPatientToDelete(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 font-medium text-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}