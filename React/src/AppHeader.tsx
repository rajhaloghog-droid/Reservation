export default function AppHeader({
  title,
  onLogout,
}: {
  title: string
  onLogout: () => void
}) {
  return (
    <header
      style={{
        backgroundColor: '#17402A',
        color: 'white',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>{title}</h1>
      <button
        onClick={onLogout}
        style={{
          backgroundColor: '#B67E7D',
          color: 'white',
          border: 'none',
          padding: '10px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'background-color 0.3s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#a06363'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#B67E7D'
        }}
      >
        Log Out
      </button>
    </header>
  )
}
