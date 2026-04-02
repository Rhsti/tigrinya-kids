export default function Button({ children, onClick, className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={`button-primary ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}