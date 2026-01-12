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
  const [allowAutoConnect, setAllowAutoConnect] = useState(true)

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
            onBack={() => {
              setAllowAutoConnect(false)
              setCurrentPage('selection')
            }}
          />
        ) : (
          <SelectionPage
            onConnect={(connection) => {
              setActiveConnection(connection)
              setCurrentPage('monitoring')
              setAllowAutoConnect(false)
            }}
            allowAutoConnect={allowAutoConnect}
            onAutoConnectUsed={() => setAllowAutoConnect(false)}
          />
        )}
      </NotificationProvider>
    </SettingsProvider>
  )
}

export default App
