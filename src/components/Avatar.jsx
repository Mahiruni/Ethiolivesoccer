export default function Avatar({ seed = 'fan', size = 38 }) {
  const text = String(seed || 'fan').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'F';
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {text}
    </span>
  );
}
