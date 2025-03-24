import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, TextInput, Modal, Alert } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getAuth, signOut } from "firebase/auth";
import { Linking } from 'react-native';

export default function Index() {
  const auth = getAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigation = useNavigation();
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

    const openAIPrompt = `The image analysis detected these possibilities: ${formattedLabels}. 
    Based on this, what is the most likely dish? Provide a one line explanation about the dish.`;

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
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)} 
        onSubmitEditing={() => {
        navigation.navigate("search_result", { query: searchQuery });
        }} 
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
              //setMenuVisible(false);
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

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.mainContent}>
        {/* Section: Popular Foods */}
        <View style={styles.section}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionTitle}>Home</Text>
          </View>
          
            <Text style={styles.sectionSubtitle}>Popular foods in Singapore</Text>
          
          <View style={styles.foodContainer}>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Chicken rice' })}>
              <Image
              source={require("../assets/images/chicken_rice.png")}
              style={styles.imageStyle}
              />
              <Text>Chicken rice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Nasi Lemak' })}>
              <Image
              source={require("../assets/images/nasi lemak_1.png")}
              style={styles.imageStyle}
              />
              <Text>Nasi Lemak</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Hokkien Mee' })}>
              <Image
              source={require("../assets/images/hokkien_mee.png")}
              style={styles.imageStyle}
              />
              <Text>Hokkien Mee</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Laksa' })}>
              <Image
              source={require("../assets/images/laksa.png")}
              style={styles.imageStyle}
              />
              <Text>Laksa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Roti Prata' })}>
              <Image
              source={require("../assets/images/roti_prata.png")}
              style={styles.imageStyle}
              />
              <Text>Roti Prata</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Bak Kut Teh' })}>
              <Image
              source={require("../assets/images/bak_kut_teh.png")}
              style={styles.imageStyle}
              />
              <Text>Bak Kut Teh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Chilli Crab' })}>
              <Image
              source={require("../assets/images/chilli_crab.png")}
              style={styles.imageStyle}
              />
              <Text>Chilli Crab</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Satay' })}>
              <Image
              source={require("../assets/images/satay.png")}
              style={styles.imageStyle}
              />
              <Text>Satay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.foodItem} onPress={() => navigation.navigate('search_result', { query: 'Kaya Toast' })}>
              <Image
              source={require("../assets/images/kaya_toast.png")}
              style={styles.imageStyle}
              />
              <Text>Kaya Toast</Text>
            </TouchableOpacity>
          </View>
        </View>
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

export const styles = StyleSheet.create({
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
  mainContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  sectionRow: {
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  sectionSubtitle: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  foodContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: 'wrap'
  },
  foodItem: {
    width: 100,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  signupButton: {
    position: "absolute",
    bottom: 80,
    left: 20,
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  signupButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
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
  },
  imageStyle: {
    width: 100,
    height: 70,
    borderRadius: 10,
  }
});
