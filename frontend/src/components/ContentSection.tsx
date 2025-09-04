import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Content } from '../types';
import { ContentCard } from './ContentCard';

interface ContentSectionProps {
  title: string;
  content: Content[];
  onContentClick: (content: Content) => void;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  title,
  content,
  onContentClick
}) => {
  const scrollContainer = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainer.current) {
      const scrollAmount = 300;
      const currentScroll = scrollContainer.current.scrollLeft;
      scrollContainer.current.scrollTo({
        left: currentScroll + (direction === 'right' ? scrollAmount : -scrollAmount),
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
          <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={() => scroll('left')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainer}
          className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {content.map((item) => (
            <div key={item.id} className="flex-shrink-0">
              <ContentCard content={item} onClick={() => onContentClick(item)} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};