"use client";

import React from 'react';
import './Sidebar.css'; // Import the CSS file for styling

const Sidebar = () => {
  return (
    <nav className="sidebar">
      {/* Top Section */}
      <ul className="sidebar-section top-section">
        <li className="nav-item"><a href="/main">Dashboard</a></li>
        <li className="nav-item"><a href="/main/search">Search</a></li>
      </ul>

      {/* Separator */}
      <hr className="sidebar-separator" />

      {/* Main Section */}
      <ul className="sidebar-section main-section">
        <li className="nav-item"><a href="/main/cutting">Cutting</a></li>
        <li className="nav-item"><a href="/main/sewing">Sewing</a></li>
        <li className="nav-item"><a href="/main/100-percent">100% Inspection</a></li>
        <li className="nav-item"><a href="/main/packing">Packing</a></li>
        <li className="nav-item"><a href="/main/operating-time">Operating Time</a></li>
      </ul>

      {/* Bottom Section (Pushed to the bottom) */}
      <ul className="sidebar-section bottom-section">
        <li className="nav-item signin"><a href="/auth/signin">Sign Out</a></li>
      </ul>
    </nav>
  );
};

export default Sidebar;