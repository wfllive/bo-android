import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif', padding: 24 }}>
      <h1>Привет, React + Webpack</h1>
      <p>Счётчик: {count}</p>
      <button onClick={() => setCount((c) => c + 1)}>Увеличить</button>
    </div>
  );
}