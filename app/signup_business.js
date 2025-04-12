import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Text, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { FontAwesome, AntDesign } from '@expo/vector-icons';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc  } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Linking } from 'react-native';

export default function SignUpBusiness() {
  const [formData, setFormData] = useState({
    stallName: '',
    location: '',
    openingHours: '',
    contactNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileImage: null,
  });
  const [errors, setErrors] = useState({});
  const navigation = useNavigation();

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      let newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
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

  const validateForm = () => {
    let valid = true;
    let newErrors = {};
    const requiredFields = ['stallName', 'location', 'openingHours', 'contactNumber', 'email', 'password', 'confirmPassword'];

    requiredFields.forEach((field) => {
      if (!formData[field] || formData[field].trim() === '') {
        newErrors[field] = 'This field is required';
        valid = false;
      }
    });

    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors['confirmPassword'] = 'Passwords do not match';
      valid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
        newErrors['email'] = 'Invalid email format';
        valid = false;
    }

    // Contact number validation
    if (formData.contactNumber && !/^[\d+\s]+$/.test(formData.contactNumber)) {
      newErrors['contactNumber'] = 'Contact number must be numeric';
      valid = false;
   }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&])[A-Za-z\d@#$!%*?&]{8,}$/;
    if (formData.password && !passwordRegex.test(formData.password)) {
        newErrors['password'] = 'Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one numeric character and one special character';
        valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const submitBusinessUserData = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    try {
      const imageUrl = imageUri ? await uploadImage(imageUri) : null; 
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const db = getFirestore(app);
      const userDocRef = doc(db, 'business_users', userCredential.user.uid); 
      delete formData.password;
      delete formData.confirmPassword;
      await setDoc(userDocRef, {
        ...formData,
        profileImage: imageUrl,
        createdAt: new Date(),
      });

      Alert.alert('Success', 'Business user successfully registered!');
      navigation.navigate('index');
    } catch (error) {
      Alert.alert('Registration Error', `Failed to create user: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/Makan Family-logo.png')} style={styles.logo} />
      </View>
      {/* Upload Image */}
        <TouchableOpacity 
          style={styles.uploadImageContainer} 
          onPress={pickImage}
          >
          {imageUri ? (
          <Image
            source={{ uri: imageUri }}
          style={styles.imageUpload}
          resizeMode="cover"
          onError={(e) => console.log('Failed to load image:', e.nativeEvent.error)} 
          />
          ) : (
            <>
              <FontAwesome name="plus-circle" size={50} color="#000" />
              <Text style={styles.uploadImageText}>Upload Image (Optional)</Text>
            </>
          )}
        </TouchableOpacity>

      <View style={styles.formContainer}>
        {[
              { key: 'stallName', label: 'Full Name*', secure: false },
              { key: 'location', label: 'Location*', secure: false },
              { key: 'openingHours', label: 'Opening Hours*', secure: false},
              { key: 'contactNumber', label: 'Contact Number*', secure: false },
              { key: 'email', label: 'Email*', secure: false}, 
              { key: 'password', label: 'Password*', secure: true },
              { key: 'confirmPassword', label: 'Confirm Password*', secure: true },
              ].map((field, index) => (
              <View key={index}>
                  <TextInput
                      placeholder={field.label}
                      secureTextEntry={field.secure}
                      value={formData[field.key]}
                      onChangeText={(text) => handleInputChange(field.key, text)}
                      style={[styles.input, errors[field.key] ? { borderColor: 'red' } : {}]}
                  />
                  {errors[field.key] && <Text style={styles.errorText}>{errors[field.key]}</Text>}
              </View>
              ))}
        <Button mode="contained" onPress={submitBusinessUserData}>
          Submit
        </Button>
      </View>

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
  uploadImageContainer: {
    marginVertical: 20,
    width: '90%',
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
  profilePhotoImage: {
    width: '100%',
    height: '100%',
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
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 5,
    marginLeft: 15,
  },
  bottomContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
});
