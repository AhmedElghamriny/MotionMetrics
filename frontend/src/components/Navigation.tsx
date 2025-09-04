import React from 'react';
import { AuthButton } from './AuthButton';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'movies', label: 'Movies' },
    { id: 'tv-shows', label: 'TV Shows' },
  ];

  return (
    <nav className="hidden md:flex items-center space-x-2">
      {navItems.map((item) => {
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              currentPage === item.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
      
      <div className="ml-4 pl-4 border-l border-slate-700">
        <AuthButton onPageChange={onPageChange} />
      </div>
    </nav>
  );
};