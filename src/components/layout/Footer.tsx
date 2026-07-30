import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white mt-6">
      <div className="container mx-auto px-4 py-6 text-center">
        <div className="font-display text-lg">Comedoria da Tata</div>
        <div className="text-sm mt-2">Endereço fictício • Telefone fictício</div>
        <div className="text-xs mt-3">© {new Date().getFullYear()} Comedoria da Tata</div>
      </div>
    </footer>
  );
}
