import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Chat from './pages/Chat';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';

function App() {
    const user = useSelector((state: any) => state.auth.user);

    return (
        <BrowserRouter>
            <Routes>
                {/* Landing page — always accessible */}
                <Route path="/" element={<Landing />} />

                {/* Login — redirect to dashboard if already logged in */}
                <Route
                    path="/login"
                    element={!user ? <Login /> : <Navigate to="/dashboard" />}
                />

                {/* Dashboard — Workspace Selector */}
                <Route
                    path="/dashboard"
                    element={user ? <Dashboard /> : <Navigate to="/login" />}
                />

                {/* Chat/Canvas — redirect to login if not logged in */}
                <Route
                    path="/chat"
                    element={user ? <Chat /> : <Navigate to="/login" />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
