import React from 'react';
import { Star, Info } from 'lucide-react';
import { Content } from '../types';

interface ContentCardProps {
  content: Content;
  onClick: (content: Content) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({ content, onClick }) => {
  // Default poster image
  const DEFAULT_POSTER = "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png";
  
  // Helper function to get poster URL with fallback
  const getPosterUrl = (posterUrl: string | null | undefined): string => {
    if (posterUrl && posterUrl.trim() !== '') {
      return posterUrl;
    }
    return DEFAULT_POSTER;
  };

  return (
    <div className="w-64 md:w-96 cursor-pointer group" onClick={() => onClick(content)}>
      <div className="relative overflow-hidden rounded-lg shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2">
        <div className="aspect-[2/3] relative">
          <img
            src={getPosterUrl(content.poster)}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              // Additional fallback in case the default placeholder also fails
              e.currentTarget.src = DEFAULT_POSTER;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-indigo-600 rounded-full p-3">
              <Info className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* Content info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-8 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="font-bold text-sm mb-1 line-clamp-2">{content.title}</h3>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{content.year}</span>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span>{content.rating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};