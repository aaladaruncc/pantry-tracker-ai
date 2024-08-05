"use client";

import { useState, useContext } from 'react';
import { Box, Button, TextField, Typography, Container, Stack } from '@mui/material';
import AuthContext from '../auth/AuthContext';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const { signup } = useContext(AuthContext);

    const handleSignup = async (event) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await signup(email, password);
            setSuccess('User registered successfully');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box mt={5}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Signup
                </Typography>
                <Box component="form" onSubmit={handleSignup}>
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
                            Signup
                        </Button>
                    </Stack>
                </Box>
                {error && (
                    <Typography color="error" mt={2}>
                        {error}
                    </Typography>
                )}
                {success && (
                    <Typography color="success" mt={2}>
                        {success}
                    </Typography>
                )}
            </Box>
        </Container>
    );
}
