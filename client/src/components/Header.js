import React from 'react';
import { NavLink } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          <img src="/images/下載.png" alt="Amaze Logo" className="logo-small" />
          <NavLink to="/" className="logo-text">
            Amaze 預約系統
          </NavLink>
        </div>
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
      <div className="header-center">
        <img src="/images/AMAZING_Black_Logo-cf8f90846cf0d510afcc4be40c40744027efbca2d317c479243da964b7e2b486.svg" alt="Amaze" className="logo-large" />
      </div>
    </header>
  );
};

export default Header; 