const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ['./index.html', './assets/js/**/*.js'],
  darkMode: ['variant', [
    '@media (prefers-color-scheme: dark) { &:not(:is([data-theme=light], [data-theme=light] *)) }',
    '&:is([data-theme=dark], [data-theme=dark] *)'
  ]],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        ink: token('ink'),
        muted: token('muted'),
        subtle: token('subtle'),
        line: token('line'),
        lime: token('lime'),
        'lime-ink': token('lime-ink'),
        violet: token('violet'),
        hero: token('hero'),
        income: token('income'),
        'income-soft': token('income-soft'),
        expense: token('expense'),
        'expense-soft': token('expense-soft'),
        warn: token('warn'),
        'warn-soft': token('warn-soft'),
        info: token('info'),
        'info-soft': token('info-soft')
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      borderRadius: {
        '4xl': '2rem'
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.04), 0 10px 30px -18px rgb(var(--shadow) / 0.22)',
        pop: '0 18px 40px -16px rgb(var(--shadow) / 0.35)',
        nav: '0 12px 32px -12px rgb(var(--shadow) / 0.35)'
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }]
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pop: { '0%': { transform: 'scale(.96)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } }
      },
      animation: {
        shimmer: 'shimmer 1.4s infinite',
        pop: 'pop .18s ease-out',
        rise: 'rise .28s ease-out both'
      }
    }
  },
  plugins: []
};
