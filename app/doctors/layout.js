// app/patients/layout.js or app/dashboard/layout.js (assuming this is a high-level layout)
'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase' // Assuming this file exists and is correctly configured

export default function PatientsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'loading@clinic.com',
    role: 'User'
  })
  const [loading, setLoading] = useState(true)

  // Determine if it's a mobile view (simple check, often better to use media queries/hooks)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Initial check and setup listener for window resize
    const checkMobile = () => {
      // Use a common mobile breakpoint, e.g., 1024px (lg in Tailwind)
      setIsMobile(window.innerWidth < 1024) 
      if (window.innerWidth < 1024) {
        setSidebarOpen(false) // Close sidebar by default on mobile
      } else {
        setSidebarOpen(true) // Open sidebar by default on desktop
      }
    }

    window.addEventListener('resize', checkMobile)
    checkMobile() // Initial check

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    // ... (rest of your fetchUserData function remains the same)
    // The issue might be that your Supabase auth is not active or you need to read from localStorage first.
    // I'll assume the provided Supabase logic is correct for now, as the Header issue is also prop-related.

    try {
      // Try to get user from localStorage first (after a successful login)
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setUser({
          name: parsedUser.name || parsedUser.email.split('@')[0],
          email: parsedUser.email,
          role: parsedUser.role || 'User'
        })
        setLoading(false)
        return // Skip Supabase if user is in localStorage
      }
      
      // If not in localStorage, proceed with Supabase fetch (original logic)
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      
      if (authUser) {
        // ... (rest of Supabase logic)
        // I will assume the name fetching logic is what you had:
         const userDisplayName = authUser.user_metadata?.name || authUser.email.split('@')[0];
         const userRole = authUser.user_metadata?.role || 'User';

         setUser({
            name: userDisplayName,
            email: authUser.email,
            role: userRole
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
      {/* Sidebar - Pass props to handle collapse/mobile behavior */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isMobile={isMobile}
      />
      
      {/* Main Content */}
      <div 
        className={`flex-1 transition-all duration-300 ${
            isMobile 
              ? '' // No margin on mobile
              : (sidebarOpen ? 'ml-64' : 'ml-20') // Dynamic margin on desktop
        }`}
      >
        {/* Header - Pass all necessary props */}
        <Header 
          user={user}
          sidebarOpen={sidebarOpen} // ADDED: current sidebar state
          setSidebarOpen={setSidebarOpen} // ADDED: function to change sidebar state
          isMobile={isMobile} // ADDED: mobile state
        />
        
        {/* Page Content */}
        <main className="p-4 sm:p-6"> {/* Adjusted padding for consistency */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30"
        />
      )}
    </div>
  )
}