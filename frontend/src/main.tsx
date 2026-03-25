import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import App from './App'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        <App />
      </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
