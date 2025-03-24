import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getFirestore, collection, addDoc, doc, query, where, getDocs, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";
import { Linking } from 'react-native';

export default function Chat() {
  const db = getFirestore();
  const auth = getAuth();
  const route = useRoute();
  const { chatId, otherUserId, userName } = route.params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatDocId, setChatDocId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const navigation = useNavigation();

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
    console.log("Other User ID:", otherUserId);
    console.log("Chat Document ID:", chatDocId);
  }, [otherUserId, chatDocId]);

  useEffect(() => {
    console.log("Received userName:", userName);
  }, [userName]);

  useEffect(() => {
    if (!auth.currentUser || !otherUserId) return;
    const currentUserId = auth.currentUser.uid;

    const findOrCreateChat = async () => {
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", currentUserId));
      const snapshot = await getDocs(q);
      const chat = snapshot.docs.find(doc => doc.data().participants.includes(otherUserId));

      if (chat) {
        setChatDocId(chat.id);
      } else {
        
        const newChatRef = doc(collection(db, "chats"));
        await setDoc(newChatRef, {
          participants: [currentUserId, otherUserId]
        });
        setChatDocId(newChatRef.id);
      }
    };

    findOrCreateChat();
  }, [otherUserId]);
  

  useEffect(() => {
    if (chatDocId) {  
      const messagesRef = collection(db, "chats", chatDocId, "messages");
      const q = query(messagesRef, orderBy("timestamp", "asc")); 
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          text: doc.data().message,  
          userId: doc.data().userId,  
          timestamp: doc.data().timestamp,
        }));
        setMessages(loadedMessages);
        console.log("Messages loaded:", loadedMessages);  
      });
  
      return () => unsubscribe();  
    }
  }, [chatDocId]);  

  const sendMessage = async () => {
    if (newMessage.trim() === "") return;

    const messagesRef = collection(db, "chats", chatDocId, "messages");
    await addDoc(messagesRef, {
      userId: auth.currentUser.uid,
      message: newMessage,
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };


  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={require("../assets/images/Makan Family-logo.png")}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>{userName}</Text>
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => setMenuVisible(!menuVisible)}
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

      {/* Chat Messages */}
      <ScrollView style={styles.messagesContainer}>
        {messages.map((msg) => (
        <View key={msg.id} style={[
          styles.messageBubble,
          msg.userId === auth.currentUser.uid ? styles.userBubble : styles.senderBubble,  
          ]}>
          <Text style={styles.messageText}>{msg.text}</Text>
        </View>
        ))}
      </ScrollView>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Message"
          value={newMessage}
          onChangeText={(text) => setNewMessage(text)}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <AntDesign name="arrowright" size={24} color="white" />
        </TouchableOpacity>
      </View>

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
    headerTitle: {
      fontSize: 18,
      fontWeight: "bold",
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
    messagesContainer: {
      flex: 1,
      padding: 10,
    },
    messageBubble: {
      padding: 10,
      marginVertical: 5,
      borderRadius: 10,
      maxWidth: "80%",
    },
    senderBubble: {
      backgroundColor: "#E8F5E9", 
      alignSelf: "flex-start",
    },
    userBubble: {
      backgroundColor: "#4CAF50", 
      alignSelf: "flex-end",
    },
    messageUser: {
      fontWeight: "bold",
      marginBottom: 5,
      color: "#388E3C", 
    },
    messageText: {
      color: "black", 
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: "#ddd",
    },
    messageInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 20,
      paddingHorizontal: 15,
      height: 40,
      marginRight: 10,
    },
    sendButton: {
      backgroundColor: "#4CAF50",
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
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
  

