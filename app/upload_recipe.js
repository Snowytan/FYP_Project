import React, { useState, useEffect } from "react";
import {View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Alert} from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { Menu, Button } from "react-native-paper";
import { useNavigation } from "expo-router";
import { getFirestore, collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { app } from './firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAuth, signOut } from 'firebase/auth';
import { Linking } from 'react-native';

export default function UploadRecipe() {
  const [ingredients, setIngredients] = useState([
    { name: "", quantity: "", unit: "Unit" },
  ]);
  const [title, setTitle] = useState(""); 
  const [instructions, setInstructions] = useState(""); 
  const [servings, setServings] = useState("1");
  const [menuVisible, setMenuVisible] = useState(null);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const navigation = useNavigation();
  const db = getFirestore(app);
  const auth = getAuth(app);
  const user = auth.currentUser;  
  const uid = user ? user.uid : null;  
  const [errors, setErrors] = useState({});

  const fetchUserName = async (uid) => {
      const userRef = doc(getFirestore(app), "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data().fullName;
      } else {
        console.log("No such user!");
        return null; 
      }
    };

  useEffect(() => {
          // Check if the user is logged in
          const unsubscribe = auth.onAuthStateChanged(user => {
            if (!user) {
              console.log("No user found, redirecting to signup_login.");
              navigation.navigate("signup_login");
            }
          });
      
          return () => unsubscribe();
        }, []);
      
        const handleLogout = async () => {
          try {
            await signOut(auth);
            navigation.navigate("signup_login"); 
            Alert.alert("Logout Successful", "You have been logged out.");
          } catch (error) {
            Alert.alert("Logout Failed", error.message);
          }
        };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: "", unit: "Unit" }]);
  };

  const handleRemoveIngredient = (index) => {
  setIngredients(prevIngredients => prevIngredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index][field] = value;
    setIngredients(updatedIngredients);
  };
  
  const [imageUri, setImageUri] = useState();
  
  const pickImage = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
  
      console.log('ImagePicker result:', result); 
  
      if (!result.cancelled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        console.log('Image URI:', uri);
      } else {
        console.log('Image picking was cancelled or no assets found');
      }
    };
  
  useEffect(() => {
    console.log('Updated imageUri:', imageUri);
  }, [imageUri]);


  const uploadImage = async (uri) => {
    console.log("Starting image upload for URI:", uri);
    if (!uri) {
        console.log("No URI provided for upload");
        return;
    }
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage(app);
    const fileName = `recipe_images/${Date.now()}.jpg`; 
    const storageRef = ref(storage, fileName);
  
    const uploadTask = uploadBytesResumable(storageRef, blob);
  
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {

          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        }, 
        (error) => {
          console.error("Error uploading image: ", error);
          Alert.alert('Upload Error', error.message);
          reject(error);
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            console.log("File available at", downloadURL);
            resolve(downloadURL);
          });
        }
      );
    });
  };

  const validateForm = () => {
    let valid = true;
    let newErrors = {};

    // Validate title
    if (!title.trim()) {
        newErrors.title = 'Title is required';
        valid = false;
    }

    // Validate servings
    if (!servings.trim()) {
        newErrors.servings = 'Number of servings is required';
        valid = false;
    }

    // Validate ingredients
    if (ingredients.some(ingredient => !ingredient.name.trim() || !ingredient.quantity.trim())) {
        newErrors.ingredients = 'All ingredients must have a name and quantity';
        valid = false;
    }

    // Validate instructions
    if (!instructions.trim()) {
        newErrors.instructions = 'Instructions are required';
        valid = false;
    }

    setErrors(newErrors);
    return valid;
};

  const handleSubmit = async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to upload a recipe.");
      return;
    }

    if (!validateForm()) {
          Alert.alert('Validation Error', 'Please correct the errors in the form');
          return;
        }

        const authorName = await fetchUserName(uid);
          if (!authorName) {
            Alert.alert("Error", "Failed to fetch user details.");
          return;
        }

    let imageUrl = null; 

  if (imageUri) {
    imageUrl = await uploadImage(imageUri);
    if (!imageUrl) {
      console.error("Failed to upload image.");
      Alert.alert("Upload Error", "Failed to upload image.");
      return; 
    }
  }
    try {
      const docRef = await addDoc(collection(db, "recipe"), {
        title,
        servings,
        ingredients,
        instructions,
        imageUrl, 
        uid,  
        author: authorName,
        created_at: new Date()
      });
      console.log("Document written with ID: ", docRef.id);
      Alert.alert("Success", "Recipe successfully uploaded!", [
        { text: "OK", onPress: () => navigation.navigate("index") }
      ]);
    } catch (e) {
      console.error("Error adding document: ", e);
      Alert.alert("Error", "Failed to upload the recipe.", [
        { text: "OK", onPress: () => navigation.navigate("index") }
      ]);
    }
  };

  return (
    
    <View style={styles.container}>
    {/* Header Section */}
    <View style={styles.header}>
      <Image
        source={require("../assets/images/Makan Family-logo.png")}
        style={styles.logo}
      />
      <TouchableOpacity
        onPress={() => setMenuVisible(!menuVisible)}
        style={styles.hamburger}
      >
        <FontAwesome name="bars" size={30} color="black" />
      </TouchableOpacity>
    </View>

    {/* Menu Navigation */}
          {menuVisible && (
            <View style={styles.menuContainer}>
              <ScrollView>
                <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate("index")}>
                  <Text style={styles.menuText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setprofileSubMenuVisible(!profileSubMenuVisible)}
            >
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>
            {profileSubMenuVisible && (
              <View style={styles.subMenuContainer}>
                <TouchableOpacity 
                style={styles.subMenuItem} 
                onPress={() => navigation.navigate("profile_user")}>
                  <Text style={styles.subMenuText}>user</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                style={styles.subMenuItem} 
                onPress={() => navigation.navigate("profile_business")}>
                  <Text style={styles.subMenuText}>Business user</Text>
                </TouchableOpacity>
              </View>
            )}
                {/* Upload Menu Item with Submenu */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setUploadSubMenuVisible(!uploadSubMenuVisible)}
                >
                  <Text style={styles.menuText}>Upload</Text>
                </TouchableOpacity>
                {uploadSubMenuVisible && (
                  <View style={styles.subMenuContainer}>
                    <TouchableOpacity 
                    style={styles.subMenuItem} 
                    onPress={() => navigation.navigate("upload_recipe")}>
                      <Text style={styles.subMenuText}>Upload Recipe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                    style={styles.subMenuItem} 
                    onPress={() => navigation.navigate("upload_review")}>
                      <Text style={styles.subMenuText}>Upload Review</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate("saved")}>
                  <Text style={styles.menuText}>Saved</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => navigation.navigate("message")}>
                  <Text style={styles.menuText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={handleLogout}>
                  <Text style={styles.menuText}>Logout</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

    {/* Scrollable Content */}
    <ScrollView style={styles.scrollableContent}>
      <View style={styles.uploadContainer}>
        <Text style={styles.title}>Upload Recipe</Text>

        {/* Upload Image */}
        <TouchableOpacity 
          style={styles.uploadImageContainer} 
          onPress={pickImage}
          >
          {imageUri ? (
          <Image
            source={{ uri: imageUri }}
          style={styles.imageUpload}
          resizeMode="contain"
          onError={(e) => console.log('Failed to load image:', e.nativeEvent.error)} // Add error handling
          />
          ) : (
            <>
              <FontAwesome name="plus-circle" size={50} color="#000" />
              <Text style={styles.uploadImageText}>Upload Image (Optional)</Text>
            </>
          )}
        </TouchableOpacity>


        {/* Title Input */}
        <TextInput style={[styles.input, errors.title ? { borderColor: 'red' } : {}]} placeholder="Title" value={title} onChangeText={setTitle}/>
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

        {/* Servings Input */}
        <View style={styles.servingsContainer}>
          <Text style={styles.servingsLabel}>Number of servings:</Text>
          <TextInput
            style={[styles.servingsInput, errors.servings ? { borderColor: 'red' } : {}]}
            keyboardType="number-pad"
            value={servings}
            onChangeText={(text) => setServings(text)}
          />
          {errors.servings && <Text style={styles.errorText}>{errors.servings}</Text>}
        </View>

        {/* Ingredients Section */}
        <Text style={styles.sectionTitle}>Ingredients:</Text>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientRow}>
            <TextInput
              style={[styles.ingredientInput, errors.ingredients ? { borderColor: 'red' } : {}]}
              placeholder="Ingredient"
              value={ingredient.name}
              onChangeText={(text) =>
                handleIngredientChange(index, "name", text)
              }
            />
            <TextInput
              style={[styles.quantityInput, errors.ingredients ? { borderColor: 'red' } : {}]}
              keyboardType="number-pad"
              placeholder="Qty"
              value={ingredient.quantity}
              onChangeText={(text) =>
                handleIngredientChange(index, "quantity", text)
              }
            />
            
            <Menu
              visible={menuVisible === index}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <TouchableOpacity
                  style={styles.unitInput}
                  onPress={() => setMenuVisible(index)}
                >
                  <Text>{ingredient.unit}</Text>
                  <AntDesign name="down" size={12} />
                </TouchableOpacity>
              }
            >
              {["Unit", "ml", "litres", "g", "kg", "tbsp", "tsp", "cup", "oz", 'packet', 'piece', 'slice', 'Bowl']
                .map((unit) => (
                  <Menu.Item
                    key={unit}
                    onPress={() => {
                      handleIngredientChange(index, "unit", unit);
                      setMenuVisible(null);
                    }}
                    title={unit}
                  />
                ))}
            </Menu>
            <TouchableOpacity onPress={() => handleRemoveIngredient(index)} style={styles.removeButton}>
              <AntDesign name="minuscircleo" size={24} color="red" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          onPress={handleAddIngredient}
          style={styles.addIngredientButton}
        >
          <AntDesign name="pluscircleo" size={24} color="blue" />
        </TouchableOpacity>
        {errors.ingredients && <Text style={styles.errorText}>{errors.ingredients}</Text>}

        {/* Instructions Input */}
        <TextInput
          style={[styles.input, styles.instructionsInput, errors.instructions ? { borderColor: 'red' } : {}]}
          placeholder="Instructions"
          multiline
          numberOfLines={4}
          value={instructions}
          onChangeText={setInstructions}
        />
        {errors.instructions && <Text style={styles.errorText}>{errors.instructions}</Text>}

        {/* Submit Button */}
        <Button mode="contained" onPress={handleSubmit} style={styles.submitButton}>
          Submit
        </Button>
      </View>
    </ScrollView>

    {/* Footer */}
  <View style={styles.footer}>
    <TouchableOpacity onPress={() => Linking.openURL('https://www.instagram.com/')}>
      <FontAwesome name="instagram" size={30} color="black" />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => Linking.openURL('https://www.youtube.com/')}>
      <FontAwesome name="youtube-play" size={30} color="black" />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/')}>
      <AntDesign name="linkedin-square" size={30} color="black" />
    </TouchableOpacity>
  </View>

</View>

);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 0,
  },
  logo: {
    width: 50,
    height: 50,
  },
  hamburger: {
    padding: 5,
  },
  menuContainer: {
    position: "absolute",
    top: 70,
    left: 0,
    width: "80%",
    backgroundColor: "white",
    elevation: 5,
    zIndex: 10,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  menuText: {
    fontSize: 16,
  },
  subMenuContainer: {
    paddingLeft: 20,
    backgroundColor: "#f9f9f9",
  },
  subMenuItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  subMenuText: {
    fontSize: 14,
    color: "#555",
  },
  scrollableContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 30,
  },
  imageUpload: {
    alignItems: "center",
    justifyContent: "center",
    marginTop:10,
    marginBottom: 10,
    height: 150,
    width: '100%' ,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  uploadText: {
    color: "black",
    fontSize: 16,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  servingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  servingsLabel: {
    fontSize: 16,
    marginRight: 10,
  },
  servingsInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    width: 50,
    height: 40,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  ingredientInput: {
    flex: 3,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    textAlign: "center",
  },
  unitInput: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    backgroundColor: "white",
  },
  addIngredientButton: {
    alignItems: "center",
    marginBottom: 20,
  },
  instructionsInput: {
    height: 100,
  },
  submitButton: {
    marginTop: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "white",
  },
  uploadImageContainer: {
    marginVertical: 20,
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadImageText: {
    marginTop: 10,
    color: '#000',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 15,
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
  },
});
