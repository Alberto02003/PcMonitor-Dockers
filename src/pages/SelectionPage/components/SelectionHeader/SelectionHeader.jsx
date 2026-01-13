import { useTranslation } from '../../../../hooks/useTranslation.jsx'
import './SelectionHeader.css'

function SelectionHeader({ isEditing }) {
  const { t } = useTranslation()

  return (
    <header className="main-header">
      <div>
        <h2 className="main-title">{isEditing ? t('selection.editConnection') : t('selection.newConnection')}</h2>
        <p className="header-hint">{t('selection.headerHint')}</p>
      </div>
    </header>
  )
}

export default SelectionHeader
