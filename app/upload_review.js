import React, { useState, useEffect } from "react";
import {View, Text, TextInput, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { Button } from "react-native-paper";
import { useNavigation } from "expo-router";
import { getFirestore, collection, addDoc, doc, getDoc} from 'firebase/firestore';
import { app } from './firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getAuth, signOut } from 'firebase/auth';
import { Linking } from 'react-native';

export default function UploadReview() {
  const auth = getAuth(app);
  const user = auth.currentUser; 
  const uid = user ? user.uid : null; 
  const [errors, setErrors] = useState({});
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const [reviewData, setReviewData] = useState({
    title: '',
    stallName: '',
    location: '',
    openingHours: '',
    experience: '',
  });

  const fetchUserName = async (uid) => {
      const db = getFirestore(app);
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
    
      if (userSnap.exists()) {
        return userSnap.data().fullName;
      } else {
        const businessUserRef = doc(db, "business_users", uid);
        const businessUserSnap = await getDoc(businessUserRef);
    
        if (businessUserSnap.exists()) {
          console.log("User found in 'business_users' collection.");
          return businessUserSnap.data().stallName;
        }
    
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

  const handleInputChange = (field, value) => {
    setReviewData(prev => ({ ...prev, [field]: value }));
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
    const fileName = `review_images/${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);

    const uploadTask = uploadBytesResumable(storageRef, blob);
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          console.error("Error uploading image: ", error);
          Alert.alert('Upload Error', error.message);
          reject(null);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
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
    if (!reviewData.title.trim()) {
        newErrors.title = 'Title is required';
        valid = false;
    }

    // Validate servings
    if (!reviewData.stallName.trim()) {
        newErrors.stallName = 'Name of the stall/restaurant is required';
        valid = false;
    }

    // Validate ingredients
    if (!reviewData.location.trim()) {
      newErrors.location = 'Location of the stall/restaurant is required';
      valid = false;
  }

    // Validate instructions
    if (!reviewData.experience.trim()) {
        newErrors.experience = 'Your experience is required';
        valid = false;
    }

    setErrors(newErrors);
    return valid;
};

  const handleSubmit = async () => {
    if (!uid) {
      Alert.alert("Error", "You must be logged in to submit a review.");
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

    const imageUrl = imageUri ? await uploadImage(imageUri) : null;
    try {
      const docRef = await addDoc(collection(getFirestore(app), "reviews"), {
        ...reviewData,
        imageUrl,
        uid, 
        author: authorName,
        created_at: new Date()
      });
      console.log("Review document written with ID: ", docRef.id);
      Alert.alert("Success", "Recipe successfully uploaded!", [
        { text: "OK", onPress: () => navigation.navigate("index") }
      ]);
    } catch (e) {
      console.error("Error adding review: ", e);
      Alert.alert("Error", "Failed to upload the review.", [
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

      {/* Upload Review Section */}
      <ScrollView style={styles.scrollableContent}>
        <View style={styles.uploadContainer}>
          <Text style={styles.title}>Upload Review</Text>

          <TouchableOpacity 
          style={styles.uploadImageContainer} 
          onPress={pickImage}
          >
          {imageUri ? (
          <Image
            source={{ uri: imageUri }}
          style={styles.imageUpload}
          resizeMode="contain"
          onError={(e) => console.log('Failed to load image:', e.nativeEvent.error)}
          />
          ) : (
            <>
              <FontAwesome name="plus-circle" size={50} color="#000" />
              <Text style={styles.uploadImageText}>Upload Image (Optional)</Text>
            </>
          )}
        </TouchableOpacity>

          {/* Form fields */}
          <TextInput style={[styles.input, errors.title ? { borderColor: 'red' } : {}]} placeholder="Title" value={reviewData.title} onChangeText={(text) => handleInputChange('title', text)} />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          <TextInput style={[styles.input, errors.stallName ? { borderColor: 'red' } : {}]} placeholder="Name of the Stall/Restaurant" value={reviewData.stallName} onChangeText={(text) => handleInputChange('stallName', text)} />
          {errors.stallName && <Text style={styles.errorText}>{errors.stallName}</Text>}
          <TextInput style={[styles.input, errors.location ? { borderColor: 'red' } : {}]} placeholder="Location" value={reviewData.location} onChangeText={(text) => handleInputChange('location', text)} />
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
          <TextInput style={styles.input} placeholder="Opening hours (if any)" value={reviewData.openingHours} onChangeText={(text) => handleInputChange('openingHours', text)} />
          <TextInput
            style={[styles.input, styles.textArea, errors.experience ? { borderColor: 'red' } : {}]}
            placeholder="Your experience"
            multiline
            numberOfLines={4}
            value={reviewData.experience}
            onChangeText={(text) => handleInputChange('experience', text)}
          />
          {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}
          {/* Submit button */}
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
  uploadContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  imageUpload: {
    alignItems: "center",
    justifyContent: "center",
    marginTop:10,
    marginBottom: 10,
    height: 150,
    width: '100%',
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
  textArea: {
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
    marginTop: -10,
    marginBottom: 5,
    marginLeft: 15,
  },
});
