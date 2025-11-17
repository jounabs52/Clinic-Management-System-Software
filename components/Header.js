// components/Header.js
'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu, LogOut, User, Settings as SettingsIcon } from 'lucide-react'
import { supabase, appointmentsAPI, settingsAPI } from '@/lib/supabase'
import ProfileModal from './ProfileModal' // Import the ProfileModal component

export default function Header({ user, sidebarOpen, setSidebarOpen, isMobile }) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false) // Add state for profile modal
  const [currentUser, setCurrentUser] = useState(user) // Add state for current user
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [clinicSettings, setClinicSettings] = useState(null)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load clinic settings
  useEffect(() => {
    loadClinicSettings()
  }, [])

  // Load notifications from appointments
  useEffect(() => {
    loadNotifications()
    
    // Set up real-time subscription for appointments
    const appointmentsChannel = supabase
      .channel('header-notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'appointments' 
      }, () => {
        loadNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(appointmentsChannel)
    }
  }, [])

  const loadClinicSettings = async () => {
    try {
      const settings = await settingsAPI.getSettings()
      setClinicSettings(settings)
    } catch (error) {
      console.error('Error loading clinic settings:', error)
    }
  }

  const loadNotifications = async () => {
    try {
      const appointmentsData = await appointmentsAPI.getAll()
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const notificationList = []

      // Today's appointments
      const todayAppointments = appointmentsData.filter(a => 
        a.appointment_date === todayStr && 
        (a.status === 'Scheduled' || a.status === 'Confirmed')
      )
      
      if (todayAppointments.length > 0) {
        notificationList.push({
          id: 'today-appointments',
          text: `${todayAppointments.length} appointment${todayAppointments.length > 1 ? 's' : ''} scheduled for today`,
          time: 'Today',
          unread: true,
          type: 'appointment'
        })
      }

      // Tomorrow's appointments
      const tomorrowAppointments = appointmentsData.filter(a => 
        a.appointment_date === tomorrowStr
      )
      
      if (tomorrowAppointments.length > 0) {
        notificationList.push({
          id: 'tomorrow-appointments',
          text: `${tomorrowAppointments.length} appointment${tomorrowAppointments.length > 1 ? 's' : ''} scheduled for tomorrow`,
          time: 'Tomorrow',
          unread: true,
          type: 'appointment'
        })
      }

      // Recent appointments (last 3 created/updated)
      const recentAppointments = [...appointmentsData]
        .sort((a, b) => new Date(b.created_at || b.appointment_date) - new Date(a.created_at || a.appointment_date))
        .slice(0, 2)

      recentAppointments.forEach(apt => {
        const timeAgo = getTimeAgo(apt.created_at || apt.appointment_date)
        notificationList.push({
          id: `apt-${apt.id}`,
          text: `Appointment ${apt.status.toLowerCase()}: ${apt.patient_name} with Dr. ${apt.doctor_name}`,
          time: timeAgo,
          unread: isRecent(apt.created_at || apt.appointment_date),
          type: 'appointment'
        })
      })

      // Pending/Unconfirmed appointments
      const pendingAppointments = appointmentsData.filter(a => 
        a.status === 'Scheduled' && 
        new Date(a.appointment_date) >= today
      ).length

      if (pendingAppointments > 0) {
        notificationList.push({
          id: 'pending-appointments',
          text: `${pendingAppointments} appointment${pendingAppointments > 1 ? 's' : ''} pending confirmation`,
          time: 'Pending',
          unread: true,
          type: 'reminder'
        })
      }

      setNotifications(notificationList.slice(0, 10))
      setUnreadCount(notificationList.filter(n => n.unread).length)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isRecent = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const hoursDiff = (now - date) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const handleNotificationClick = (notification) => {
    if (notification.type === 'appointment') {
      router.push('/appointments')
      setShowNotifications(false)
    }
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })))
    setUnreadCount(0)
  }

  // Handler for profile updates
  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser)
    // You can also trigger a refresh of other components here if needed
  }

  // Get current date and time
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Use clinic name from settings if available
  const displayName = currentUser?.name || clinicSettings?.clinicName || 'Admin'

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 md:py-4">
          {/* Left Section - Menu Button (Mobile) and Welcome */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Mobile Menu Toggle */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 truncate">
                Welcome back, {displayName}!
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block truncate">
                {currentDate}, {currentTime}
              </p>
              <p className="text-xs text-gray-500 sm:hidden">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {currentTime}
              </p>
            </div>
          </div>

          {/* Right Section - Notifications & User */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full">
                    <span className="absolute inset-0 bg-red-500 rounded-full animate-ping"></span>
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 animate-slide-up z-50">
                  <div className="p-3 sm:p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800">Notifications</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-600 font-medium">
                          {unreadCount} new
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-gray-600 hover:text-purple-600"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                            notif.unread ? 'bg-purple-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {notif.unread && (
                              <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5 flex-shrink-0"></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm text-gray-800">{notif.text}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 text-center border-t border-gray-200">
                    <button 
                      onClick={() => {
                        router.push('/appointments')
                        setShowNotifications(false)
                      }}
                      className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      View all appointments
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm sm:text-base">
                    {(currentUser?.name || displayName)?.charAt(0) || 'A'}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                    {currentUser?.name || displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {currentUser?.role || 'Administrator'}
                  </p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 animate-slide-up z-50">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-medium text-gray-800 truncate">{currentUser?.name || displayName}</p>
                    <p className="text-sm text-gray-500 truncate">{currentUser?.email || clinicSettings?.email || 'admin@clinic.com'}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowProfileModal(true) // Open profile modal
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/setting')
                        setShowUserMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      <span className="text-sm">Settings</span>
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={currentUser}
        onUpdate={handleProfileUpdate}
      />
    </>
  )
}