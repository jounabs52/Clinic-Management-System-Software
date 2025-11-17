// components/Sidebar.js
'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  ClipboardList, 
  BarChart3, 
  Setting,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  Edit3,
  X,
  Plus // ADDED: Icon for 'Create New' Invoice
} from 'lucide-react'
import { Settings } from "lucide-react"

export default function Sidebar({ isOpen, setIsOpen, isMobile }) {
  const pathname = usePathname()
  const router = useRouter()
  
  // ✅ FIX: Initialize state based on pathname. If the path starts with '/patients', start expanded.
  const [patientsExpanded, setPatientsExpanded] = useState(pathname.startsWith('/patients'))
  
  const [doctorExpanded, setDoctorExpanded] = useState(false)
  
  // ✅ FIX: Initialize state based on pathname. If the path starts with '/invoices', start expanded.
  const [invoiceExpanded, setInvoiceExpanded] = useState(pathname.startsWith('/invoices'))
  
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Patients', icon: Users, path: '/patients' },
    { name: 'Doctors', icon: Users, path: '/doctors' },
    { name: 'Appointments', icon: Calendar, path: '/appointments' },
    { name: 'Treatment Plan', icon: Calendar, path: '/treatment-plan' },
    // MODIFIED: Invoice is now a dropdown parent item
    { 
        name: 'Invoices', 
        icon: FileText, // Using a generic file icon for the parent
        path: '/invoices', 
        children: [
            { name: 'List Invoices', icon: List, path: '/invoices/list' },
            { name: 'Create New', icon: Plus, path: '/invoices/create' }
        ]
    },
    { name: 'Reports', icon: BarChart3, path: '/reports' },
    { name: 'Settings', icon: Settings, path: '/setting' },
  ]

  const handleNavigation = (path) => {
    router.push(path)
    if (isMobile) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-white shadow-xl transition-all duration-300 z-40 ${
          isMobile 
            ? (isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64')
            : (isOpen ? 'w-64' : 'w-20')
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="white" />
            </div>
            {(isOpen || isMobile) && (
              <div className="animate-fade-in">
                <h1 className="text-base sm:text-lg font-bold text-gray-800">Gynecology</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            )}
          </div>
          
          {/* Close button for mobile */}
          {isMobile && isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Toggle Button (Desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 transition-colors shadow-md"
          >
            {isOpen ? (
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
        )}

        {/* Menu Items */}
        <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {menuItems.map((item, index) => {
            const isActive = pathname === item.path
            const Icon = item.icon

            // -----------------------------------------------------------
            // SPECIAL HANDLING FOR DROPDOWN MENU ITEMS
            // -----------------------------------------------------------

            // Special handling for Patients menu item
            if (item.name === 'Patients') {
              // Note: isActive check is updated to use pathname.startsWith('/patients') for consistency
              const isPatientsActive = pathname.startsWith('/patients')

              return (
                <div key={item.path} style={{ animationDelay: `${index * 50}ms` }}>
                  <button
                    onClick={() => {
                      if (isOpen || isMobile) {
                        setPatientsExpanded(!patientsExpanded)
                      } else {
                        setIsOpen(true)
                        setPatientsExpanded(true)
                      }
                      setDoctorExpanded(false)
                      setInvoiceExpanded(false) // Close other dropdowns
                    }}
                    className={`w-full sidebar-item ${
                      isPatientsActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                    }`}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isPatientsActive ? 'text-white' : 'text-gray-600'}`} />
                    {(isOpen || isMobile) && (
                      <>
                        <span className={`font-medium flex-1 text-left text-sm sm:text-base ${isPatientsActive ? 'text-white' : 'text-gray-700'}`}>
                          {item.name}
                        </span>
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform ${
                            patientsExpanded ? 'rotate-180' : ''
                          } ${isPatientsActive ? 'text-white' : 'text-gray-600'}`}
                        />
                      </>
                    )}
                  </button>

                  {/* Patient Child Items */}
                  {(isOpen || isMobile) && patientsExpanded && (
                    <div className="mt-1 space-y-1">
                      <button
                        onClick={() => handleNavigation('/patients/list')}
                        className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 ml-3 sm:ml-4 ${
                          pathname === '/patients/list'
                            ? 'bg-purple-50 text-purple-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <List className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                          pathname === '/patients/list' ? 'text-purple-700' : 'text-gray-500'
                        }`} />
                        <span className={`text-xs sm:text-sm font-medium ${
                          pathname === '/patients/list' ? 'text-purple-700' : 'text-gray-700'
                        }`}>
                          Patient List
                        </span>
                      </button>

                      <button
                        onClick={() => handleNavigation('/patients/form-designer')}
                        className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 ml-3 sm:ml-4 ${
                          pathname === '/patients/form-designer'
                            ? 'bg-purple-50 text-purple-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Edit3 className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                          pathname === '/patients/form-designer' ? 'text-purple-700' : 'text-gray-500'
                        }`} />
                        <span className={`text-xs sm:text-sm font-medium ${
                          pathname === '/patients/form-designer' ? 'text-purple-700' : 'text-gray-700'
                        }`}>
                          Form Designer
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )
            }
            
            // NEW: Special handling for Invoices menu item
            if (item.name === 'Invoices') {
                const isInvoiceActive = pathname.startsWith('/invoices')

                return (
                    <div key={item.path} style={{ animationDelay: `${index * 50}ms` }}>
                        <button
                            onClick={() => {
                                if (isOpen || isMobile) {
                                    setInvoiceExpanded(!invoiceExpanded)
                                } else {
                                    setIsOpen(true)
                                    setInvoiceExpanded(true)
                                }
                                setPatientsExpanded(false) // Close other dropdowns
                                setDoctorExpanded(false)
                            }}
                            className={`w-full sidebar-item ${
                                isInvoiceActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                            }`}
                        >
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isInvoiceActive ? 'text-white' : 'text-gray-600'}`} />
                            {(isOpen || isMobile) && (
                                <>
                                    <span className={`font-medium flex-1 text-left text-sm sm:text-base ${isInvoiceActive ? 'text-white' : 'text-gray-700'}`}>
                                        {item.name}
                                    </span>
                                    <ChevronDown 
                                        className={`w-4 h-4 transition-transform ${
                                            invoiceExpanded ? 'rotate-180' : ''
                                        } ${isInvoiceActive ? 'text-white' : 'text-gray-600'}`}
                                    />
                                </>
                            )}
                        </button>

                        {/* Invoice Child Items */}
                        {(isOpen || isMobile) && invoiceExpanded && (
                            <div className="mt-1 space-y-1">
                                {item.children.map((child, childIndex) => {
                                    const ChildIcon = child.icon;
                                    const isChildActive = pathname === child.path;
                                    // Use the purple style from the Patient submenu for consistency
                                    const colorClass = isChildActive ? 'text-purple-700' : 'text-gray-500';
                                    const bgClass = isChildActive ? 'bg-purple-50' : 'hover:bg-gray-50';

                                    return (
                                        <button
                                            key={child.path}
                                            onClick={() => handleNavigation(child.path)}
                                            className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 ml-3 sm:ml-4 ${
                                                bgClass
                                            } text-gray-600`}
                                        >
                                            <ChildIcon className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${colorClass}`} />
                                            <span className={`text-xs sm:text-sm font-medium ${isChildActive ? 'text-purple-700' : 'text-gray-700'}`}>
                                                {child.name}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            }


            // Special handling for Doctors menu item - (Was empty, keeping it clean)
            
            // -----------------------------------------------------------
            // REGULAR MENU ITEMS
            // -----------------------------------------------------------
            return (
              <button
                key={item.path}
                onClick={() => {
                    handleNavigation(item.path)
                    // Ensure the state update here doesn't overwrite the pathname check on re-render
                    // We keep this to ensure the dropdowns close when navigating to a non-dropdown path.
                    setPatientsExpanded(false) 
                    setInvoiceExpanded(false)
                }}
                className={`w-full sidebar-item ${
                  isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                {(isOpen || isMobile) && (
                  <span className={`font-medium text-sm sm:text-base ${isActive ? 'text-white' : 'text-gray-700'}`}>
                    {item.name}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Version Info at Bottom */}
        {(isOpen || isMobile) && (
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">Version 1.0.0</p>
            <p className="text-xs text-gray-400 text-center">© 2025 Clinic Portal</p>
          </div>
        )}
      </aside>
    </>
  )
}