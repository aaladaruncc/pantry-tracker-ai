"use client";

import { useRouter } from 'next/navigation';
import { useContext, useEffect, useState, useRef } from "react";
import { Box, Button, Modal, Stack, TextField, Typography } from "@mui/material";
import { collection, query, getDocs, getDoc, setDoc, doc, deleteDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import DeleteIcon from '@mui/icons-material/Delete';
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
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

const reactCamStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  height: 400
};

export default function Home() {
  const router = useRouter(); // Ensure useRouter is used in a client component
  const { user, logout } = useContext(AuthContext); // Get the current user and logout function
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
        await setDoc(docRef, recipeData[recipeName]);
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

  return (
      <RequireAuth>
        <Box width="100vw" height="100vh" display="flex" justifyContent="center" alignItems="center" flexDirection="column" gap={2}>
          <Button variant="contained" onClick={logout}>
            Logout
          </Button>
          <Modal open={openModal} onClose={handleClose} aria-labelledby="modal-modal-title" aria-describedby="modal-modal-description">
            <Box sx={style}>
              <Stack spacing={2} direction="column" justifyContent="center" alignItems="center">
                <Typography id="modal-modal-title" variant="h6" component="h2" align="center">
                  Add Item
                </Typography>
                <Stack spacing={2} direction="row" justifyContent="center" alignItems="center">
                  <TextField id="outlined-basic" label="Item" variant="outlined" value={textInput} onChange={handleTextInputChange} />
                  <Button variant="contained" onClick={updateFirestore}>
                    Add
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Modal>
          <Button variant="contained" onClick={handleOpen}>
            Add
          </Button>
          <Button variant="outlined" onClick={handleCameraOpen}>
            Camera
          </Button>
          <Modal open={cameraModalOpen} onClose={handleCameraClose}>
            <Box sx={reactCamStyle}>
              <Camera ref={camera} />
              <Button variant="contained" onClick={takePhoto}>
                Take photo
              </Button>
              {image && <img src={`data:image/jpeg;base64,${image}`} alt='Taken photo' />}
            </Box>
          </Modal>
          <Box border={3}>
            <Box width="600px" height="100px">
              <Box bgcolor="#B0E0E6" width="100%" height="100%">
                <Typography variant="h3" color="primary" fontWeight={100} align="center">
                  Pantry
                </Typography>
              </Box>
            </Box>
            <Stack width="600px" height="500px" spacing={2} overflow="auto">
              {pantry.map(({ name, count }) => (
                  <Box key={name} bgcolor="lightgray" color="black" p={2} textAlign="center" fontSize="2rem">
                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={6}>
                      <Typography variant="h4" color="primary" fontWeight={100} align="center">
                        {
                            name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ')
                        }
                      </Typography>
                      <Typography variant="h4" color="primary" fontWeight={100} align="center">
                        {count}
                      </Typography>
                      <Button variant="contained" onClick={() => deleteDocFirestore(name)} startIcon={<DeleteIcon />}>
                        Delete
                      </Button>
                    </Stack>
                  </Box>
              ))}
            </Stack>
          </Box>
          <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={2}
          >
            <Button
                variant="contained"
                onClick={generateRecipe}
            >
              Generate Recipe
            </Button>
            <Button
                variant="contained"
                onClick={() => router.push('/recipes')}
            >
              View Recipes
            </Button>
          </Stack>
        </Box>
      </RequireAuth>
  );
}
