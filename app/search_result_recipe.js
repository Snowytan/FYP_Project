import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, ActivityIndicator, Alert, Modal } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Linking } from 'react-native';

export default function SearchResultRecipe() {
  const params = useLocalSearchParams();
  const searchQuery = params.query;  
  const navigation = useNavigation();
  const [newSearch, setNewSearch] = useState(""); 
  const [savedRecipes, setSavedRecipes] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const auth = getAuth();
  const [foodScannerModalVisible, setFoodScannerModalVisible] = useState(false);
  const [imageUri, setImageUri] = useState();

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

const analyseImage = async () => {
  if (!imageUri) {
    console.log("No image URI available");
    return;
  }

  let base64;
  try {
    base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
  } catch (error) {
    console.error("Error reading image file:", error);
    Alert.alert("Read error", "Failed to read the image file");
    return;
  }

  if (!base64) {
    console.log("Base64 string is empty or undefined");
    return;
  }

  try {
    const GOOGLE_VISION_API_KEY = 'API KEY';
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
            },
          ],
        }),
      }
    );

    const visionData = await visionResponse.json();
    if (!visionResponse.ok) {
      throw new Error(
        `Google Vision API Error: ${visionData.error?.message || 'Unknown error'}`
      );
    }

    const labels = visionData.responses[0]?.labelAnnotations || [];
    if (labels.length === 0) {
      Alert.alert("Food Analysis", "No food detected in the image.");
      return;
    }

    // Format labels for OpenAI
    const formattedLabels = labels
      .map((label) => `${label.description} (${(label.score * 100).toFixed(1)}%)`)
      .join(', ');

    const openAIPrompt = `The image analysis detected these possibilities: ${formattedLabels}. Based on this, what is the most likely dish? Provide a one line explanation about the dish.`;

    const OPENAI_API_KEY = 'API KEY';
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: openAIPrompt }],
      }),
    });

    const openAIData = await openAIResponse.json();
    if (!openAIResponse.ok) {
      throw new Error(
        `OpenAI API Error: ${openAIData.error?.message || 'Unknown error'}`
      );
    }

    const openAIResult = openAIData.choices[0]?.message?.content || "No response from OpenAI.";
    Alert.alert("Food Analysis Result", openAIResult);
    console.log("Response from OpenAI:", openAIResult);
  } catch (error) {
    console.error('Error analysing image:', error);
    Alert.alert(
      'Analysis error',
      `Failed to analyse the image: ${error.message || error}`
    );
  }
};

  useEffect(() => {
      const fetchSavedStatus = async () => {
        const user = auth.currentUser;
        if (user) {
          const savedRef = collection(db, "saved");
          // Ensure `query` is properly used with imported methods
          const q = query(savedRef, where("uid", "==", user.uid), where("itemType", "==", "recipe"));
          const snapshot = await getDocs(q);
          const savedStatus = {};
          snapshot.forEach(doc => {
            savedStatus[doc.data().itemId] = true; // Assumes 'itemId' is the saved field indicating the recipe's ID
          });
          setSavedRecipes(savedStatus);
        }
      };
    
      fetchSavedStatus();
    }, [auth.currentUser]);

  useEffect(() => {
      async function fetchRecipes() {
        setLoading(true);
        try {
          const snapshot = await getDocs(collection(db, "recipe"));
          const allRecipes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          const filteredRecipes = allRecipes.filter(recipe =>
            recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.author.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setRecipes(filteredRecipes);
        } catch (error) {
          console.error("Error fetching recipes:", error);
          Alert.alert("Error", "Failed to load recipes.");
        } finally {
          setLoading(false);
        }
      }
  
        fetchRecipes();

    }, [query]);
  
    if (loading) {
      return <ActivityIndicator size="large" color="#0000ff" />;
    }

  const toggleSave = async (recipeId) => {
      const user = auth.currentUser;
      if (!user) return Alert.alert("Not logged in", "You must be logged in to save a recipe.");
    
      const isSaved = savedRecipes[recipeId];
      const itemRef = collection(db, "saved");
      if (!isSaved) {
        await addDoc(itemRef, {
          uid: user.uid,
          itemId: recipeId,
          itemType: "recipe",
          savedAt: new Date()
        });
      } else {
        const q = query(itemRef, where("itemId", "==", recipeId), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      setSavedRecipes(prev => ({ ...prev, [recipeId]: !isSaved }));
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search e.g Fish Soup"
          style={styles.searchBar}
          value={newSearch}
          onChangeText={setNewSearch}
          onSubmitEditing={() => navigation.navigate("search_result", { query: newSearch })}
        />
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
                    onPress={() => {
  
                    setFoodScannerModalVisible(true); 
                    }}
                  >
                    <Text style={styles.menuText}>Food Scanner</Text>
                  </TouchableOpacity>

                  <Modal
                    visible={foodScannerModalVisible}
                    onRequestClose={() => setFoodScannerModalVisible(false)}
                    animationType="slide"
                    transparent={true}
                  >
                    <View style={styles.centeredView}>
                      <View style={styles.modalView}>
                        <Text style={styles.modalText}>Upload Image for Analysis</Text>
                        <TouchableOpacity style={styles.button} onPress={pickImage}>
                          <Text style={styles.buttonText}>Pick Image</Text>
                        </TouchableOpacity>
                        {imageUri && (
                          <Image source={{ uri: imageUri }} style={{ width: 200, height: 200, marginTop: 10 }} />
                        )}
                        <TouchableOpacity
                          style={styles.button}
                          onPress={() => {
                          analyseImage();
                          setFoodScannerModalVisible(false);
                        }}
                        >
                          <Text style={styles.buttonText}>Analyse Image</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={handleLogout}>
                    <Text style={styles.menuText}>Logout</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

      {/* Header Title */}
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Recipes: {query}</Text>
      </View>

      {/* Recipes Section */}
      <ScrollView contentContainerStyle={styles.mainContent}>
        {recipes.length > 0 ? recipes.map(recipe => (
                  <TouchableOpacity
                    key={recipe.id}
                    style={styles.recipeCard}
                    onPress={() => navigation.navigate("recipe", { docId: recipe.id })}
                  >
                  <Image
                    source={recipe.imageUrl ? { uri: recipe.imageUrl } : require("../assets/images/Makan Family-logo.png")}
                    style={styles.recipeImage}
                  />
                  <View style={styles.recipeDetails}>
                      <Text style={styles.recipeTitle}>{recipe.title}</Text>
                      <Text style={styles.recipeAuthor}>By: {recipe.author || "Unknown"}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleSave(recipe.id)}>
                    <FontAwesome
                      name={savedRecipes[recipe.id] ? "bookmark" : "bookmark-o"}
                      size={24}
                      color={savedRecipes[recipe.id] ? "blue" : "black"}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )) : (
                <Text style={styles.noRecipesText}>No recipes found for "{query}".</Text>
              )}
      </ScrollView>

      {/* Footer Section */}
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
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      backgroundColor: "white",
      elevation: 3,
    },
    logo: {
      width: 50,
      height: 50,
    },
    searchContainer: {
      paddingHorizontal: 10,
      marginTop: 10,
    },
    searchBar: {
      backgroundColor: "#f1f1f1",
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 40,
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
    headerTitleContainer: {
      padding: 20,
      backgroundColor: "white",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
    },
    mainContent: {
      padding: 10,
    },
    recipeCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      marginBottom: 10,
      backgroundColor: "#f9f9f9",
      borderRadius: 10,
      elevation: 1,
    },
    recipeImage: {
      width: 60,
      height: 60,
      marginRight: 10,
      borderRadius: 10,
    },
    recipeDetails: {
      flex: 1,
    },
    recipeTitle: {
      fontSize: 16,
      fontWeight: "bold",
    },
    recipeStars: {
      fontSize: 14,
      color: "#FFD700",
      marginVertical: 5,
    },
    recipeAuthor: {
      fontSize: 12,
      color: "gray",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 10,
      backgroundColor: "white",
      elevation: 3,
    },
    centeredView: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 22,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    },
    modalView: {
      margin: 20,
      backgroundColor: "white",
      borderRadius: 20,
      padding: 35,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5
    },
    modalText: {
      marginBottom: 15,
      textAlign: "center"
    },
    button: {
      backgroundColor: "#2196F3", 
      borderRadius: 20,
      padding: 10,
      elevation: 2,
      marginTop: 10
    },
    buttonText: {
      color: "white",
      fontWeight: "bold",
      textAlign: "center"
    }
  });
  
