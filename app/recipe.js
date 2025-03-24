import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, ActivityIndicator, Alert } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { getFirestore, collection, doc, addDoc, deleteDoc, getDoc, onSnapshot, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import axios from 'axios';
import { Linking } from 'react-native';

export default function Recipe() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [foodImages, setFoodImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [servings, setServings] = useState("1");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [savedRecipes, setSavedRecipes] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const { docId } = route.params; 
  const [recipeData, setRecipeData] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [userDietModalVisible, setUserDietModalVisible] = useState(false);
  const [userDietInput, setUserDietInput] = useState('');
  const [dietAlternatives, setDietAlternatives] = useState('');
  const db = getFirestore();
  const auth = getAuth();

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

  useEffect(() => {
        const fetchSavedStatus = async () => {
          const user = auth.currentUser;
          if (user) {
            const savedRef = collection(db, "saved");
            const q = query(savedRef, where("uid", "==", user.uid), where("itemType", "==", "recipe"));
            const snapshot = await getDocs(q);
            const savedStatus = {};
            snapshot.forEach(doc => {
              savedStatus[doc.data().itemId] = true; 
            });
            setSavedRecipes(savedStatus);
          }
        };
      
        fetchSavedStatus();
      }, [auth.currentUser]);

  const [originalIngredients, setOriginalIngredients] = useState([]);

  useEffect(() => {
      const fetchRecipeAndUserNames = async () => {
        const docId = route.params?.docId;
        const recipeDocRef = doc(collection(db, 'recipe'), docId);
        const recipeDoc = await getDoc(recipeDocRef);
        
        if (recipeDoc.exists()) {
          const data = recipeDoc.data();
          console.log("Data fetched", data);
          setRecipeData(data);
          setIngredients(data.ingredients || []);
          setOriginalIngredients(data.ingredients || []); 
          setInstructions(data.instructions || "");
          setServings(data.servings || "1");

          if (data.imageUrls && data.imageUrls.length > 0) { 
            setFoodImages(data.imageUrls);
          } else if (data.imageUrl) { 
            setFoodImages([data.imageUrl]);
          }

          console.log("Recipe details fetched successfully!");
    
        let userName = "Anonymous";
  
        const userDocRef = doc(db, 'users', data.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          userName = userDoc.data().fullName || "Anonymous"; 
        } else {
         
          const businessUserDocRef = doc(db, 'business_users', data.uid);
          const businessUserDoc = await getDoc(businessUserDocRef);
          if (businessUserDoc.exists()) {
            userName = businessUserDoc.data().stallName || "Anonymous";
          }
        }
    
        console.log('Recipe details fetched successfully!');
      } else {
        console.log('No such recipe!');
        Alert.alert("Error", "No such recipe found.");
      }
    };
    
      fetchRecipeAndUserNames();
    }, [docId, db]);

    const [healthierOptions, setHealthierOptions] = useState("");

    const fetchHealthierOptionsForAll = async () => {
      if (!ingredients || ingredients.length === 0) {
        console.log("No ingredients to evaluate.");
        return; 
      }
      try {
        const unhealthyPatterns = /butter|sugar|heavy\scream|salt|oil|fat|lard|msg|artificial|nitrite|nitrate|rice|flour|bread|benzoate/i;

        const unhealthyIngredients = ingredients
        .filter(ingredient => unhealthyPatterns.test(ingredient.name))
        .map(ingredient => ingredient.name)
        .join(", ");

      if (!unhealthyIngredients.length) {
      setHealthierOptions("All ingredients are already healthy.");
      return;
      }

      const ingredientDetails = ingredients.map(ingredient => {
        if (unhealthyPatterns.test(ingredient.name)) {
          return `${ingredient.name} (unhealthy)`;
        }
        return `${ingredient.name} (${ingredient.quantity} ${ingredient.unit})`;
      }).join(", ");
    
        const response = await axios.post(
          'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
          {
            prompt: `Without explanation, provide healthier alternatives for the following ingredients that marked as "(unhealthy)": ${ingredientDetails}. No explanation`,
            max_tokens: 100,
            temperature: 0.3
          },
          {
            headers: {
              'Authorization': `API KEY`, 
              'Content-Type': 'application/json'
            }
          }
        );
        const healthierOptionsResponse = response.data.choices[0].text.trim();
        const nutritionPrompt = `List the total estimated calories, fats, proteins, and carbohydrates for a recipe: ${healthierOptionsResponse}. Provide the values only.`;

    const nutritionResponse = await axios.post(
      'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
      {
        prompt: nutritionPrompt,
        max_tokens: 150,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `API KEY`,
          'Content-Type': 'application/json'
        }
      }
    );

    const nutritionInfo = nutritionResponse.data.choices[0].text.trim();
    const combinedResponse = `Healthier Alternatives:\n${healthierOptionsResponse}\n\nNutrition Information:\n${nutritionInfo}`;
    setHealthierOptions(combinedResponse);
  } catch (error) {
    console.error("API request failed:", error);
    Alert.alert("API Error", "Failed to fetch healthier options or nutrition information.");
  }
};

const renderIngredients = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle1}>Ingredients:</Text>
      {ingredients.map((ingredient, index) => (
        <Text key={`ingredient-${index}`} style={{marginHorizontal:-10}}>- {ingredient.quantity} {ingredient.unit} of {ingredient.name}</Text>
      ))}
      <TouchableOpacity 
        onPress={fetchHealthierOptionsForAll}
        style={styles.healthierButton}
      >
        <Text style={styles.healthierButtonText}>Healthier Options</Text>
      </TouchableOpacity>

      {healthierOptions && (
        <Text style={styles.healthierOptionsText}>{healthierOptions}</Text>
      )}
    </View>
  );
};
  
    const scaleIngredients = (newServings) => {
    const originalServings = parseInt(recipeData.servings); 
    const scale = newServings / originalServings;

    const scaledIngredients = originalIngredients.map(ingredient => ({
      ...ingredient,
      quantity: (parseFloat(ingredient.quantity) * scale).toFixed(2) 
    }));

    setIngredients(scaledIngredients); 
    };

    const handleServingsChange = (text) => {
      if (text === '') {
        setServings(''); 
      } else {
        const newServings = parseInt(text, 10); 
        if (isNaN(newServings) || newServings < 1) {
          setServings(1); 
          scaleIngredients(1); 
        } else {
          setServings(newServings);
          scaleIngredients(newServings);
        }
      }
    };
  
    useEffect(() => {
      const fetchComments = async () => {
          try {
              const commentsCollectionRef = collection(db, "recipe", docId, "comments");
              const q = query(commentsCollectionRef, orderBy("createdAt", "asc"));
              const querySnapshot = await getDocs(q);
    
              const fetchedComments = await Promise.all(querySnapshot.docs.map(async (document) => {
                  const commentData = document.data();
                  const userDocRef = doc(db, "users", commentData.userId);
                  const businessUserDocRef = doc(db, "business_users", commentData.userId);  
                  const userDoc = await getDoc(userDocRef);
    
                  let userName = "Anonymous"; 
                  let profileImage = "";
    
                  if (userDoc.exists()) {
                    userName = userDoc.data().fullName; 
                    profileImage = userDoc.data().profileImage;
                  } else {
                    const businessUserDoc = await getDoc(businessUserDocRef);
                  if (businessUserDoc.exists()) {
                    userName = businessUserDoc.data().stallName; 
                    profileImage = businessUserDoc.data().profileImage;
                    }
                  }
                  
                  return {
                      id: document.id,
                      user: userName,
                      profileImage: profileImage,
                      comment: commentData.comment,
                      createdAt: commentData.createdAt
                  };
              }));
    
              setComments(prevComments => [...prevComments, ...fetchedComments]);
              console.log("Fetched comments:", fetchedComments);
          } catch (error) {
              console.error("Failed to fetch comments:", error);
          }
      };
    
      if (isFocused) {
          fetchComments();
      }
    }, [isFocused, docId, db]);

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % foodImages.length);
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? foodImages.length - 1 : prevIndex - 1
    );
  };

  const toggleSave = async (docId) => {
      
        const user = auth.currentUser;
        if (!user) return Alert.alert("Not logged in", "You must be logged in to save a recipe.");
      
        const isSaved = savedRecipes[docId];
        const itemRef = collection(db, "saved");
        if (!isSaved) {
          await addDoc(itemRef, {
            uid: user.uid,
            itemId: docId,
            itemType: "recipe",
            savedAt: new Date()
          });
        } else {
          const q = query(itemRef, where("itemId", "==", docId), where("uid", "==", user.uid));
          const snapshot = await getDocs(q);
          snapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
        }
        setSavedRecipes(prev => ({ ...prev, [docId]: !isSaved }));
      };

  const handleAddComment = async () => {
      if (newComment.trim() === "") {
          console.log("No comment entered.");
          return;
      }
  
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
          console.log("No user logged in.");
          Alert.alert("Error", "You must be logged in to add a comment.");
          return;
      }
  
      let userName = "Anonymous";
      let profileImage = "";
  
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
          userName = userDoc.data().fullName || "Anonymous"; 
          profileImage = userDoc.data().profileImage;
      } else {
          const businessUserDocRef = doc(db, "business_users", user.uid);
          const businessUserDoc = await getDoc(businessUserDocRef);
          if (businessUserDoc.exists()) {
              userName = businessUserDoc.data().stallName || "Anonymous"; 
              profileImage = businessUserDoc.data().profileImage;
          }
      }
  
      const newCommentData = {
          userId: user.uid,
          user: userName, 
          comment: newComment,
          createdAt: new Date() 
      };
  
      try {
          const commentsCollectionRef = collection(db, "recipe", docId, "comments");
          await addDoc(commentsCollectionRef, newCommentData);
          newCommentData.profileImage = profileImage;
          
          setComments(prevComments => [...prevComments, newCommentData]);
          setNewComment("");
          console.log("Comment added successfully");
      } catch (error) {
          console.error("Error adding comment: ", error);
          Alert.alert("Error", "Failed to add comment: " + error.message);
      }
  };

  const [nutritionInfo, setNutritionInfo] = useState('');
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);

  const calculateNutrition = async () => {
    if (!ingredients.length) {
        console.log("No ingredients to evaluate.");
        return; 
    }
  
    const Ingredients = ingredients.map(ingredient => {
        const originalQuantity = parseFloat(ingredient.quantity);
        console.log("quantity:",ingredient.quantity);
        return `${originalQuantity} ${ingredient.unit} of ${ingredient.name}`;
    }).join(', ');
  
    const prompt = `List the estimated calories, fats, proteins, and carbohydrates for a recipe with the following ingredients: ${Ingredients}. Provide only the values.`;
  
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
            {
                prompt: prompt,
                max_tokens: 100,
                temperature: 0.3
            },
            {
                headers: {
                    'Authorization': `API KEY`,
                    'Content-Type': 'application/json'
                }
            }
        );
        setNutritionInfo(response.data.choices[0].text.trim());
        setShowNutritionInfo(true);
    } catch (error) {
        console.error('API request failed:', error);
        Alert.alert('API Error', 'Failed to fetch nutrition information.');
    }
  };

  const fetchDietaryAlternatives = async () => {
    try {
      const Ingredients = ingredients.map(ingredient => {
        const originalQuantity = parseFloat(ingredient.quantity);
        return `${originalQuantity} ${ingredient.unit} of ${ingredient.name}`;
    }).join(', ');

      
      const response = await axios.post('https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions', {
        prompt: `Given the ingredients: ${Ingredients}, provide alternative ingredients when it violates the following dietary restrictions: ${userDietInput} without explanation.`,
        max_tokens: 100,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `API KEY`,
          'Content-Type': 'application/json'
        }
      });
      setDietAlternatives(response.data.choices[0].text.trim());
    } catch (error) {
      console.error("API request failed:", error);
      Alert.alert("API Error", "Failed to fetch dietary alternatives.");
    }
    setUserDietModalVisible(false); 
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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
        
      {/* Food Image Section */}
      <View style={styles.imageContainer}>
        <TouchableOpacity onPress={handlePreviousImage} style={styles.arrow}>
          <AntDesign name="left" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
        {foodImages[currentImageIndex] && (
          <Image source={{ uri: foodImages[currentImageIndex] }} style={styles.foodImage} />
        )}
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNextImage} style={styles.arrow}>
          <AntDesign name="right" size={24} color="black" />
        </TouchableOpacity>
      </View>

      {/* Full-Screen Image Modal */}
    <Modal visible={modalVisible} transparent={true}>
        <View style={styles.modalContainer}>
        <TouchableOpacity onPress={handlePreviousImage} style={styles.modalArrowLeft}>
        <AntDesign name="left" size={30} color="white" />
        </TouchableOpacity>
        {foodImages[currentImageIndex] && (
          <Image source={{ uri: foodImages[currentImageIndex] }} style={styles.fullScreenImage} />
        )}
        <TouchableOpacity onPress={handleNextImage} style={styles.modalArrowRight}>
        <AntDesign name="right" size={30} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => setModalVisible(false)}
        >
        <AntDesign name="close" size={24} color="white" />
        </TouchableOpacity>
        </View>
    </Modal>
      
        {/* Recipe Title and Save Icon */}
        <View style={styles.titleContainer}>
          <Text style={styles.recipeTitle}>{recipeData ? recipeData.title : "Loading..."}</Text>
          <TouchableOpacity onPress={() => toggleSave(route.params.docId)}>
            <FontAwesome
              name={savedRecipes[route.params.docId] ? "bookmark" : "bookmark-o"}
              size={24}
              color={savedRecipes[route.params.docId] ? "blue" : "black"}
            />
          </TouchableOpacity>
        </View>

        {/* Servings Input */}
        <View style={styles.servingsContainer}>
          <Text style={styles.servingsLabel}>No. of serving:</Text>
          <TextInput
            style={styles.servingsInput}
            keyboardType="number-pad"
            value={servings.toString()} 
            onChangeText={handleServingsChange}
          />
          <TouchableOpacity onPress={calculateNutrition} style={styles.nutritionbutton}>
            <Text style={styles.nutritionbuttonText}>Nutritional Info</Text>
          </TouchableOpacity>
        </View>

      {/* Conditional Rendering for Nutrition Information */}
      {showNutritionInfo && nutritionInfo && (
        <View style={styles.section}>
          <Text style={styles.nutritionsectionTitle}>Nutrition Information:</Text>
          <Text style={styles.nutritionsectionContent}>{nutritionInfo}</Text>
        </View>
      )}

        {/* Ingredients */}
        <View style={styles.section}>
          
          <Text style={styles.sectionContent}>
          {renderIngredients()}
          </Text>

          {/* Button to trigger modal for dietary preferences */}
          <TouchableOpacity onPress={() => setUserDietModalVisible(true)} style={styles.dietarybutton}>
            <Text style={styles.dietarybuttonText}>Other Dietary Options</Text>
          </TouchableOpacity>

          {/* Modal for entering dietary preferences */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={userDietModalVisible}
            onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setUserDietModalVisible(false);  
          }}
          >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your dietary preferences or allergies here..."
                value={userDietInput}
                onChangeText={setUserDietInput}
                autoFocus={true}
              />
              <TouchableOpacity onPress={fetchDietaryAlternatives} style={styles.healthierButton}>
              <Text style={styles.healthierButtonText}>Submit</Text>
              </TouchableOpacity>
        
            </View>
          </View>
          </Modal>

          {/* Display alternatives if available */}
            {dietAlternatives && (
              <Text style={styles.healthierOptionsText}>{dietAlternatives}</Text>
            )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions:</Text>
          <Text style={styles.sectionContent}>
          {instructions}
          </Text>
        </View>

        {/* Comments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments:</Text>
          {comments.map((comment) => (
            <View key={`${comment.userId}-${comment.createdAt}`} style={styles.commentContainer}>
              <View style={styles.commentAvatar}>
                {comment.profileImage ? (
                  <Image
                    source={{ uri: comment.profileImage }}
                    style={styles.commentAvatarImage}
                  />
                ) : (
                  <Text style={styles.commentAvatarText}>
                    {comment.user ? comment.user.charAt(0) : "A"}
                  </Text>
                )}
              </View>
              <View>
                <Text style={styles.commentUser}>{comment.user}</Text>
                <Text style={styles.commentText}>{comment.comment}</Text>
              </View>
            </View>
          ))}
          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.addCommentInput}
              placeholder="Add a comment"
              value={newComment}
              onChangeText={(text) => setNewComment(text)}
            />
            <TouchableOpacity onPress={handleAddComment}>
              <AntDesign name="pluscircleo" size={24} color="blue" />
            </TouchableOpacity>
          </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
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
  imageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  foodImage: {
    width: 300,
    height: 200,
    borderRadius: 10,
  },
  arrow: {
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalArrowLeft: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: [{ translateY: -15 }],
    zIndex: 10,
  },
  modalArrowRight: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -15 }],
    zIndex: 10,
  },

  fullScreenImage: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },
  closeModalButton: {
    position: "absolute",
    top: 20,
    right: 20,
    padding: 10,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  servingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  servingsLabel: {
    fontSize: 16,
  },
  servingsInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    width: 50,
    height: 40,
    textAlign: "center",
    marginLeft: 10,
  },
  section: {
    marginVertical: 10,
    paddingHorizontal: 10,
    
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  sectionTitle1: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    marginHorizontal:-10,
  },
  healthierOptionsText: {
    color: 'green',
    padding: 10,
    fontSize: 16
  },
  healthierButton: {
    backgroundColor: '#4CAF50', 
    marginTop:5,
    marginBottom:5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5
  },
  healthierButtonText: {
    color: 'white',
    fontSize: 16
  }, 
  nutritionbutton: {
    backgroundColor: 'lightblue',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 10,
},
  nutritionbuttonText: {
    color: 'white',
    fontSize: 16
  },
  nutritionsectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: 'blue'
  },
  nutritionsectionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: 'blue'
  },
  dietarybutton: {
    backgroundColor: 'grey',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 10,
    marginRight:150,
    marginTop:5,
},
  dietarybuttonText: {
    color: 'white',
    fontSize: 16
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    width: '80%',
    marginBottom: 20,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  commentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  commentAvatar: {
    backgroundColor: "#007BFF",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  commentAvatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  commentAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc", 
    overflow: "hidden",
  },
  commentUser: {
    fontWeight: "bold",
  },
  commentText: {
    fontSize: 14,
    color: "#555",
  },
  addCommentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  addCommentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
    marginRight: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "white",
  },
});
