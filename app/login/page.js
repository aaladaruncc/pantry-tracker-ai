"use client";

import { useState, useContext } from 'react';
import { Box, Button, TextField, Typography, Container, Stack } from '@mui/material';
import AuthContext from '../auth/AuthContext';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const { login } = useContext(AuthContext);
    const router = useRouter();

    const handleLogin = async (event) => {
        event.preventDefault();
        setError(null);

        try {
            await login(email, password);
            router.push('/'); // Redirect to the home page after login
        } catch (error) {
            setError(error.message);
        }
    };

    const switchToSignUp = () => {
        router.push('/signup');
    };

    return (
        <Container maxWidth="sm">
            <Box mt={5}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Login
                </Typography>
                <Box component="form" onSubmit={handleLogin}>
                    <Stack spacing={2}>
                        <TextField
                            required
                            fullWidth
                            label="Email"
                            variant="outlined"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            required
                            fullWidth
                            label="Password"
                            type="password"
                            variant="outlined"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button type="submit" variant="contained" color="primary">
                            Login
                        </Button>
                        <Button onClick={switchToSignUp} variant="outlined">
                            Sign Up
                        </Button>
                    </Stack>
                </Box>
                {error && (
                    <Typography color="error" mt={2}>
                        {error}
                    </Typography>
                )}
            </Box>
        </Container>
    );
}
