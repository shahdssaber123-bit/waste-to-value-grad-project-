import React from 'react';

export default function ImageBreaker({ src, alt, overlay, children }) {
  return (
    <section className="relative h-[300px] sm:h-[400px] overflow-hidden">
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div className={`absolute inset-0 ${overlay || 'bg-gradient-to-t from-background/80 to-transparent'}`} />
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </section>
  );
}