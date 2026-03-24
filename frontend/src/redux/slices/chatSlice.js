import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    messages: [
        { role: 'assistant', content: `No greeting needed. Let's begin. Ask me a topic.` }
    ],
    isLoading: false,
    boardData: {
        title: "Welcome to EduGen",
        content: "<p>Select a topic to start learning.</p>",
        visual_type: "none",
        visual_content: ""
    },
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setMessages: (state, action) => {
            state.messages = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
        },
        setIsLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setBoardData: (state, action) => {
            state.boardData = action.payload;
        },
    },
});

export const { setMessages, addMessage, setIsLoading, setBoardData } = chatSlice.actions;
export default chatSlice.reducer;
