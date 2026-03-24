import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    user: JSON.parse(localStorage.getItem('edugen_user')) || null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.user = action.payload;
            localStorage.setItem('edugen_user', JSON.stringify(action.payload));
        },
        logout: (state) => {
            state.user = null;
            localStorage.removeItem('edugen_user');
        },
    },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
