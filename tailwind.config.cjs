module.exports = {
  content: ['./src/app/**/*.{ts,tsx,js,jsx}', './src/components/**/*.{ts,tsx,js,jsx}', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#2A140F',
        'brand-brown': '#6B3A1A',
        'brand-orange': '#F58634',
        'brand-beige': '#F7F2EC'
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
