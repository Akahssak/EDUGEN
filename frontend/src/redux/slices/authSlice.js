import { createSlice } from '@reduxjs/toolkit';

const safeParse = (key) => {
    try {
        const item = localStorage.getItem(key);
        if (!item || item === 'undefined') return null;
        return JSON.parse(item);
    } catch (e) {
        console.error(`Auth persistence error for ${key}:`, e);
        return null;
    }
};

const initialState = {
    user: safeParse('edugen_user'),
    token: localStorage.getItem('edugen_token') || null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            const { user, access_token } = action.payload;
            state.user = user;
            state.token = access_token;
            localStorage.setItem('edugen_user', JSON.stringify(user));
            localStorage.setItem('edugen_token', access_token);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            localStorage.removeItem('edugen_user');
            localStorage.removeItem('edugen_token');
        },
    },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
