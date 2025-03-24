import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Button, Text, Switch } from 'react-native-paper';
import { useNavigation } from 'expo-router';
import { FontAwesome, AntDesign } from '@expo/vector-icons';
import { Linking } from 'react-native';

export default function SignUpLogin() {
  const [isBusiness, setIsBusiness] = useState(false);
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/Makan Family-logo.png')} 
          style={styles.logoTopLeft}
        />
      </View>

      {/* Background Image */}
      <Image
        source={require('../assets/images/background_signup.png')} 
        style={styles.backgroundImage}
      />

      {/* Dark Overlay */}
      <View style={styles.darkOverlay} />

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Heading */}
        <Text style={styles.heading} variant="displaySmall">
          Makan Family
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => {
              console.log('Sign Up Pressed');
              if (isBusiness) {
                navigation.navigate('signup_business'); 
              } else {
                navigation.navigate('signup_user'); 
              }
            }}
            style={styles.buttonSignUp}
          >
            Sign Up
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              console.log('Login Pressed');
              navigation.navigate('login', { isBusiness }); 
            }}
            style={styles.buttonLogin}
          >
            Login
          </Button>
        </View>

        {/* Switch */}
        <View style={styles.switchContainer}>
          <Switch
            value={isBusiness}
            onValueChange={() => setIsBusiness(!isBusiness)}
          />
          <Text style={styles.switchText}>Business account</Text>
        </View>
      </View>

      {/* Bottom Section with White Background and Black Icons */}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', 
  },
  logoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'white',
    justifyContent: 'center',
    padding: 20,
    zIndex: 20,
  },
  logoTopLeft: {
    width: 50,
    height: 50,
  },
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 100,
  },
  heading: {
    fontSize: 42,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  buttonSignUp: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'green',
  },
  buttonLogin: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#90CE90',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  switchText: {
    color: 'white',
    marginLeft: 8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 80,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
