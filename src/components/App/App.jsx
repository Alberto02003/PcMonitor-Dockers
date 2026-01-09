import { useEffect, useState } from 'react'
import { NotificationProvider } from '../Notification/Notification.jsx'
import { SettingsProvider } from '../Settings/Settings.jsx'
import SplashPage from '../../pages/SplashPage/SplashPage.jsx'
import SelectionPage from '../../pages/SelectionPage/SelectionPage.jsx'
import MonitoringPage from '../../pages/MonitoringPage/MonitoringPage.jsx'
import './App.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeConnection, setActiveConnection] = useState(null)
  const [currentPage, setCurrentPage] = useState('selection')

  useEffect(() => {
    const timerId = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timerId)
  }, [])

  return (
    <SettingsProvider>
      <NotificationProvider>
        {showSplash ? (
          <SplashPage />
        ) : currentPage === 'monitoring' ? (
          <MonitoringPage
            connection={activeConnection}
            onBack={() => setCurrentPage('selection')}
          />
        ) : (
          <SelectionPage
            onConnect={(connection) => {
              setActiveConnection(connection)
              setCurrentPage('monitoring')
            }}
          />
        )}
      </NotificationProvider>
    </SettingsProvider>
  )
}

export default App
