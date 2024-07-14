export default function ActionsButton({ onClick, children }) {
  return (
    <div className="actions">
      <button onClick={onClick}>{children}</button>
    </div>
  );
}
