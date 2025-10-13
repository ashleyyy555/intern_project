"use client";

import React from 'react';
import './Sidebar.css'; // Import the CSS file for styling

const Sidebar = () => {
  return (
    <nav className="sidebar">
      {/* Top Section */}
      <ul className="sidebar-section top-section">
        <li className="nav-item"><a href="/">Dashboard</a></li>
        <li className="nav-item"><a href="/search">Search</a></li>
      </ul>

      {/* Separator */}
      <hr className="sidebar-separator" />

      {/* Main Section */}
      <ul className="sidebar-section main-section">
        <li className="nav-item"><a href="/cutting">Cutting</a></li>
        <li className="nav-item"><a href="/sewing">Sewing</a></li>
        <li className="nav-item"><a href="/100-percent">100% Inspection</a></li>
        <li className="nav-item"><a href="/packing">Packing</a></li>
        <li className="nav-item"><a href="/operating-time">Operating Time</a></li>
      </ul>

      {/* Bottom Section (Pushed to the bottom) */}
      <ul className="sidebar-section bottom-section">
        <li className="nav-item signin"><a href="/signup">Sign Out</a></li>
      </ul>
    </nav>
  );
};

export default Sidebar;