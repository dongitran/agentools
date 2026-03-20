---
name: react-nextjs-patterns
description: React and Next.js App Router best practices, performance patterns, and component design
tags: [react, nextjs, frontend, typescript, performance]
triggers:
  - file: next.config.js
  - file: next.config.ts
  - file: next.config.mjs
  - package: next
---

# React & Next.js Patterns

> Áp dụng cho các dự án dùng React 18+, Next.js App Router. Tập trung vào performance và maintainability.

## Component Design

- Prefer **Server Components** by default, use `"use client"` chỉ khi cần interactivity
- Co-locate state với component cần nó nhất — tránh prop drilling qua nhiều tầng
- Extract custom hooks khi một component có logic phức tạp hơn 3 state variables

## Data Fetching

- Dùng **async Server Components** để fetch data trực tiếp thay vì `useEffect` + `useState`
- Cache data fetching ở Server Component level với `fetch()` và Next.js cache tags
- Dùng `Suspense` + `loading.tsx` cho progressive UI

```tsx
// ✅ Đúng: async Server Component
async function ProductList() {
  const products = await fetchProducts(); // direct fetch, no useEffect
  return <ul>{products.map(p => <li>{p.name}</li>)}</ul>;
}

// ❌ Sai: useEffect trong Client Component cho server data
function ProductList() {
  const [products, setProducts] = useState([]);
  useEffect(() => { fetchProducts().then(setProducts); }, []);
}
```

## Performance

- Dùng `next/image` thay vì `<img>` — tự động optimize và lazy load
- Dynamic import `next/dynamic` cho heavy components không cần SSR
- Tránh large Client Components — chỉ wrap phần cần interact trong `"use client"`

## State Management

- `useState` + `useReducer` cho local state
- `useContext` cho shared state không thay đổi thường xuyên
- Tránh global state (Redux, Zustand) trừ khi thực sự cần — Next.js cache đủ cho phần lớn use cases
