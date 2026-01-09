/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 可以在这里扩展自定义字体或颜色
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 👈 新增这一行
  ],
}