module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: 'var(--bg-main)',
        surface: 'var(--bg-surface)',
        ink: 'var(--text-main)',
        brand: 'var(--primary)',
        muted: 'var(--text-muted)',
      },
    },
  },
  plugins: [],
};
