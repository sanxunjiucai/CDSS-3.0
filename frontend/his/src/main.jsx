import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// 监听 HIS postMessage（患者上下文推送）
import { usePatientStore } from './stores/patient'
window.addEventListener('message', (event) => {
  if (event.data?.type === 'CDSS_PATIENT_CONTEXT') {
    usePatientStore.getState().setContextFromHIS(event.data.payload)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename="/his">
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
