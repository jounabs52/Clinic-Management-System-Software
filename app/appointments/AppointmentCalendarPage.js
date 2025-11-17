'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Calendar, X, ChevronLeft, ChevronRight, Clock, User, Stethoscope, 
  Eye, Plus, List, Search, Edit2, Trash2, Download, FileText
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { appointmentsAPI } from '@/lib/supabase'
import AddEditAppointmentModal from './AddEditAppointmentModal'
import { exportAppointmentsToPDF, exportAppointmentsToExcel, exportSingleAppointmentPDF } from './AppointmentExport'

// ============================================================================
// Utility Functions
// ============================================================================
const formatTime = (time) => {
  if (!time) return '-'
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${minutes.padStart(2, '0')} ${ampm}`
}

const getStatusBadgeClass = (status) => {
  const statusMap = {
    'Scheduled': 'bg-purple-100 text-purple-800',
    'Confirmed': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-gray-100 text-gray-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'No Show': 'bg-orange-100 text-orange-800'
  }
  return statusMap[status] || 'bg-gray-100 text-gray-800'
}

const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getWeekDays = (date) => {
  const week = []
  const currentDate = new Date(date)
  const day = currentDate.getDay()
  const diff = currentDate.getDate() - day
  
  for (let i = 0; i < 7; i++) {
    const weekDay = new Date(currentDate)
    weekDay.setDate(diff + i)
    week.push(weekDay)
  }
  
  return week
}

// ============================================================================
// Confirmation Modal Component
// ============================================================================
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Delete", confirmColor = "red" }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 bg-${confirmColor}-600 text-white rounded-lg font-medium hover:bg-${confirmColor}-700 transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Appointment Detail Modal Component
// ============================================================================
const AppointmentDetailModal = ({ appointment, onClose, onEdit, onDelete, onExportPDF }) => {
  if (!appointment) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Patient</p>
              <p className="font-semibold text-gray-900">{appointment.patient_name}</p>
              {appointment.mr_number && (
                <p className="text-xs text-gray-500">MR: {appointment.mr_number}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Stethoscope className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Doctor</p>
              <p className="font-semibold text-gray-900">{appointment.doctor_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-semibold text-gray-900">
                {new Date(appointment.appointment_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-semibold text-gray-900">
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Type:</span>
              <span className="font-medium text-gray-900">{appointment.appointment_type}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Fee:</span>
              <span className="font-semibold text-gray-900">PKR {appointment.fee}</span>
            </div>
          </div>

          {appointment.notes && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-1">Notes:</p>
              <p className="text-sm text-gray-700">{appointment.notes}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 rounded-b-lg flex gap-2">
          <button
            onClick={() => onExportPDF(appointment)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={() => onEdit(appointment)}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={() => onDelete(appointment.id)}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Calendar Component
// ============================================================================
export default function AppointmentCalendarPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [showAddEditModal, setShowAddEditModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState(null)

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const data = await appointmentsAPI.getAll()
      setAppointments(data)
    } catch (error) {
      toast.error('Error loading appointments')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce((acc, app) => {
      if (!acc[app.appointment_date]) {
        acc[app.appointment_date] = []
      }
      acc[app.appointment_date].push(app)
      return acc
    }, {})
  }, [appointments])

  const filteredAppointments = useMemo(() => {
    if (!searchTerm) return appointments
    const term = searchTerm.toLowerCase()
    return appointments.filter(app =>
      app.patient_name.toLowerCase().includes(term) ||
      app.doctor_name.toLowerCase().includes(term) ||
      app.mr_number?.toLowerCase().includes(term)
    )
  }, [appointments, searchTerm])

  const handleEdit = (appointment) => {
    setSelectedAppointment(null)
    setEditingAppointment(appointment)
    setShowAddEditModal(true)
  }

  const initiateDelete = (id) => {
    setAppointmentToDelete(id)
    setShowDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!appointmentToDelete) return
    
    try {
      await appointmentsAPI.delete(appointmentToDelete)
      toast.success('Appointment deleted successfully')
      loadAppointments()
      setSelectedAppointment(null)
    } catch (error) {
      toast.error('Error deleting appointment')
      console.error(error)
    } finally {
      setShowDeleteConfirm(false)
      setAppointmentToDelete(null)
    }
  }

  const handleExportSinglePDF = (appointment) => {
    exportSingleAppointmentPDF(appointment)
  }

  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    
    const days = []
    const currentDay = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }
    
    return days
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const getDayAppointments = (date) => {
    const dateKey = formatDateKey(date)
    return appointmentsByDate[dateKey] || []
  }

  const getTimeSlots = () => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  const handleExportPDF = () => {
    exportAppointmentsToPDF(filteredAppointments)
  }

  const handleExportExcel = () => {
    exportAppointmentsToExcel(filteredAppointments)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className=" max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="w-7 h-7 text-purple-600" />
          Appointment Calendar
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Buttons */}
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> Excel
          </button>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg shadow-sm border border-gray-200 bg-white">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                viewMode === 'day' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-x ${
                viewMode === 'week' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                viewMode === 'month' ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Month
            </button>
          </div>

          {/* Book New Button */}
          <button 
            onClick={() => {
              setEditingAppointment(null)
              setShowAddEditModal(true)
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Book New
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                if (viewMode === 'day') {
                  newDate.setDate(newDate.getDate() - 1)
                } else if (viewMode === 'week') {
                  newDate.setDate(newDate.getDate() - 7)
                } else {
                  newDate.setMonth(newDate.getMonth() - 1)
                }
                setCurrentDate(newDate)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 min-w-[200px] text-center">
              {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {viewMode === 'week' && `Week of ${getWeekDays(currentDate)[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
              {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={() => {
                const newDate = new Date(currentDate)
                if (viewMode === 'day') {
                  newDate.setDate(newDate.getDate() + 1)
                } else if (viewMode === 'week') {
                  newDate.setDate(newDate.getDate() + 7)
                } else {
                  newDate.setMonth(newDate.getMonth() + 1)
                }
                setCurrentDate(newDate)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            {getTimeSlots().map((timeSlot) => {
              const dayAppts = getDayAppointments(currentDate).filter(app => 
                app.start_time <= timeSlot && app.end_time > timeSlot
              )
              
              return (
                <div key={timeSlot} className="flex border-b hover:bg-gray-50">
                  <div className="w-20 p-2 text-sm text-gray-600 font-medium border-r bg-gray-50">
                    {formatTime(timeSlot)}
                  </div>
                  <div className="flex-1 p-2 min-h-[60px]">
                    {dayAppts.map(app => (
                      <button
                        key={app.id}
                        onClick={() => setSelectedAppointment(app)}
                        className="w-full text-left p-2 mb-1 rounded bg-purple-100 hover:bg-purple-200 border border-purple-300 transition-colors"
                      >
                        <div className="font-semibold text-purple-900 text-sm">{app.patient_name}</div>
                        <div className="text-xs text-purple-700">Dr. {app.doctor_name}</div>
                        <div className="text-xs text-purple-600">{formatTime(app.start_time)} - {formatTime(app.end_time)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="grid grid-cols-8 border-b bg-gray-50">
            <div className="p-2 text-xs font-semibold text-gray-600"></div>
            {getWeekDays(currentDate).map((day, index) => (
              <div key={index} className="p-2 text-center border-l">
                <div className="text-xs font-semibold text-purple-600 uppercase">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${isToday(day) ? 'text-purple-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
          
          <div className="overflow-auto max-h-[500px]">
            {getTimeSlots().map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-8 border-b hover:bg-gray-50">
                <div className="p-2 text-xs text-gray-600 font-medium border-r bg-gray-50">
                  {formatTime(timeSlot)}
                </div>
                {getWeekDays(currentDate).map((day, index) => {
                  const dayAppts = getDayAppointments(day).filter(app => 
                    app.start_time <= timeSlot && app.end_time > timeSlot
                  )
                  
                  return (
                    <div key={index} className="p-1 border-l min-h-[50px]">
                      {dayAppts.map(app => (
                        <button
                          key={app.id}
                          onClick={() => setSelectedAppointment(app)}
                          className="w-full text-left p-1 mb-1 rounded text-xs bg-purple-100 hover:bg-purple-200 border border-purple-300"
                        >
                          <div className="font-semibold text-purple-900 truncate">{app.patient_name}</div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-2 py-3 text-center text-xs font-semibold text-purple-600 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
            {getMonthDays().map((date, index) => {
              const dateKey = formatDateKey(date)
              const dayAppointments = appointmentsByDate[dateKey] || []
              const isCurrentMonthDay = isCurrentMonth(date)
              const isTodayDay = isToday(date)

              return (
                <div
                  key={index}
                  className={`min-h-24 p-2 ${!isCurrentMonthDay ? 'bg-gray-50' : 'bg-white'} ${
                    isTodayDay ? 'ring-2 ring-purple-500 ring-inset' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-semibold ${
                      !isCurrentMonthDay ? 'text-gray-400' : isTodayDay ? 'text-purple-600' : 'text-gray-900'
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <button
                        key={appointment.id}
                        onClick={() => setSelectedAppointment(appointment)}
                        className="w-full text-left px-2 py-1 rounded text-xs bg-purple-100 hover:bg-purple-200 transition-colors border border-purple-300"
                      >
                        <div className="font-medium text-purple-900 truncate">
                          {formatTime(appointment.start_time)} {appointment.patient_name}
                        </div>
                      </button>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-purple-600 font-medium text-center">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onEdit={handleEdit}
          onDelete={initiateDelete}
          onExportPDF={handleExportSinglePDF}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setAppointmentToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
      />

      {/* Add/Edit Appointment Modal */}
      <AddEditAppointmentModal
        isOpen={showAddEditModal}
        onClose={() => {
          setShowAddEditModal(false)
          setEditingAppointment(null)
        }}
        onSuccess={() => {
          loadAppointments()
          setShowAddEditModal(false)
          setEditingAppointment(null)
        }}
        isEdit={!!editingAppointment}
        initialData={editingAppointment}
      />
    </div>
  )
}