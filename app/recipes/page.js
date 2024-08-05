"use client";

import RequireAuth from '../auth/RequireAuth';
import { useContext, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../firebase";
import AuthContext from "../auth/AuthContext";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Button } from '@mui/material';
import {useRouter} from "next/navigation";

const Recipes = () => {
    const [recipes, setRecipes] = useState([]);
    const { user } = useContext(AuthContext);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        const fetchRecipes = async () => {
            const recipesCollection = collection(firestore, 'users', user.uid, 'recipes');
            const recipesSnapshot = await getDocs(recipesCollection);
            const recipesList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecipes(recipesList);
        };

        fetchRecipes();
    }, [user]);

    return (
        <RequireAuth>
            <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" padding={2} gap={2}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Recipes Page
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Recipe Name</TableCell>
                                <TableCell>Ingredients</TableCell>
                                <TableCell>Instructions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {recipes.map((recipe) => (
                                <TableRow key={recipe.id}>
                                    <TableCell>{recipe.id}</TableCell>
                                    <TableCell>
                                        <ul>
                                            {Object.entries(recipe.ingredients).map(([ingredient, quantity]) => (
                                                <li key={ingredient}>{`${ingredient}: ${quantity}`}</li>
                                            ))}
                                        </ul>
                                    </TableCell>
                                    <TableCell>
                                        <ol>
                                            {recipe.instructions.map((instruction, index) => (
                                                <li key={index}>{instruction}</li>
                                            ))}
                                        </ol>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <Button onClick={() => router.push("/")}
                        variant="contained"
                        color="primary"
                        padding={2}
                >
                    Go back home
                </Button>
            </Box>
        </RequireAuth>
    );
};

export default Recipes;
