export default function Avatar({ seed = 'fan', size = 38 }) {
  const text = String(seed || 'fan').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || 'F';
  let hue = 0;
  for (const char of String(seed)) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, background: `linear-gradient(145deg,hsl(${hue} 66% 49%),hsl(${(hue + 38) % 360} 58% 30%))` }}>
      {text}
    </span>
  );
}
