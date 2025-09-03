import plugin from 'tailwindcss/plugin';
const uiThemePlugin = plugin(
  function () {
    // add tailwind components here
    // also can add in tailwind.css
  },
  {
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#22378c',
            100: '#d3d7e8',
            200: '#a7afd1',
            300: '#7a87ba',
            400: '#4e5fa3',
            500: '#22378c', // base
            600: '#1b2c70',
            700: '#142154',
            800: '#0e1638',
            900: '#070b1c',
          },
          secondary: {
            DEFAULT: '#efe513',
            100: '#fcfad0',
            200: '#f9f5a1',
            300: '#f5ef71',
            400: '#f2ea42',
            500: '#efe513', // base
            600: '#bfb70f',
            700: '#8f890b',
            800: '#605c08',
            900: '#302e04',
          },
          error: {
            DEFAULT: '#f34e4e',
            100: '#fddcdc',
            200: '#fab8b8',
            300: '#f89595',
            400: '#f57171',
            500: '#f34e4e', // base
            600: '#c23e3e',
            700: '#922f2f',
            800: '#611f1f',
            900: '#311010',
          },
          black: '#282828',
          grey: {
            light: '#F6F7F8',
            50: '#FBFCFD',
            100: '#F6F7F8',
            200: '#e1e1e1',
            300: '#D2D2D2',
            dark: '#D2D2D2',
            400: '#c2c2c2',
            500: '#b3b3b3',
            darker: '#b3b3b3',
            600: '#8f8f8f',
            650: '#767676', // inactive tab color
            tab: '#767676',
            700: '#6b6b6b',
            800: '#484848',
            900: '#242424',
          },
        },
        keyframes: {
          slideUpAndFade: {
            '0%': { opacity: 0, transform: 'translateY(2px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
          slideRightAndFade: {
            '0%': { opacity: 0, transform: 'translateX(-2px)' },
            '100%': { opacity: 1, transform: 'translateX(0)' },
          },
          slideDownAndFade: {
            '0%': { opacity: 0, transform: 'translateY(-2px)' },
            '100%': { opacity: 1, transform: 'translateY(0)' },
          },
          slideLeftAndFade: {
            '0%': { opacity: 0, transform: 'translateX(2px)' },
            '100%': { opacity: 1, transform: 'translateX(0)' },
          },
          slideInFromRight: {
            '0%': { opacity: 0, transform: 'translateX(100%)' },
            '100%': { opacity: 1, transform: 'translateX(0)' },
          },
          slideOutToLeft: {
            '0%': { opacity: 1, transform: 'translateX(0)' },
            '100%': { opacity: 0, transform: 'translateX(100%)' },
          },
        },
        animation: {
          slideUpAndFade: 'slideUpAndFade 300ms cubic-bezier(0.16, 0, 0.13, 1)',
          slideDownAndFade: 'slideDownAndFade 300ms cubic-bezier(0.16, 0, 0.13, 1)',
          slideRightAndFade: 'slideRightAndFade 300ms cubic-bezier(0.16, 0, 0.13, 1)',
          slideLeftAndFade: 'slideLeftAndFade 300ms cubic-bezier(0.16, 0, 0.13, 1)',
          slideInFromRight: 'slideInFromRight 300ms cubic-bezier(0.16, 0, 0.13, 1)',
          slideOutToLeft: 'slideOutToLeft 800ms cubic-bezier(0.16, 0, 0.13, 1) forwards',
        },
        fontFamily: {
          signika: ['Signika Negative', 'sans'],
          opensans: ['Open Sans', 'sans'],
        },
        screens: {
          xs: '281px', // Add a new breakpoint named 'xs' at 400px
        },
        boxShadow: {
          't-sm': '0 -1px 2px 0 rgba(0, 0, 0, 0.05)',
          't-md': '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          't-lg': '0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          't-xl': '0 -20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          't-2xl': '0 -25px 50px -12px rgba(0, 0, 0, 0.25)',
          't-3xl': '0 -35px 60px -15px rgba(0, 0, 0, 0.3)',
          'b-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          'b-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
          'b-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)',
          'b-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 -10px 10px -5px rgba(0, 0, 0, 0.04)',
          'b-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          'b-3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
          'l-sm': '-1px 0 2px 0 rgba(0, 0, 0, 0.05)',
          'l-md': '-4px 0 6px -1px rgba(0, 0, 0, 0.1), 2px 0 4px -1px rgba(0, 0, 0, 0.06)',
          'l-lg': '-10px 0 15px -3px rgba(0, 0, 0, 0.1), 4px 0 6px -2px rgba(0, 0, 0, 0.05)',
          'l-xl': '-20px 0 25px -5px rgba(0, 0, 0, 0.1), 10px 0 10px -5px rgba(0, 0, 0, 0.04)',
          'l-2xl': '-25px 0 50px -12px rgba(0, 0, 0, 0.25)',
          'l-3xl': '-35px 0 60px -15px rgba(0, 0, 0, 0.3)',
          'r-sm': '1px 0 2px 0 rgba(0, 0, 0, 0.05)',
          'r-md': '4px 0 6px -1px rgba(0, 0, 0, 0.1), -2px 0 4px -1px rgba(0, 0, 0, 0.06)',
          'r-lg': '10px 0 15px -3px rgba(0, 0, 0, 0.1), -4px 0 6px -2px rgba(0, 0, 0, 0.05)',
          'r-xl': '20px 0 25px -5px rgba(0, 0, 0, 0.1), -10px 0 10px -5px rgba(0, 0, 0, 0.04)',
          'r-2xl': '25px 0 50px -12px rgba(0, 0, 0, 0.25)',
          'r-3xl': '35px 0 60px -15px rgba(0, 0, 0, 0.3)',
          'all-sm': '0 0 2px 0 rgba(0, 0, 0, 0.05)',
          'all-md': '0 0 6px -1px rgba(0, 0, 0, 0.1), 0 0 4px -1px rgba(0, 0, 0, 0.06)',
          'all-lg': '0 0 15px -3px rgba(0, 0, 0, 0.1), 0 0 6px -2px rgba(0, 0, 0, 0.05)',
          'all-xl': '0 0 25px -5px rgba(0, 0, 0, 0.1), 0 0 10px -5px rgba(0, 0, 0, 0.04)',
          'all-2xl': '0 0 50px -12px rgba(0, 0, 0, 0.25)',
          'all-3xl': '0 0 60px -15px rgba(0, 0, 0, 0.3)',
        },
      },
    },
  }
);
export default uiThemePlugin;
