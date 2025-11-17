'use client'
import { useState, useEffect, useMemo } from 'react'
import { 
  X, ChevronLeft, ChevronRight, Calendar, Stethoscope, User, Clock, CheckCircle, RotateCw, Search
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { appointmentsAPI, appointmentDoctorsAPI, patientsAPI } from '@/lib/supabase'

// ============================================================================
// Add/Edit Appointment Modal Component
// ============================================================================
export default function AddEditAppointmentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  isEdit = false, 
  initialData = null 
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [doctorSearch, setDoctorSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  
  const [formData, setFormData] = useState({
    doctor_id: null,
    patient_id: null,
    appointment_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '09:30',
    appointment_type: 'Consultation',
    status: 'Scheduled',
    fee: 0,
    notes: '',
    doctor_name: '',
    patient_name: ''
  })

  const FORM_STEPS = [
    { step: 1, title: 'Select Doctor & Patient', icon: Stethoscope },
    { step: 2, title: 'Schedule & Time Slot', icon: Clock },
    { step: 3, title: 'Details & Confirmation', icon: CheckCircle },
  ]

  useEffect(() => {
    if (isOpen) {
      // Load doctors and patients
      appointmentDoctorsAPI.getAll()
        .then(setDoctors)
        .catch(() => toast.error('Error loading doctors'))
      
      patientsAPI.getAll()
        .then(setPatients)
        .catch(() => toast.error('Error loading patients'))
      
      // Set initial data for edit mode
      if (isEdit && initialData) {
        setFormData({
          ...initialData,
          fee: parseFloat(initialData.fee || 0)
        })
        setDoctorSearch(initialData.doctor_name || '')
        setPatientSearch(initialData.patient_name || '')
      } else {
        // Reset for new appointment
        setFormData({
          doctor_id: null,
          patient_id: null,
          appointment_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '09:30',
          appointment_type: 'Consultation',
          status: 'Scheduled',
          fee: 0,
          notes: '',
          doctor_name: '',
          patient_name: ''
        })
        setDoctorSearch('')
        setPatientSearch('')
      }
      setCurrentStep(1)
    }
  }, [isOpen, initialData, isEdit])

  // Auto-fill doctor's fee when doctor is selected (only in create mode)
  useEffect(() => {
    if (!isEdit && formData.doctor_id) {
      const selectedDoctor = doctors.find(d => d.id === formData.doctor_id)
      if (selectedDoctor) {
        setFormData(prev => ({ ...prev, fee: selectedDoctor.fee }))
      }
    }
  }, [formData.doctor_id, doctors, isEdit])

  const filteredDoctors = useMemo(() => {
    if (!doctorSearch) return doctors
    return doctors.filter(d => 
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialty.toLowerCase().includes(doctorSearch.toLowerCase())
    )
  }, [doctors, doctorSearch])

  const filteredPatients = useMemo(() => {
    if (!patientSearch) return patients
    return patients.filter(p => 
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone?.includes(patientSearch) ||
      p.mr_number?.includes(patientSearch)
    )
  }, [patients, patientSearch])

  const handleDoctorSelect = (doctor) => {
    setFormData(prev => ({
      ...prev,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      fee: isEdit ? prev.fee : doctor.fee
    }))
    setDoctorSearch(doctor.name)
    setShowDoctorDropdown(false)
  }

  const handlePatientSelect = (patient) => {
    setFormData(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: patient.name
    }))
    setPatientSearch(patient.name)
    setShowPatientDropdown(false)
  }

  const canAdvance = useMemo(() => {
    if (currentStep === 1) {
      return formData.doctor_id && formData.patient_id
    }
    if (currentStep === 2) {
      return formData.appointment_date && formData.start_time && formData.end_time && 
             formData.start_time < formData.end_time
    }
    if (currentStep === 3) {
      return formData.appointment_type && formData.status && formData.fee >= 0
    }
    return false
  }, [currentStep, formData])

  const handleNext = () => {
    if (canAdvance) {
      setCurrentStep(prev => Math.min(prev + 1, FORM_STEPS.length))
    } else {
      toast.error('Please complete all required fields for this step.')
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    
    if (!canAdvance) {
      toast.error('Please complete all required fields')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        doctor_id: formData.doctor_id,
        patient_id: formData.patient_id,
        appointment_date: formData.appointment_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        appointment_type: formData.appointment_type,
        status: formData.status,
        fee: parseFloat(formData.fee || 0),
        notes: formData.notes || ''
      }

      if (isEdit) {
        await appointmentsAPI.update(initialData.id, payload)
        toast.success('✅ Appointment updated successfully!')
      } else {
        await appointmentsAPI.create(payload)
        toast.success('✅ Appointment created successfully!')
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving appointment:', error)
      const errorMessage = error.message?.includes('duplicate key') 
        ? 'This time slot is already booked for this doctor.'
        : 'Error saving appointment. Please try again.'
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const formatTime = (time) => {
    if (!time) return '-'
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${minutes.padStart(2, '0')} ${ampm}`
  }

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          {/* Doctor Selection */}
          <div className="border p-4 rounded-lg bg-indigo-50">
            <label className="text-sm font-bold text-indigo-700 block mb-2">1. Select Doctor *</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => {
                  setDoctorSearch(e.target.value)
                  setShowDoctorDropdown(true)
                }}
                onFocus={() => setShowDoctorDropdown(true)}
                placeholder="Search doctors by name or specialty..."
                className="w-full pl-10 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {showDoctorDropdown && filteredDoctors.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredDoctors.map(doctor => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => handleDoctorSelect(doctor)}
                      className={`w-full text-left p-3 hover:bg-indigo-50 transition-colors border-b last:border-b-0 ${
                        formData.doctor_id === doctor.id ? 'bg-indigo-100' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{doctor.name}</div>
                      <div className="text-sm text-gray-600">{doctor.specialty} • PKR {doctor.fee}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.doctor_id && (
              <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-sm text-green-800">
                ✓ Selected: {formData.doctor_name}
              </div>
            )}
          </div>

          {/* Patient Selection */}
          <div className="border p-4 rounded-lg bg-gray-50">
            <label className="text-sm font-bold text-gray-700 block mb-2">2. Select Patient *</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value)
                  setShowPatientDropdown(true)
                }}
                onFocus={() => setShowPatientDropdown(true)}
                placeholder="Search patients by name, phone, or MR number..."
                className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              {showPatientDropdown && filteredPatients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredPatients.map(patient => (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handlePatientSelect(patient)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                        formData.patient_id === patient.id ? 'bg-green-100' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-600">MR: {patient.mr_number} • {patient.phone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.patient_id && (
              <div className="mt-2 p-2 bg-green-50 border border-green-300 rounded text-sm text-green-800">
                ✓ Selected: {formData.patient_name}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date *</label>
              <input
                type="date"
                name="appointment_date"
                value={formData.appointment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, appointment_date: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <input
                type="text"
                value="Asia/Karachi (PKT)"
                disabled
                className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-sm"
              />
            </div>
          </div>
          
          {formData.start_time >= formData.end_time && (
            <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded-lg">
              <p className="font-semibold text-sm">⚠️ Warning:</p>
              <p className="text-xs">End time must be after start time</p>
            </div>
          )}
          
          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded-lg">
            <p className="font-semibold text-sm">ℹ️ Note:</p>
            <p className="text-xs">The database will check for time slot conflicts upon submission.</p>
          </div>
        </div>
      )
    }

    if (currentStep === 3) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type *</label>
              <select
                name="appointment_type"
                value={formData.appointment_type}
                onChange={(e) => setFormData(prev => ({ ...prev, appointment_type: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option>Consultation</option>
                <option>Follow-up</option>
                <option>Emergency</option>
                <option>Procedure</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option>Scheduled</option>
                <option>Confirmed</option>
                <option>Completed</option>
                <option>Cancelled</option>
                <option>No Show</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fee (PKR) *</label>
              <input
                type="number"
                name="fee"
                value={formData.fee}
                onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Notes / Reason for Visit</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g., Patient is suffering from persistent headaches..."
            />
          </div>
          
          <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
            <h4 className="font-bold text-green-800 mb-2">Final Summary:</h4>
            <p className="text-sm text-gray-700">
              <strong>Dr:</strong> {formData.doctor_name || 'N/A'} <br/>
              <strong>Patient:</strong> {formData.patient_name || 'N/A'} <br/>
              <strong>Date:</strong> {formData.appointment_date}<br/>
              <strong>Time:</strong> {formatTime(formData.start_time)} - {formatTime(formData.end_time)}<br/>
              <strong>Fee:</strong> PKR {formData.fee}
            </p>
          </div>
        </div>
      )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col transform transition-all duration-300 scale-100">
        
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600"/>
            {isEdit ? 'Edit Appointment' : 'Book New Appointment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-between items-center px-8 py-4 border-b border-gray-100">
          {FORM_STEPS.map((step) => (
            <div key={step.step} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 
                ${currentStep > step.step ? 'bg-green-500 text-white' : 
                  currentStep === step.step ? 'bg-purple-600 text-white shadow-lg' : 
                  'bg-gray-200 text-gray-600'}`
              }>
                {currentStep > step.step ? <CheckCircle className='w-4 h-4'/> : step.step}
              </div>
              <span className={`text-xs mt-1 font-medium hidden sm:block ${currentStep >= step.step ? 'text-purple-700' : 'text-gray-500'}`}>
                {step.title}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          {renderStepContent()}
        </form>

        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || isSaving}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-medium transition-all ${
              currentStep === 1 || isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 text-gray-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {currentStep < FORM_STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance || isSaving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition-all ${
                !canAdvance || isSaving ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvance || isSaving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition-all ${
                !canAdvance || isSaving ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> {isEdit ? 'Update Appointment' : 'Confirm & Book'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}