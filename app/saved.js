import React, { useState, useEffect } from "react";
import {View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, getDocs, getDoc } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { Linking } from 'react-native';

export default function Saved() {
  const db = getFirestore();
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const auth = getAuth();
  const [savedReviews, setSavedReviews] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchSavedItems(user.uid);
      } else {
        setSavedReviews([]);
        setSavedRecipes([]);
      }
    });

    return () => unsubscribe(); 
  }, []);

  const fetchSavedItems = async (uid) => {
    const itemRef = collection(db, "saved");
    const q = query(itemRef, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    const reviews = [];
    const recipes = [];

    for (const docSnapshot of querySnapshot.docs) {
        const item = docSnapshot.data();
        const detailRef = doc(db, item.itemType === 'review' ? 'reviews' : 'recipe', item.itemId);
        const detailDoc = await getDoc(detailRef); 

        if (detailDoc.exists()) {
            const itemData = detailDoc.data();
            const formattedItem = {
                id: item.itemId, 
                title: itemData.title,
                author: itemData.author, 
                isSaved: true,
                type: item.itemType
            };

            if (item.itemType === 'review') {
                reviews.push(formattedItem);
            } else {
                recipes.push(formattedItem);
            }
        }
    }

    setSavedReviews(reviews);
    setSavedRecipes(recipes);
};

const toggleSave = async (item, isSaved) => {
  const user = auth.currentUser;
  if (!user) {
      Alert.alert("Not logged in", "You must be logged in to save items.");
      return;
  }

  const { id, type } = item; 
  const itemRef = collection(db, "saved");

  if (!isSaved) {
      await addDoc(itemRef, {
          uid: user.uid,
          itemId: id,
          itemType: type,
          savedAt: new Date()
      });
  } else {
      const q = query(itemRef, where("itemId", "==", id), where("uid", "==", user.uid));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
      });
  }

  // Update the local state to reflect this change
  if (type === 'review') {
      setSavedReviews(prev => ({ ...prev, [id]: !isSaved }));
  } else if (type === 'recipe') {
      setSavedRecipes(prev => ({ ...prev, [id]: !isSaved }));
  }
};

  const navigateToDetail = (item) => {
  
    navigation.navigate(item.type === 'review' ? 'review' : 'recipe', { docId: item.id });
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

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.mainContent}>
        {/* Saved Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Reviews</Text>
          {savedReviews.length > 0 ? savedReviews.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigateToDetail(item)}
            >
              <Image
                source={require("../assets/images/Makan Family-logo.png")}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
              
                <Text style={styles.cardAuthor}>By: {item.author}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleSave(item, item.isSaved)}
              >
                <FontAwesome name={item.isSaved ? "bookmark" : "bookmark-o"} size={24} color="blue" />
              </TouchableOpacity>
            </TouchableOpacity>
          )) : <Text>No saved reviews.</Text>}
        </View>

        {/* Saved Recipes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Recipes</Text>
          {savedRecipes.length > 0 ? savedRecipes.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => navigateToDetail(item)}
            >
              <Image
                source={require("../assets/images/Makan Family-logo.png")}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                
                <Text style={styles.cardAuthor}>By: {item.author}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleSave(item, item.isSaved)}
              >
                <FontAwesome name={item.isSaved ? "bookmark" : "bookmark-o"} size={24} color="blue" />
              </TouchableOpacity>
            </TouchableOpacity>
          )) : <Text>No saved recipes.</Text>}
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
    backgroundColor: "white",
    elevation: 3,
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
  mainContent: {
    padding: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    elevation: 1,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  cardContent: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  starsContainer: {
    flexDirection: "row",
    marginVertical: 5,
  },
  cardAuthor: {
    fontSize: 12,
    color: "gray",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
});
