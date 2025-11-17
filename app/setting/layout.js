// app/settings/layout.js
'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function SettingsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'loading@clinic.com',
    role: 'User'
  })
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    window.addEventListener('resize', checkMobile)
    checkMobile()

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setUser({
          name: parsedUser.name || parsedUser.email.split('@')[0],
          email: parsedUser.email,
          role: parsedUser.role || 'User'
        })
      } else {
        setUser({
          name: 'Admin',
          email: 'admin@clinic.com',
          role: 'Administrator'
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setUser({
        name: 'Guest',
        email: 'guest@clinic.com',
        role: 'Guest'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isMobile={isMobile}
      />
      
      <div 
        className={`flex-1 transition-all duration-300 ${
          isMobile 
            ? '' 
            : (sidebarOpen ? 'ml-64' : 'ml-20')
        }`}
      >
        <Header 
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />
        
        <main>
          {loading ? (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading Settings...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30"
        />
      )}
    </div>
  )
}