// Must be CJS — Turbopack cannot resolve @tailwindcss/postcss from an ESM config.
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
