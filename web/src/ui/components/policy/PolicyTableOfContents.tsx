'use client';

import React, { useEffect, useState } from 'react';
import { PolicySection } from '../../data/policiesData';

interface PolicyTableOfContentsProps {
  sections: PolicySection[];
}

export const PolicyTableOfContents: React.FC<PolicyTableOfContentsProps> = ({ sections }) => {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        const element = document.getElementById(sec.id);
        if (element) {
          const top = element.offsetTop;
          if (scrollPosition >= top) {
            setActiveId(sec.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveId(id);
    }
  };

  return (
    <div className="hidden xl:block w-72 2xl:w-80 flex-shrink-0">
      <div className="sticky top-20 space-y-3.5 p-5 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 pb-2 border-b border-stone-100 dark:border-stone-800">
          <span className="material-symbols-outlined text-base text-emerald-700">format_list_bulleted</span>
          <span>Mục lục nội dung</span>
        </div>
        <nav className="space-y-1.5">
          {sections.map((section, idx) => {
            const isActive = activeId === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => scrollToSection(e, section.id)}
                className={`block text-[13px] leading-snug py-2 px-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-900 dark:text-emerald-200 font-semibold bg-emerald-50 dark:bg-emerald-950/50 pl-3.5 border-l-4 border-emerald-700'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <span className="opacity-60 mr-1.5 font-bold">{idx + 1}.</span>
                {section.title.replace(/^\d+\.\s*/, '')}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
