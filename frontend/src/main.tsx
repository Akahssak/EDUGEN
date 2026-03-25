import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import App from './App'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Hardcode the Client ID directly into the code to ensure it is always present in production
const googleClientId = "417182243430-iio6ndabti96kaqr6eqh9golk6b2ev3i.apps.googleusercontent.com";

// Debugging log (seen in browser console)
console.log("EduGen Authentication Initialized with Client ID:", googleClientId.substring(0, 10) + "...");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <Provider store={store}>
        <App />
      </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
