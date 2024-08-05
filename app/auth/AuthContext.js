// app/firebase/AuthContext.js
import { createContext } from 'react';

const AuthContext = createContext({
    user: null,
    loading: true,
    login: async (email, password) => {},
    signup: async (email, password) => {},
    logout: async () => {},
});

export default AuthContext;
