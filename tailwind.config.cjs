module.exports = {
  content: ["./src/app/**/*.{ts,tsx,js,jsx}", "./src/components/**/*.{ts,tsx,js,jsx}", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brandDark: '#2A140F',
        brandBrown: '#6B3A1A',
        brandOrange: '#F58634',
        brandBeige: '#F7F2EC'
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
};
