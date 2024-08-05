"use client";
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState, useRef } from "react";
import { Box, Button, Modal, Stack, TextField, Typography, Grid, Container, Paper, IconButton, Tooltip } from "@mui/material";
import { collection, query, getDocs, getDoc, setDoc, doc, deleteDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import SwitchCameraIcon from '@mui/icons-material/SwitchCamera';
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { Camera } from "react-camera-pro";
import RequireAuth from "./auth/RequireAuth";
import AuthContext from "./auth/AuthContext";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, dangerouslyAllowBrowser: true });

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: 400,
  bgcolor: 'background.paper',
  borderRadius: '8px',
  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
  p: 4,
};

const reactCamStyle = {
  ...style,
  height: 400
};

export default function Home() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);
  const [pantry, setPantry] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const camera = useRef(null);
  const [image, setImage] = useState(null);
  const [response, setResponse] = useState(null);

  const handleTextInputChange = event => {
    setTextInput(event.target.value);
  };

  //create a function to fetch data from firebase


  const updatePantry = async () => {
    if (!user) return;

    const q = query(collection(firestore, 'users', user.uid, 'pantry'));
    const docs = await getDocs(q);
    const pantryItems = [];
    docs.forEach((doc) => {
      pantryItems.push({ name: doc.id, count: doc.data().count });
    });
    setPantry(pantryItems);
  };

  useEffect(() => {
    updatePantry();
  }, [user]);

  const handleClose = () => {
    setOpenModal(false);
  };
  const handleOpen = () => {
    setOpenModal(true);
  };
  const handleCameraClose = () => {
    setCameraModalOpen(false);
  };
  const handleCameraOpen = () => {
    setCameraModalOpen(true);
  };

  const deleteDocFirestore = async (item) => {
    if (!user) return;

    const docRef = doc(firestore, 'users', user.uid, 'pantry', item);
    const docSnap = await getDoc(docRef);
    if (docSnap.data().count > 1) {
      await setDoc(docRef, { count: docSnap.data().count - 1 });
    } else {
      await deleteDoc(docRef);
    }
    await updatePantry();
  };

  const updateFirestore = async () => {
    if (!user) return;

    const item = textInput.toLowerCase();
    const docRef = doc(firestore, 'users', user.uid, 'pantry', item);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { count } = docSnap.data();
      await setDoc(docRef, { count: count + 1 });
    } else {
      await setDoc(docRef, { count: 1 });
    }
    setTextInput('');
    await updatePantry();
    handleClose();
  };

  function extractJsonString(textData) {
    const jsonMatch = textData.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    } else {
      console.log("No JSON data found");
      return null;
    }
  }

  function parseJsonData(jsonString) {
    if (!jsonString) return null;

    try {
      const parsedData = JSON.parse(jsonString);
      return parsedData;
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  }

  const testOpenAI = async (imageBase64) => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "system",
          content: "You are tasked with helping a user describe an image. The image consists of items in a pantry, items such as food and groceries. Classify the items in the image, and return the count of that item."
        },
        {
          role: "system",
          content: "The JSON Format of the response should be: {itemName: countOfItem}. Only return a JSON object if the item count is greater than 0. Here is a sample format: The image shows a single chocolate chip muffin. \n" +
              "\n" +
              "```json\n" +
              "{\"chocolate_chip_muffin\": 1}\n" +
              "```"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe the image"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500 // Set the max tokens to limit the response size
    });
    setResponse(response.choices[0].message.content);
    console.log(response.choices[0]);

    const itemData = extractJsonString(response.choices[0].message.content)
    const itemJson = parseJsonData(itemData);
    if (itemJson) {
      for (const key of Object.keys(itemJson)) {
        const docRef = doc(firestore, 'users', user.uid, 'pantry', key);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { count } = docSnap.data();
          await setDoc(docRef, { count: count + itemJson[key] });
        } else {
          await setDoc(docRef, { count: itemJson[key] });
        }
      }
      await updatePantry();
    }
  };

  const generateRecipe = async () => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant."
          },
          {
            role: "system",
            content: "You are tasked with helping a user generate a recipe. The user wants to cook a meal with the items in the pantry. Only use the items in the pantry to generate the recipe."
          },
          {
            role: "system",
            content: "The JSON Format of the response should be: {recipeName: {ingredients: {ingredient: quantity}, instructions: [steps]}}. Only return a JSON object if the recipe is not empty. Do not include any text outside of the JSON object. Here is a sample format: \n" +
                "\n" +
                "```json\n" +
                "{\"chocolate_chip_muffin\": {\"ingredients\": {\"chocolate chips\": \"1 cup\", \"flour\": \"2 cups\"}, \"instructions\": [\"Mix ingredients.\", \"Bake at 350F for 20 minutes.\"]}}\n" +
                "```"
          },
          {
            role: "user",
            content: "Generate a recipe, given the following pantry: " + pantry.map(({ name, count }) => `${count} ${name}`).join(", ")
          }
        ],
        max_tokens: 500 // Set the max tokens to limit the response size
      });

      const responseData = response.choices[0].message.content;
      console.log(responseData);

      const jsonString = extractJsonString(responseData);
      const recipeData = parseJsonData(jsonString);

      if (recipeData) {
        const recipeName = Object.keys(recipeData)[0];
        const docRef = doc(firestore, 'users', user.uid, 'recipes', recipeName);
        await setDoc(docRef, {
          ...recipeData[recipeName],
          createdAt: new Date() // Add the createdAt field with the current timestamp
        });
        router.push('/recipes');
      }

    } catch (error) {
      console.error("Error generating recipe:", error);
    }
  };


  const resizeImage = (base64Str, maxWidth = 400, maxHeight = 400) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height *= maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width *= maxHeight / height));
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5).split(',')[1]); // Reduce quality to 50% and remove the base64 prefix
      };
    });
  };

  const takePhoto = async () => {
    const photo = camera.current.takePhoto();
    const resizedPhoto = await resizeImage(photo);
    setImage(resizedPhoto);
    setCameraModalOpen(false);
    testOpenAI(resizedPhoto);
  };

  const switchCamera = () => {
    if (camera.current) {
      camera.current.switchCamera();
    }
  };

  return (
      <RequireAuth>
        <Container sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 2 }}>
          <Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h4" color="primary">
              My Pantry
            </Typography>
            <Button variant="contained" color="secondary" onClick={logout}>
              Logout
            </Button>
          </Box>
          <Box flex="1" overflow="auto" mt={2}>
            <Paper elevation={3} style={{ padding: '20px', borderRadius: '8px' }}>
              <Typography variant="h4" color="textPrimary" fontWeight="bold" align="center" gutterBottom>
                Pantry
              </Typography>
              <Grid container spacing={2}>
                {pantry.map(({ name, count }) => (
                    <Grid item xs={12} sm={6} md={4} key={name}>
                      <Paper elevation={1} style={{ padding: '10px', borderRadius: '8px', textAlign: 'center', background: '#f5f5f5' }}>
                        <Typography variant="h6" color="textPrimary">
                          {name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')}
                        </Typography>
                        <Typography variant="body1" color="textSecondary">
                          {count}
                        </Typography>
                        <IconButton color="secondary" onClick={() => deleteDocFirestore(name)}>
                          <DeleteIcon />
                        </IconButton>
                      </Paper>
                    </Grid>
                ))}
              </Grid>
            </Paper>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Button variant="contained" color="primary" onClick={generateRecipe}>
              Generate Recipe
            </Button>
            <Box display="flex" gap={2}>
              <IconButton color="primary" onClick={handleOpen}>
                <AddCircleIcon style={{ fontSize: 40 }} />
              </IconButton>
              <IconButton color="primary" onClick={handleCameraOpen}>
                <CameraAltIcon style={{ fontSize: 40 }} />
              </IconButton>
            </Box>
            <Button variant="contained" color="secondary" onClick={() => router.push('/recipes')}>
              View Recipes
            </Button>
          </Box>
          <Modal open={openModal} onClose={handleClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
            <Box sx={style}>
              <Stack spacing={2} direction="column" justifyContent="center" alignItems="center">
                <Typography id="modal-modal-title" variant="h6" component="h2" align="center">
                  Add Item
                </Typography>
                <Stack spacing={2} direction="row" justifyContent="center" alignItems="center">
                  <TextField id="outlined-basic" label="Item" variant="outlined" value={textInput} onChange={handleTextInputChange} />
                  <Button variant="contained" color="primary" onClick={updateFirestore}>
                    Add
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Modal>
          <Modal open={cameraModalOpen} onClose={handleCameraClose}>
            <Box sx={reactCamStyle}>
              <Camera ref={camera} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                <Button variant="contained" color="primary" onClick={takePhoto}>
                  Take photo
                </Button>
                <Tooltip title="Switch Camera">
                  <IconButton color="primary" onClick={switchCamera}>
                    <SwitchCameraIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Modal>
        </Container>
      </RequireAuth>
  );
}
