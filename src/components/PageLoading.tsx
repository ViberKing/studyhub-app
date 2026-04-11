export default function PageLoading() {
  return (
    <div className="page active" style={{ padding: "32px 40px" }}>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" style={{ width: "60%" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 24 }}>
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </div>
    </div>
  );
}
