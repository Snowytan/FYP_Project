import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, ActivityIndicator, Alert } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import React, { useState, useEffect } from "react";
import { getFirestore, collection, doc, addDoc, deleteDoc, getDoc, onSnapshot, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import axios from 'axios';
import { Linking } from 'react-native';

export default function Review() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [foodImages, setFoodImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [savedReviews, setSavedReviews] = useState({});
    const [modalVisible, setModalVisible] = useState(false);
  const { docId } = route.params; 
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
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
          const q = query(savedRef, where("uid", "==", user.uid), where("itemType", "==", "review"));
          const snapshot = await getDocs(q);
          const savedStatus = {};
          snapshot.forEach(doc => {
            savedStatus[doc.data().itemId] = true; 
          });
          setSavedReviews(savedStatus);
        }
      };
    
      fetchSavedStatus();
    }, [auth.currentUser]);

  useEffect(() => {
    const fetchReviewAndUserNames = async () => {
      const docId = route.params?.docId;
      const reviewDocRef = doc(collection(db, 'reviews'), docId);
      const reviewDoc = await getDoc(reviewDocRef);
      
      if (reviewDoc.exists()) {
        const data = reviewDoc.data();
        setReviewData(data);

        if (data.imageUrls && data.imageUrls.length > 0) { 
          setFoodImages(data.imageUrls);
        } else if (data.imageUrl) { 
          setFoodImages([data.imageUrl]); 
        }
  
      let userName = "Anonymous";
      let profileImage = "";

      const userDocRef = doc(db, 'users', data.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        userName = userDoc.data().fullName || "Anonymous"; 
        profileImage = userDoc.data().profileImage;
      } else {

        const businessUserDocRef = doc(db, 'business_users', data.uid);
        const businessUserDoc = await getDoc(businessUserDocRef);
        if (businessUserDoc.exists()) {
          userName = businessUserDoc.data().stallName || "Anonymous"; 
          profileImage = businessUserDoc.data().profileImage;
        }
      }
  
        let initialComments = [];
        if (typeof data.experience === 'string' && data.experience.trim() !== "") {
          initialComments = [{ user: userName, comment: data.experience, profileImage: profileImage }];
        }
        setComments(initialComments);
      } else {
        console.log('No such review!');
        Alert.alert("Error", "No such review found.");
      }
    };
  
    fetchReviewAndUserNames();
  }, [docId, db]);

  useEffect(() => {
    const reviewDocRef = doc(collection(db, 'reviews'), docId);
    const unsubscribe = onSnapshot(reviewDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setReviewData(data);
        let initialComments = [];
        if (typeof data.experience === 'string' && data.experience.trim() !== "") {
          initialComments = [{ user: "Anonymous", comment: data.experience }];
        }
        setComments(initialComments);
      } else {
        console.log('No such review!');
        Alert.alert("Error", "No such review found.");
      }
    });
  
    return () => unsubscribe(); 
  }, [docId]);

 useEffect(() => {
  const fetchComments = async () => {
      try {
          const commentsCollectionRef = collection(db, "reviews", docId, "comments");
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

  const [newComment, setNewComment] = useState("");

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
      if (!user) return Alert.alert("Not logged in", "You must be logged in to save a review.");
    
      const isSaved = savedReviews[docId];
      const itemRef = collection(db, "saved");
      if (!isSaved) {
        await addDoc(itemRef, {
          uid: user.uid,
          itemId: docId,
          itemType: "review",
          savedAt: new Date()
        });
      } else {
        const q = query(itemRef, where("itemId", "==", docId), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      setSavedReviews(prev => ({ ...prev, [docId]: !isSaved }));
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
        const commentsCollectionRef = collection(db, "reviews", docId, "comments");
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
  if (!reviewData?.title) {
      console.log("Review title is missing.");
      Alert.alert("Error", "No food name available to evaluate nutrition.");
      return;
  }

  const foodName = reviewData.title;

  const prompt = `Estimate the calories, fats, proteins, and carbohydrates for the food item named "${foodName}". Provide only the values.`;

  try {
      const response = await axios.post('https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions',
          {
              prompt: prompt,
              max_tokens: 150,
              temperature: 0.3,
          },
          {
              headers: {
                  'Authorization': `API KEY`, 
                  'Content-Type': 'application/json'
              }
          }
      );

      const nutritionInfo = response.data.choices[0].text.trim();
      if (nutritionInfo) {
          setNutritionInfo(nutritionInfo);
          setShowNutritionInfo(true);
      } else {
          setNutritionInfo("No nutritional information could be generated.");
          setShowNutritionInfo(true);
      }
  } catch (error) {
      console.error('API request failed:', error);
      Alert.alert('API Error', 'Failed to fetch nutrition information.');
  }
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
          <Image 
            source={foodImages[currentImageIndex] ? { uri: foodImages[currentImageIndex] } : require("../assets/images/Makan Family-logo.png")}
            style={styles.foodImage} 
          />
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
                <Image 
                  source={foodImages[currentImageIndex] ? { uri: foodImages[currentImageIndex] } : require("../assets/images/Makan Family-logo.png")}
                  style={styles.fullScreenImage} 
                />
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

        {/* Review Title and Save Icon */}
        <View style={styles.titleContainer}>
          <Text style={styles.reviewTitle}>{reviewData?.title}</Text>
          <TouchableOpacity onPress={() => toggleSave(route.params.docId)}>
            <FontAwesome
              name={savedReviews[route.params.docId] ? "bookmark" : "bookmark-o"}
              size={24}
              color={savedReviews[route.params.docId] ? "blue" : "black"}
            />
          </TouchableOpacity>
        </View>

        {/* Review Details */}
        <View style={styles.section}>
          <Text style={styles.detail}>
            <Text style={styles.label}>Stall/Restaurant name:</Text> {reviewData?.stallName} </Text>
          <Text style={styles.detail}>
            <Text style={styles.label}>Location:</Text> {reviewData?.location} </Text>
          <Text style={styles.detail}>
            <Text style={styles.label}>Opening hours:</Text> {reviewData?.openingHours} </Text>
        </View>

        {/* Nutrition Info */}
          <View>
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
      reviewTitle: {
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
        height: 30,
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
      sectionContent: {
        fontSize: 16,
        lineHeight: 24,
      },
      nutritionbutton: {
        backgroundColor: 'lightblue',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        marginLeft: 10,
        marginRight: 220,
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
  scrollableContent: {
    flex: 1,
  },
});
