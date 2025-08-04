import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <NavLink to="/" className="logo">
          🎯 Amaze 預約系統
        </NavLink>
        <nav className="nav">
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <UserPlus size={18} style={{ marginRight: '6px' }} />
            線上預約
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header; 