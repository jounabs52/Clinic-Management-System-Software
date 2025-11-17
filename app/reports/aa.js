// // app/reports/page.js
// 'use client'
// import { useState, useEffect } from 'react'
// import { 
//   FileSpreadsheet, FileText, Eye, Printer, ChevronLeft, ChevronRight, 
//   Users, Stethoscope, Calendar, DollarSign
// } from 'lucide-react'
// import { toast } from 'react-hot-toast'
// import { supabase } from '@/lib/supabase'

// // Configuration
// const PATIENT_TABLE = 'patients'
// const DOCTOR_TABLE = 'doctors'
// const APPOINTMENT_TABLE = 'appointments'

// // Utility Functions from appointments page
// const formatTime = (time) => {
//   if (!time) return '-';
//   const [hours, minutes] = time.split(':');
//   const h = parseInt(hours, 10);
//   const ampm = h >= 12 ? 'PM' : 'AM';
//   const hour = h % 12 || 12; 
//   return `${hour}:${minutes} ${ampm}`;
// };

// const formatDate = (dateString) => {
//   if (!dateString) return '-';
//   return new Date(dateString).toLocaleDateString('en-PK', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric'
//   });
// };

// const formatCurrency = (amount) => {
//   return `PKR ${Number(amount).toLocaleString('en-PK')}`
// }

// // APIs similar to the pages
// const patientsAPI = {
//   getAll: async () => {
//     const { data, error } = await supabase
//       .from(PATIENT_TABLE)
//       .select('*')
//     if (error) throw error
//     return data.map(p => ({
//       id: p.id,
//       name: p.name,
//       phone: p.phone,
//       mr_number: p.mr_number,
//       registration_date: p.registration_date,
//       email: p.email,
//       cnic: p.cnic,
//       gender: p.gender,
//       age: p.age,
//       blood_group: p.blood_group,
//       address: p.address
//     }))
//   }
// }

// const doctorsAPI = {
//   getAll: async () => {
//     const { data, error } = await supabase
//       .from(DOCTOR_TABLE)
//       .select('*')
//     if (error) throw error
//     return data // Assume fields match MASTER_DOCTOR_FIELDS mapped
//   }
// }

// const appointmentsAPI = {
//   getAll: async () => {
//     const { data, error } = await supabase
//       .from(APPOINTMENT_TABLE)
//       .select(`
//         appointment_id, 
//         appointment_date, 
//         start_time, 
//         end_time, 
//         status, 
//         appointment_type, 
//         fee,
//         notes,
//         doctor:doctors!inner(doctor_id, name, specialization),
//         patient:patients!inner(id, name, phone, mr_number)
//       `);
//     if (error) throw error
    
//     return data.map(app => ({ 
//       id: app.appointment_id,
//       appointment_date: app.appointment_date,
//       start_time: app.start_time,
//       end_time: app.end_time,
//       status: app.status,
//       appointment_type: app.appointment_type,
//       fee: app.fee || 0,
//       notes: app.notes,
      
//       doctor_id: app.doctor?.doctor_id,
//       doctor_name: app.doctor?.name,
//       doctor_specialty: app.doctor?.specialization,
      
//       patient_id: app.patient?.id,
//       patient_name: app.patient?.name,
//       patient_phone: app.patient?.phone,
//       patient_mr_number: app.patient?.mr_number,
//     }));
//   }
// }

// export default function ReportsPage() {
//   const [loading, setLoading] = useState(true)
//   const [patients, setPatients] = useState([])
//   const [doctors, setDoctors] = useState([])
//   const [appointments, setAppointments] = useState([])
//   const [currentPage, setCurrentPage] = useState(1)
//   const rowsPerPage = 5 // For recent appointments table

//   const loadData = async () => {
//     try {
//       setLoading(true)
//       const [pats, docs, apps] = await Promise.all([
//         patientsAPI.getAll(),
//         doctorsAPI.getAll(),
//         appointmentsAPI.getAll()
//       ])

//       setPatients(pats)
//       setDoctors(docs)
//       setAppointments(apps)
//     } catch (error) {
//       console.error('Error loading reports data:', error)
//       toast.error('Failed to load data')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     loadData()
//   }, [])

//   // Computed values
//   const patientCount = patients.length
//   const doctorCount = doctors.length
//   const appointmentCount = appointments.length
//   const totalRevenue = appointments.reduce((sum, app) => sum + (app.fee || 0), 0)

//   // Recent appointments
//   const recentAppointments = [...appointments].sort((a, b) => 
//     new Date(b.appointment_date) - new Date(a.appointment_date)
//   )

//   // Appointments per doctor
//   const appointmentsPerDoctor = doctors.map(doc => {
//     const count = appointments.filter(app => app.doctor_id === doc.doctor_id).length
//     return {
//       doctor: doc.name || 'Unknown',
//       count
//     }
//   }).filter(item => item.count > 0) // Optional: only show with appointments

//   // Pagination for recent
//   const indexOfLast = currentPage * rowsPerPage
//   const indexOfFirst = indexOfLast - rowsPerPage
//   const currentRecent = recentAppointments.slice(indexOfFirst, indexOfLast)
//   const totalPages = Math.ceil(recentAppointments.length / rowsPerPage)

//   const handlePreviousPage = () => {
//     if (currentPage > 1) setCurrentPage(currentPage - 1)
//   }

//   const handleNextPage = () => {
//     if (currentPage < totalPages) setCurrentPage(currentPage + 1)
//   }

//   const exportToExcel = (data, filename) => {
//     const csv = [
//       Object.keys(data[0]),
//       ...data.map(item => Object.values(item))
//     ].map(row => row.join(',')).join('\n')
    
//     const blob = new Blob([csv], { type: 'text/csv' })
//     const url = window.URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = `${filename}.csv`
//     a.click()
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
//           <p className="text-gray-600">Generating Reports...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 p-6">
//       <div className="max-w-7xl mx-auto space-y-6">
//         {/* Header */}
//         <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6">
//           <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
//             <Eye className="w-6 h-6 text-purple-600" />
//             Hospital Reports
//           </h1>
//         </div>

//         {/* Summary Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
//             <div className="flex items-center gap-4">
//               <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
//                 <Users className="w-6 h-6 text-purple-600" />
//               </div>
//               <div>
//                 <p className="text-sm text-gray-600">Total Patients</p>
//                 <p className="text-3xl font-bold text-gray-800">{patientCount}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
//             <div className="flex items-center gap-4">
//               <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
//                 <Stethoscope className="w-6 h-6 text-blue-600" />
//               </div>
//               <div>
//                 <p className="text-sm text-gray-600">Total Doctors</p>
//                 <p className="text-3xl font-bold text-gray-800">{doctorCount}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
//             <div className="flex items-center gap-4">
//               <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
//                 <Calendar className="w-6 h-6 text-green-600" />
//               </div>
//               <div>
//                 <p className="text-sm text-gray-600">Total Appointments</p>
//                 <p className="text-3xl font-bold text-gray-800">{appointmentCount}</p>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 hover:shadow-md transition-shadow">
//             <div className="flex items-center gap-4">
//               <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
//                 <DollarSign className="w-6 h-6 text-indigo-600" />
//               </div>
//               <div>
//                 <p className="text-sm text-gray-600">Total Revenue</p>
//                 <p className="text-3xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Appointments Per Doctor Table */}
//         <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
//           <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
//             <h2 className="text-xl font-bold text-gray-800">Appointments Per Doctor</h2>
//             <div className="flex gap-3">
//               <button 
//                 onClick={() => exportToExcel(appointmentsPerDoctor, 'appointments_per_doctor')}
//                 className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 text-sm font-semibold text-green-700 transition-all shadow-sm"
//               >
//                 <FileSpreadsheet className="w-4 h-4" />
//                 Excel
//               </button>
//               <button 
//                 onClick={() => window.print()}
//                 className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 text-sm font-semibold text-red-700 transition-all shadow-sm"
//               >
//                 <FileText className="w-4 h-4" />
//                 PDF
//               </button>
//             </div>
//           </div>
          
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Doctor</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Appointment Count</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {appointmentsPerDoctor.map((item, index) => (
//                   <tr key={index} className="hover:bg-gray-50">
//                     <td className="px-6 py-4 text-sm text-gray-900">{item.doctor}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{item.count}</td>
//                     <td className="px-6 py-4">
//                       <button className="text-blue-600 hover:text-blue-800">
//                         <Eye className="w-4 h-4" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Recent Appointments Table */}
//         <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
//           <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between">
//             <h2 className="text-xl font-bold text-gray-800">Recent Appointments</h2>
//             <div className="flex gap-3">
//               <button 
//                 onClick={() => exportToExcel(recentAppointments, 'recent_appointments')}
//                 className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 text-sm font-semibold text-green-700 transition-all shadow-sm"
//               >
//                 <FileSpreadsheet className="w-4 h-4" />
//                 Excel
//               </button>
//               <button 
//                 onClick={() => window.print()}
//                 className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 text-sm font-semibold text-red-700 transition-all shadow-sm"
//               >
//                 <FileText className="w-4 h-4" />
//                 PDF
//               </button>
//             </div>
//           </div>
          
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Doctor</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Patient</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Fee</th>
//                   <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {currentRecent.map((app) => (
//                   <tr key={app.id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4 text-sm text-gray-900">{formatDate(app.appointment_date)}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{formatTime(app.start_time)}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{app.doctor_name}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{app.patient_name}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{app.status}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{app.appointment_type}</td>
//                     <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(app.fee)}</td>
//                     <td className="px-6 py-4">
//                       <button className="text-blue-600 hover:text-blue-800">
//                         <Eye className="w-4 h-4" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="px-6 py-4 border-t flex items-center justify-between">
//             <div className="text-sm text-gray-600">
//               Showing {indexOfFirst + 1} to {Math.min(indexOfLast, recentAppointments.length)} of {recentAppointments.length}
//             </div>
            
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={handlePreviousPage}
//                 disabled={currentPage === 1}
//                 className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
//                   currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
//                 }`}
//               >
//                 <ChevronLeft className="w-4 h-4" />
//                 Previous
//               </button>
//               <span className="text-sm font-medium">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button
//                 onClick={handleNextPage}
//                 disabled={currentPage === totalPages}
//                 className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
//                   currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
//                 }`}
//               >
//                 Next
//                 <ChevronRight className="w-4 h-4" />
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }


'use client'
import { useState, useEffect, useMemo } from 'react'
import { 
  Search, FileSpreadsheet, FileText, Eye, Columns, 
  X, ChevronLeft, ChevronRight, BarChart3, 
  Users, Stethoscope, Calendar, TrendingUp,
  Clock, Phone, Mail, Hash, MapPin, Printer
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// Configuration
const DOCTOR_TABLE = 'doctors'
const PATIENT_TABLE = 'patients'
const APPOINTMENT_TABLE = 'appointments'

const REPORT_TYPES = [
  { id: 'all', label: 'All Reports', icon: BarChart3 },
  { id: 'doctors', label: 'Doctors Report', icon: Stethoscope },
  { id: 'patients', label: 'Patients Report', icon: Users },
  { id: 'appointments', label: 'Appointments Report', icon: Calendar },
]

// API Services
const reportsAPI = {
  getAllDoctors: async () => {
    const { data, error } = await supabase
      .from(DOCTOR_TABLE)
      .select('*')
    
    if (error) throw error
    
    return data.map(d => ({
      id: d.doctor_id,
      name: d.name,
      specialty: d.specialization,
      phone: d.phone,
      email: d.email,
      license_id: d.license_number,
      department: d.department,
      consultation_fee: d.consultation_fee || 0,
      status: d.status,
      type: 'doctor'
    }))
  },

  getAllPatients: async () => {
    const { data, error } = await supabase
      .from(PATIENT_TABLE)
      .select('*')
    
    if (error) throw error
    
    return data.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      mr_number: p.mr_number,
      registration_date: p.registration_date,
      gender: p.gender,
      age: p.age,
      blood_group: p.blood_group,
      address: p.address,
      type: 'patient'
    }))
  },

  getAllAppointments: async () => {
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
      `)
    
    if (error) throw error
    
    return data.map(app => ({
      id: app.appointment_id,
      appointment_date: app.appointment_date,
      start_time: app.start_time,
      end_time: app.end_time,
      status: app.status,
      appointment_type: app.appointment_type,
      fee: app.fee || 0,
      notes: app.notes,
      doctor_name: app.doctor.name,
      doctor_specialty: app.doctor.specialization,
      patient_name: app.patient.name,
      patient_phone: app.patient.phone,
      patient_mr_number: app.patient.mr_number,
      type: 'appointment'
    }))
  }
}

// Utility Functions
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatTime = (time) => {
  if (!time) return '-'
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${minutes} ${ampm}`
}

export default function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReportType, setSelectedReportType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [showColumnVisibility, setShowColumnVisibility] = useState(false)
  
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    type: true,
    contact: true,
    details: true,
    date: true
  })

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true)
      const [doctorsData, patientsData, appointmentsData] = await Promise.all([
        reportsAPI.getAllDoctors(),
        reportsAPI.getAllPatients(),
        reportsAPI.getAllAppointments()
      ])
      
      setDoctors(doctorsData)
      setPatients(patientsData)
      setAppointments(appointmentsData)
    } catch (error) {
      console.error('Error loading reports data:', error)
      toast.error('❌ Error loading reports data', { position: 'top-right' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Combined and filtered data
  const allReportsData = useMemo(() => {
    let combined = []
    
    if (selectedReportType === 'all' || selectedReportType === 'doctors') {
      combined = [...combined, ...doctors]
    }
    if (selectedReportType === 'all' || selectedReportType === 'patients') {
      combined = [...combined, ...patients]
    }
    if (selectedReportType === 'all' || selectedReportType === 'appointments') {
      combined = [...combined, ...appointments]
    }
    
    return combined
  }, [doctors, patients, appointments, selectedReportType])

  const filteredReports = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    
    return allReportsData.filter(item => {
      if (item.type === 'doctor') {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.specialty?.toLowerCase().includes(searchLower) ||
          item.phone?.includes(searchLower) ||
          item.license_id?.toLowerCase().includes(searchLower)
        )
      } else if (item.type === 'patient') {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.phone?.includes(searchLower) ||
          item.mr_number?.toLowerCase().includes(searchLower) ||
          item.email?.toLowerCase().includes(searchLower)
        )
      } else if (item.type === 'appointment') {
        return (
          item.doctor_name?.toLowerCase().includes(searchLower) ||
          item.patient_name?.toLowerCase().includes(searchLower) ||
          item.patient_phone?.includes(searchLower) ||
          item.status?.toLowerCase().includes(searchLower)
        )
      }
      return false
    })
  }, [allReportsData, searchTerm])

  const indexOfLastReport = currentPage * rowsPerPage
  const indexOfFirstReport = indexOfLastReport - rowsPerPage
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport)
  const totalPages = Math.ceil(filteredReports.length / rowsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, rowsPerPage, selectedReportType])

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages))
  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1))

  const openViewModal = (item) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setSelectedItem(null)
  }

  const exportToExcel = () => {
    const headers = ['Type', 'Name/Details', 'Contact', 'Additional Info', 'Date/Time']
    const rows = filteredReports.map(item => {
      if (item.type === 'doctor') {
        return [
          'Doctor',
          item.name,
          item.phone,
          `${item.specialty} - ${item.license_id}`,
          '-'
        ]
      } else if (item.type === 'patient') {
        return [
          'Patient',
          item.name,
          item.phone,
          `${item.mr_number} - ${item.blood_group || 'N/A'}`,
          formatDate(item.registration_date)
        ]
      } else {
        return [
          'Appointment',
          `${item.patient_name} with Dr. ${item.doctor_name}`,
          item.patient_phone,
          `${item.appointment_type} - ${item.status}`,
          `${formatDate(item.appointment_date)} ${formatTime(item.start_time)}`
        ]
      }
    })
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reports_${selectedReportType}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('✅ Exported to Excel!', { position: 'top-right' })
  }

  const handlePrint = (item) => {
    const printWindow = window.open('', '_blank')
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Details</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #7c3aed; font-size: 28px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .section { margin-bottom: 25px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #7c3aed; }
          .section-title { font-size: 16px; font-weight: bold; color: #7c3aed; margin-bottom: 12px; text-transform: uppercase; }
          .info-row { display: flex; margin-bottom: 10px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .label { font-weight: 600; width: 150px; color: #4b5563; }
          .value { flex: 1; color: #1f2937; }
          .footer { margin-top: 40px; text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Report Details</h1>
          <p>Generated on ${new Date().toLocaleString('en-PK')}</p>
        </div>
    `

    if (item.type === 'doctor') {
      printContent += `
        <div class="section">
          <div class="section-title">Doctor Information</div>
          <div class="info-row"><span class="label">Name:</span><span class="value">${item.name}</span></div>
          <div class="info-row"><span class="label">Specialty:</span><span class="value">${item.specialty}</span></div>
          <div class="info-row"><span class="label">License ID:</span><span class="value">${item.license_id}</span></div>
          <div class="info-row"><span class="label">Department:</span><span class="value">${item.department}</span></div>
          <div class="info-row"><span class="label">Phone:</span><span class="value">${item.phone}</span></div>
          <div class="info-row"><span class="label">Email:</span><span class="value">${item.email || 'N/A'}</span></div>
          <div class="info-row"><span class="label">Consultation Fee:</span><span class="value">PKR ${item.consultation_fee.toLocaleString()}</span></div>
          <div class="info-row"><span class="label">Status:</span><span class="value">${item.status}</span></div>
        </div>
      `
    } else if (item.type === 'patient') {
      printContent += `
        <div class="section">
          <div class="section-title">Patient Information</div>
          <div class="info-row"><span class="label">Name:</span><span class="value">${item.name}</span></div>
          <div class="info-row"><span class="label">MR Number:</span><span class="value">${item.mr_number}</span></div>
          <div class="info-row"><span class="label">Phone:</span><span class="value">${item.phone}</span></div>
          <div class="info-row"><span class="label">Email:</span><span class="value">${item.email || 'N/A'}</span></div>
          <div class="info-row"><span class="label">Gender:</span><span class="value">${item.gender || 'N/A'}</span></div>
          <div class="info-row"><span class="label">Age:</span><span class="value">${item.age || 'N/A'}</span></div>
          <div class="info-row"><span class="label">Blood Group:</span><span class="value">${item.blood_group || 'N/A'}</span></div>
          <div class="info-row"><span class="label">Registration Date:</span><span class="value">${formatDate(item.registration_date)}</span></div>
          ${item.address ? `<div class="info-row"><span class="label">Address:</span><span class="value">${item.address}</span></div>` : ''}
        </div>
      `
    } else if (item.type === 'appointment') {
      printContent += `
        <div class="section">
          <div class="section-title">Appointment Information</div>
          <div class="info-row"><span class="label">Patient Name:</span><span class="value">${item.patient_name}</span></div>
          <div class="info-row"><span class="label">MR Number:</span><span class="value">${item.patient_mr_number}</span></div>
          <div class="info-row"><span class="label">Phone:</span><span class="value">${item.patient_phone}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Doctor Information</div>
          <div class="info-row"><span class="label">Doctor Name:</span><span class="value">${item.doctor_name}</span></div>
          <div class="info-row"><span class="label">Specialty:</span><span class="value">${item.doctor_specialty}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Appointment Details</div>
          <div class="info-row"><span class="label">Date:</span><span class="value">${formatDate(item.appointment_date)}</span></div>
          <div class="info-row"><span class="label">Time:</span><span class="value">${formatTime(item.start_time)} - ${formatTime(item.end_time)}</span></div>
          <div class="info-row"><span class="label">Type:</span><span class="value">${item.appointment_type}</span></div>
          <div class="info-row"><span class="label">Status:</span><span class="value">${item.status}</span></div>
          <div class="info-row"><span class="label">Fee:</span><span class="value">PKR ${item.fee.toLocaleString()}</span></div>
          ${item.notes ? `<div class="info-row"><span class="label">Notes:</span><span class="value">${item.notes}</span></div>` : ''}
        </div>
      `
    }

    printContent += `
        <div class="footer">
          <p>This is a computer-generated report. No signature required.</p>
          <p>Hospital Management System © 2025</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `
    
    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  const renderTableRow = (item) => {
    if (item.type === 'doctor') {
      return (
        <tr key={`doctor-${item.id}`} className="hover:bg-gray-50 transition-colors">
          {visibleColumns.name && <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.name}</td>}
          {visibleColumns.type && <td className="px-6 py-4 text-sm"><span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold">Doctor</span></td>}
          {visibleColumns.contact && <td className="px-6 py-4 text-sm text-gray-600">{item.phone}</td>}
          {visibleColumns.details && <td className="px-6 py-4 text-sm text-gray-700">{item.specialty} - {item.license_id}</td>}
          {visibleColumns.date && <td className="px-6 py-4 text-sm text-gray-600">-</td>}
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openViewModal(item)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handlePrint(item)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      )
    } else if (item.type === 'patient') {
      return (
        <tr key={`patient-${item.id}`} className="hover:bg-gray-50 transition-colors">
          {visibleColumns.name && <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.name}</td>}
          {visibleColumns.type && <td className="px-6 py-4 text-sm"><span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">Patient</span></td>}
          {visibleColumns.contact && <td className="px-6 py-4 text-sm text-gray-600">{item.phone}</td>}
          {visibleColumns.details && <td className="px-6 py-4 text-sm text-gray-700">{item.mr_number} - {item.blood_group || 'N/A'}</td>}
          {visibleColumns.date && <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.registration_date)}</td>}
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openViewModal(item)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handlePrint(item)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      )
    } else if (item.type === 'appointment') {
      return (
        <tr key={`appointment-${item.id}`} className="hover:bg-gray-50 transition-colors">
          {visibleColumns.name && <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.patient_name} <span className="text-gray-500">with Dr. {item.doctor_name}</span></td>}
          {visibleColumns.type && <td className="px-6 py-4 text-sm"><span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">Appointment</span></td>}
          {visibleColumns.contact && <td className="px-6 py-4 text-sm text-gray-600">{item.patient_phone}</td>}
          {visibleColumns.details && <td className="px-6 py-4 text-sm text-gray-700">{item.appointment_type} - {item.status}</td>}
          {visibleColumns.date && <td className="px-6 py-4 text-sm text-gray-600">{formatDate(item.appointment_date)} {formatTime(item.start_time)}</td>}
          <td className="px-6 py-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openViewModal(item)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handlePrint(item)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Print"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between py-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-purple-600" />
          Reports & Analytics
        </h1>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-xl flex items-center gap-3">
            <span className="text-xl font-bold text-purple-700">{filteredReports.length}</span>
            <span className="text-sm text-purple-600">Total Records</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {REPORT_TYPES.map(reportType => {
          const Icon = reportType.icon
          let count = 0
          let color = 'purple'
          
          if (reportType.id === 'doctors') {
            count = doctors.length
            color = 'purple'
          } else if (reportType.id === 'patients') {
            count = patients.length
            color = 'green'
          } else if (reportType.id === 'appointments') {
            count = appointments.length
            color = 'blue'
          } else {
            count = doctors.length + patients.length + appointments.length
            color = 'indigo'
          }
          
          return (
            <button
              key={reportType.id}
              onClick={() => setSelectedReportType(reportType.id)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedReportType === reportType.id
                  ? `bg-${color}-50 border-${color}-500 shadow-lg`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-8 h-8 ${selectedReportType === reportType.id ? `text-${color}-600` : 'text-gray-400'}`} />
                <span className={`text-2xl font-bold ${selectedReportType === reportType.id ? `text-${color}-700` : 'text-gray-700'}`}>
                  {count}
                </span>
              </div>
              <h3 className={`text-sm font-semibold ${selectedReportType === reportType.id ? `text-${color}-700` : 'text-gray-600'}`}>
                {reportType.label}
              </h3>
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports by name, phone, specialty, MR number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pl-10 pr-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100">
        
        <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToExcel}
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
                Columns
              </button>
              {showColumnVisibility && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-10">
                  <div className="space-y-2">
                    {Object.keys(visibleColumns).map(col => (
                      <label key={col} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns[col]}
                          onChange={(e) => setVisibleColumns({...visibleColumns, [col]: e.target.checked})}
                          className="rounded w-4 h-4 text-purple-600" 
                        />
                        <span className="text-sm text-gray-700 capitalize">{col}</span>
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {visibleColumns.name && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>}
                {visibleColumns.type && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>}
                {visibleColumns.contact && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>}
                {visibleColumns.details && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>}
                {visibleColumns.date && <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date/Time</th>}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentReports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">No reports found</h3>
                      <p className="text-sm text-gray-500">Try adjusting your filters or search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentReports.map(item => renderTableRow(item))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-800">{indexOfFirstReport + 1}</span> to{' '}
            <span className="font-semibold text-gray-800">{Math.min(indexOfLastReport, filteredReports.length)}</span>{' '}
            of <span className="font-semibold text-gray-800">{filteredReports.length}</span> entries
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                currentPage === 1 
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
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
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                currentPage === totalPages 
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 sticky top-0">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <Eye className="w-6 h-6 text-purple-600"/>
                {selectedItem.type === 'doctor' && 'Doctor Details'}
                {selectedItem.type === 'patient' && 'Patient Details'}
                {selectedItem.type === 'appointment' && 'Appointment Details'}
              </h2>
              <button 
                onClick={closeViewModal} 
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {selectedItem.type === 'doctor' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Doctor Name</p>
                      <p className="text-lg font-bold text-gray-900">{selectedItem.name}</p>
                      <p className="text-sm text-purple-600">{selectedItem.specialty}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        License ID
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.license_id}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        Department
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.department}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.phone}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.email || 'N/A'}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Consultation Fee
                      </p>
                      <p className="font-semibold text-gray-900">PKR {selectedItem.consultation_fee.toLocaleString()}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <p className="font-semibold text-gray-900">{selectedItem.status}</p>
                    </div>
                  </div>
                </>
              )}

              {selectedItem.type === 'patient' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Patient Name</p>
                      <p className="text-lg font-bold text-gray-900">{selectedItem.name}</p>
                      <p className="text-sm text-green-600">MR: {selectedItem.mr_number}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.phone}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.email || 'N/A'}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Gender
                      </p>
                      <p className="font-semibold text-gray-900">{selectedItem.gender || 'N/A'}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Age</p>
                      <p className="font-semibold text-gray-900">{selectedItem.age || 'N/A'}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Blood Group</p>
                      <p className="font-semibold text-gray-900">{selectedItem.blood_group || 'N/A'}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Registration Date
                      </p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedItem.registration_date)}</p>
                    </div>
                    
                    {selectedItem.address && (
                      <div className="col-span-2 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Address
                        </p>
                        <p className="text-gray-900">{selectedItem.address}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedItem.type === 'appointment' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-gray-600 mb-1">Doctor</p>
                      <p className="text-lg font-bold text-gray-900">{selectedItem.doctor_name}</p>
                      <p className="text-sm text-purple-600">{selectedItem.doctor_specialty}</p>
                    </div>
                    
                    <div className="col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Patient</p>
                      <p className="text-lg font-bold text-gray-900">{selectedItem.patient_name}</p>
                      <p className="text-sm text-green-600">MR: {selectedItem.patient_mr_number} | {selectedItem.patient_phone}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date
                      </p>
                      <p className="font-semibold text-gray-900">{formatDate(selectedItem.appointment_date)}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Time
                      </p>
                      <p className="font-semibold text-gray-900">{formatTime(selectedItem.start_time)} - {formatTime(selectedItem.end_time)}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Type</p>
                      <p className="font-semibold text-gray-900">{selectedItem.appointment_type}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Status</p>
                      <p className="font-semibold text-gray-900">{selectedItem.status}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Fee
                      </p>
                      <p className="font-semibold text-gray-900">PKR {selectedItem.fee.toLocaleString()}</p>
                    </div>
                    
                    {selectedItem.notes && (
                      <div className="col-span-2 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Notes</p>
                        <p className="text-gray-900">{selectedItem.notes}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => handlePrint(selectedItem)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={closeViewModal}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}