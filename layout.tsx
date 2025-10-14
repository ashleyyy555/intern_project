import React from 'react';
import Sidebar from '@/components/Sidebar'; // Import the Sidebar component
import './globals.css'; // Assuming you have a main app CSS file

export const metadata = {
  title: "App Dashboard",
  description: "Operations dashboard for the application.",
};

// The Root Layout component, which wraps the entire application
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex">
          {/* Render the integrated Sidebar component */}
          <Sidebar />
          
          {/* Main content area: ml-56 offsets the fixed 56-unit width of the sidebar */}
          <main className="flex-grow ml-56 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
