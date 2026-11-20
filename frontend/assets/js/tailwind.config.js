/* Tailwind Play CDN theme — shared by every page. */
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6fe', 200: '#bfd3fe', 300: '#93b4fd', 400: '#6090fa',
          500: '#3b6ef6', 600: '#2552eb', 700: '#1d3fd8', 800: '#1e35af', 900: '#1e328a', 950: '#172154',
        },
      },
    },
  },
};
