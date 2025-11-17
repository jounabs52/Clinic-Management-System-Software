// app/layout.js
import './globals.css'

export const metadata = {
  title: 'Gynecology Clinic - Admin Portal',
  description: 'Professional Gynecology Clinic Management System',
}

// app/layout.js 

// You might need to adjust the import path based on your exact file structure
import { Toaster } from 'react-hot-toast'; 

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>{/* Your head content */}</head>
      <body>
        {children}
        {/*
          ⭐⭐ PLACE THE TOASTER HERE ⭐⭐
          It renders in a fixed position, outside of the main content flow.
        */}
        <Toaster 
            position="top-right" // You can set a default position
            toastOptions={{ 
                // Style toasts universally here
                duration: 3000,
            }}
        />
      </body>
    </html>
  );
}
