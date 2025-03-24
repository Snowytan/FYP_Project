import React, { useState } from 'react';
import { View, StyleSheet, Image, TextInput, TouchableOpacity } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { FontAwesome, AntDesign } from '@expo/vector-icons';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { app } from './firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Linking } from 'react-native';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const navigation = useNavigation();
  const auth = getAuth(app);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSignIn = () => {
    const { email, password } = formData;
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log('User signed in:', userCredential.user);
        navigation.navigate('index'); 
      })
      .catch((error) => {
        console.error('Error signing in:', error);
        alert('Error signing in. Check your email and password or create an account.');
      });
  };

  const handleForgotPassword = (email) => {
    if (!email) {
      alert('Please enter your email address to receive a reset link.');
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => {
        alert('Password reset link sent! Check your email.');
      })
      .catch((error) => {
        console.error('Error sending password reset email:', error);
        alert('Failed to send password reset email. Please try again.');
      });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/images/Makan Family-logo.png')} style={styles.logo} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="Enter your email"
          keyboardType="email-address"
          value={formData.email}
          onChangeText={(text) => handleInputChange('email', text)}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Enter your password"
          secureTextEntry
          value={formData.password}
          onChangeText={(text) => handleInputChange('password', text)}
          style={styles.input}
        />

        <Button mode="contained" onPress={handleSignIn} style={styles.signInButton}>
          Sign In
        </Button>

        <TouchableOpacity onPress={() => handleForgotPassword(formData.email)}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'left',
    padding: 20
  },
  logo: {
    width: 50,
    height: 50,
  },
  formContainer: {
    width: '90%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
    width: '100%',
  },
  signInButton: {
    marginVertical: 10,
  },
  forgotPassword: {
    color: 'blue',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
});
