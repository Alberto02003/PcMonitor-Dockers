import { useEffect, useState } from 'react'
import SplashPage from '../../pages/SplashPage/SplashPage.jsx'
import SelectionPage from '../../pages/SelectionPage/SelectionPage.jsx'
import './App.css'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timerId = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timerId)
  }, [])

  return showSplash ? <SplashPage /> : <SelectionPage />
}

export default App
