import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Alert, Text } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import { FontAwesome, AntDesign } from '@expo/vector-icons';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged, updatePassword } from 'firebase/auth';
import { app } from './firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Linking } from 'react-native';

export default function ProfileUser() {
  const navigation = useNavigation();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [formData, setFormData] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    gender: '',
    dob: '',
    password: '',
    confirmPassword: '',
    foodAllergy: '',
    foodPreference: '',
    dietaryRestriction: '',
  });
  const [errors, setErrors] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);

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
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        fetchData(userDocRef);
      } else {
        Alert.alert('Authentication Error', 'You are not logged in.');
        navigation.navigate('signup_login');
      }
    });

    return unsubscribe;
  }, []);

  const fetchData = async (userDocRef) => {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log("Fetched user data:", docSnap.data());
      const userData = docSnap.data();
      setFormData({
        ...userData,
        dob: userData.dateofbirth,  
        dateofbirth: undefined      
      });
      setImageUri(userData.profileImage || null); 
    } else {
      console.log("No user data found at:", userDocRef.path);
      Alert.alert('Error', 'No user data found.');
    }
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
    const fileName = `profile_images/${Date.now()}.jpg`;
    const storageRef = ref(storage, fileName);

    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          // Handle progress
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
  

  const handleInputChange = (field, value) => {
    setFormData(prevState => ({ ...prevState, [field]: value }));
    if (errors[field]) {
      setErrors(prevErrors => ({ ...prevErrors, [field]: null }));
    }
  };

  const validateForm = () => {
    let valid = true;
    let newErrors = {};
    const requiredFields = ['fullName', 'contactNumber', 'email', 'gender', 'dob'];
    requiredFields.forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = 'This field is required';
        valid = false;
      }
    });
    if (formData.password != null) {
      if (formData.password.length < 6) {
        newErrors['password'] = 'Password must be at least 6 characters long';
        valid = false;
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors['confirmPassword'] = 'Passwords do not match';
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  };

  const handlePasswordUpdate = async (newPassword) => {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (user) {
        try {
            await updatePassword(user, newPassword);
            console.log("Password updated successfully!");
            return true;
        } catch (error) {
            console.error("Error updating password: ", error);
            Alert.alert('Update Error', `Failed to update password: ${error.message}`);
            return false; 
        }
    } else {
        Alert.alert("Update Error", "No user logged in.");
        return false; 
    }
};



  const handleUpdate = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    let imageUrl = null;
    if (imageUri) {
        imageUrl = await uploadImage(imageUri); 
    }

   if (formData.password != null) {
    await handlePasswordUpdate(formData.password);
  }

      try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
  
        const updatedData = {
          ...formData,
          profileImage: imageUrl, 
          dateofbirth: formData.dob, 
        };
  
        delete updatedData.password;
        delete updatedData.confirmPassword; 
        
        Object.keys(updatedData).forEach(key => {
          if (updatedData[key] === undefined) {
           delete updatedData[key];
          }
        });
  
        await updateDoc(userDocRef, updatedData);
        console.log("Update successful");
        Alert.alert('Success', 'Profile updated successfully!');
        navigation.navigate('index');
      } catch (error) {
        console.error("Error updating profile: ", error);
        Alert.alert('Update Error', `Failed to update profile: ${error.message}`);
      }
  };
  
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../assets/images/Makan Family-logo.png')} style={styles.logo} />
        <TouchableOpacity
            onPress={() => setMenuVisible(!menuVisible)}
            style={styles.hamburger}>
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

      {/* Profile Photo */}
      <TouchableOpacity style={styles.profilePhotoContainer} onPress={pickImage}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.imageUpload}
            resizeMode="cover"
            onError={(e) => console.log('Failed to load image:', e.nativeEvent.error)}
          />
        ) : (
          <Text style={styles.profilePhotoText}>Add Profile Photo</Text>
        )}
      </TouchableOpacity>

      {/* Form Fields */}
      <View style={styles.formContainer}>
      {[
        { key: 'fullName', label: 'Full Name', secure: false },
        { key: 'contactNumber', label: 'Contact Number', secure: false },
        { key: 'email', label: 'Email', secure: false, editable: false },
        { key: 'gender', label: 'Gender', secure: false },
        { key: 'dob', label: 'Date of Birth', secure: false },
        { key: 'password', label: 'New Password', secure: true },
        { key: 'confirmPassword', label: 'Confirm New Password', secure: true },
        { key: 'foodAllergy', label: 'Food Allergy', secure: false },
        { key: 'foodPreference', label: 'Food Preference', secure: false },
        { key: 'dietaryRestriction', label: 'Dietary Restriction', secure: false }
        ].map((field, index) => (
        <View key={index}>
            <TextInput
                placeholder={field.label}
                secureTextEntry={field.secure}
                value={formData[field.key]}
                onChangeText={(text) => handleInputChange(field.key, text)}
                style={[styles.input, errors[field.key] ? { borderColor: 'red' } : {}]}
                editable={field.editable}
            />
            {errors[field.key] && <Text style={styles.errorText}>{errors[field.key]}</Text>}
        </View>
        ))}
        {/* Submit Button */}
        <Button mode="contained" style={styles.submitButton} onPress={handleUpdate}>
          Update
        </Button>
      </View>

      {/* Bottom Icons */}
      <View style={styles.bottomContainer}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
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
  imageUpload: {
    alignItems: "center",
    justifyContent: "center",
    marginTop:10,
    marginBottom: 10,
    height: 120,
    width: '100%' ,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 60,
    backgroundColor: "#f9f9f9",
  },
  profilePhotoContainer: {
    marginVertical: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoText: {
    color: '#888',
    fontSize: 14,
  },
  formContainer: {
    width: '90%',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 60, 
  },
  submitButton: {
    marginTop: 10,
  },
  bottomContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 5,
    marginLeft: 15,
}
});
