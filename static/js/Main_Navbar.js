import React, { useState, useEffect, useRef } from "react";
import Modal from "./modals";
import { FaUserCircle, FaChevronDown, FaBars } from "react-icons/fa";

const Navbar = ({ notebook, currentScreenIndex, handleSelectScreen }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Function to scroll to the top of the content section
  const scrollToTop = () => {
    const contentSection = document.getElementById("learn");
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Function to handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Handlers for Previous and Next buttons
  const handlePrevious = () => {
    if (currentScreenIndex > 0) {
      handleSelectScreen(currentScreenIndex - 1);  // Update index
      setTimeout(scrollToTop, 100); // Ensure smooth scrolling after DOM updates
    }
  };

  const handleNext = () => {
    if (currentScreenIndex < notebook.length - 1) {
      handleSelectScreen(currentScreenIndex + 1);  // Update index
      setTimeout(scrollToTop, 100); // Ensure smooth scrolling after DOM updates
    }
  };

  return (
    <nav className="navbar">
      {/* Navbar Brand */}
      <div className="navbar-brand-container">
        <a href="#" className="navbar-brand">
          Learn Paths
        </a>
      </div>

      {/* Middle Section with Previous, Topics, and Next Buttons */}
      <div className="navbar-middle">
        <button 
          className="nav-btn prev-btn" 
          onClick={handlePrevious} 
          disabled={currentScreenIndex === 0}
        >
          Previous
        </button>

        <button className="outline-button" onClick={() => setIsModalOpen(true)}>
          <FaBars className="icon" /> Topics
        </button>

        <button 
          className="nav-btn next-btn" 
          onClick={handleNext} 
          disabled={currentScreenIndex === notebook.length - 1}
        >
          Next
        </button>
      </div>

      {/* Right Section - User Icon with Dropdown */}
      <div ref={dropdownRef} className="nav-user" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
        <FaUserCircle className="user-icon" />
        <FaChevronDown className="dropdown-arrow" />

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <ul className="dropdown-menu">
            <li className="dropdown-item">Profile</li>
            <li className="dropdown-item">Account</li>
            <li className="dropdown-item">Subscription</li>
            <li className="dropdown-item promo">Give 20%, Get $20</li>
            <li className="dropdown-item">Teams</li>
            <li className="dropdown-item">Help Center</li>
            <li className="dropdown-item logout">Logout</li>
          </ul>
        )}
      </div>

      {/* Modal Component */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Select a topic">
        <ul className="modal-list">
          {notebook.map((screen, index) => (
            <li 
              key={index} 
              className={`modal-list-item ${currentScreenIndex === index ? "selected" : ""}`}
              onClick={() => handleSelectScreen(index)}  // Pass index directly
            >
              {screen.title || `Screen ${index + 1}`}
            </li>
          ))}
        </ul>
      </Modal>
    </nav>
  );
};

export default Navbar;
