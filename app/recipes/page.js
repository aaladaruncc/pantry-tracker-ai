"use client";

import RequireAuth from '../auth/RequireAuth';
import { useContext, useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { firestore } from "../firebase";
import AuthContext from "../auth/AuthContext";
import { Box, Typography, Button, Card, CardContent, CardActions, List, ListItem, ListItemText, Divider, Collapse, IconButton, Paper } from '@mui/material';
import { useRouter } from "next/navigation";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const Recipes = () => {
    const [recipes, setRecipes] = useState([]);
    const [expanded, setExpanded] = useState(null);
    const { user } = useContext(AuthContext);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        const fetchRecipes = async () => {
            const recipesCollection = collection(firestore, 'users', user.uid, 'recipes');
            const recipesQuery = query(recipesCollection, orderBy('createdAt', 'desc')); // Order by 'createdAt' field in descending order
            const recipesSnapshot = await getDocs(recipesQuery);
            const recipesList = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecipes(recipesList);
        };

        fetchRecipes();
    }, [user]);

    const handleExpandClick = (id) => {
        setExpanded(expanded === id ? null : id);
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString();
    };

    return (
        <RequireAuth>
            <Box display="flex" flexDirection="column" alignItems="center" padding={2} gap={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Recipes
                </Typography>
                <Box display="flex" flexDirection="column" gap={2} width="100%" maxWidth="800px">
                    {recipes.map((recipe) => (
                        <Card key={recipe.id} variant="outlined" sx={{ borderRadius: '12px', boxShadow: 3 }}>
                            <CardContent>
                                <Typography variant="h5" component="h2" gutterBottom>
                                    {
                                        recipe.id.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
                                    }
                                </Typography>
                                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                                    Created on: {formatDate(recipe.createdAt)}
                                </Typography>
                                <CardActions disableSpacing>
                                    <Button onClick={() => handleExpandClick(recipe.id)} variant="outlined" color="primary">
                                        {expanded === recipe.id ? "Collapse" : "Expand"}
                                    </Button>
                                    <IconButton onClick={() => handleExpandClick(recipe.id)}>
                                        {expanded === recipe.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                    </IconButton>
                                </CardActions>
                                <Collapse in={expanded === recipe.id} timeout="auto" unmountOnExit>
                                    <Box mt={2}>
                                        <Typography variant="h6"
                                                    component="h3"
                                                    gutterBottom
                                                    fontWeight='bold'
                                        >
                                            Ingredients:
                                        </Typography>
                                        <List>
                                            {Object.entries(recipe.ingredients).map(([ingredient, quantity]) => (
                                                <ListItem key={ingredient} disableGutters>
                                                    <ListItemText primary={`${
                                                        // Capitalize the first letter of the ingredient and swap underscores for spaces
                                                        ingredient.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
                                                    }: ${quantity}`} />
                                                </ListItem>
                                            ))}
                                        </List>
                                        <Divider />
                                        <Typography variant="h6"
                                                    component="h3"
                                                    gutterBottom mt={2}
                                                    fontWeight='bold'
                                        >
                                            Instructions:
                                        </Typography>
                                        <List>
                                            {recipe.instructions.map((instruction, index) => (
                                                <ListItem key={index} disableGutters>
                                                    <ListItemText primary={`${index + 1}. ${instruction}`} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
                <Button onClick={() => router.push("/")} variant="contained" color="primary">
                    Go back home
                </Button>
            </Box>
        </RequireAuth>
    );
};

export default Recipes;
