import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Header.css";

export default function Header({ title = "Museum Voice", showBack = false, onBack }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate(-1);
        }
    };
    
    // Show back button if not on home page
    const shouldShowBack = showBack || location.pathname !== '/';
    
    return (
        <>
            <header className="header" role="banner" aria-label="Site header">
                {shouldShowBack && (
                    <button className="header-back" onClick={handleBack} aria-label="Retour">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6"/>
                        </svg>
                        <span>Retour</span>
                    </button>
                )}
                <h1 className="header-title">{title}</h1>
            </header>
            <div className="header-spacer" />
        </>
    );
}