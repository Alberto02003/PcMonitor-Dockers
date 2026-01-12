import './SelectionLoading.css'

function SelectionLoading({ message = 'Cargando conexiones...' }) {
  return (
    <div className="selection-loading">
      <div className="loading-spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}

export default SelectionLoading
