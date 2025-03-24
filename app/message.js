import React, { useState, useEffect} from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput } from "react-native";
import { FontAwesome, AntDesign } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { getFirestore, collection, query, where, getDocs, getDoc, setDoc, doc, orderBy, limit } from 'firebase/firestore';
import { getAuth, signOut } from "firebase/auth";
import { Linking } from 'react-native';

export default function Message() {
  const db = getFirestore();
  const auth = getAuth();
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [uploadSubMenuVisible, setUploadSubMenuVisible] = useState(false);
  const [profileSubMenuVisible, setprofileSubMenuVisible] = useState(false);
  const [chats, setChats] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

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
  
  const getUserDetails = async (userId) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
  
    if (userSnap.exists()) {
      return { name: userSnap.data().fullName, type: 'User', profileImage: userSnap.data().profileImage };
    } else {
      const businessRef = doc(db, "business_users", userId);
      const businessSnap = await getDoc(businessRef);
      if (businessSnap.exists()) {
        return { name: businessSnap.data().stallName, type: 'Business', profileImage: businessSnap.data().profileImage };
      }
    }
    return { name: "Unknown", type: 'Unknown' }; 
  };

  const getLastMessage = async (chatId) => {
    console.log("Fetching last message for chat ID:", chatId);  
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
    const messageSnap = await getDocs(q);
    const lastMessage = messageSnap.docs[0]?.data() || { text: "No messages yet" };
    console.log("Last message: ", lastMessage); 
    return lastMessage;
  };

  useEffect(() => {
    const fetchChats = async () => {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;
  
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", currentUserId));
      const querySnapshot = await getDocs(q);
      
      const chatPromises = querySnapshot.docs.map(async (doc) => {
        const otherUserId = doc.data().participants.find(id => id !== currentUserId);
        const userDetails = await getUserDetails(otherUserId);
        const lastMessage = await getLastMessage(doc.id);
        
        return {
          id: doc.id,
          otherUserId: otherUserId,
          name: userDetails.name,
          preview: lastMessage.message,
          type: userDetails.type,
          profileImage: userDetails.profileImage
        };
      });
  
      try {
        const loadedChats = await Promise.all(chatPromises);
        setChats(loadedChats);
      } catch (error) {
        console.error("Error fetching chats: ", error);
      }
    };
  
    fetchChats();
  }, []);

  useEffect(() => {
    console.log("Chats updated:", chats);
  }, [chats]);

  const handleSearch = async () => {
    const usersRef = collection(db, "users");
    const businessUsersRef = collection(db, "business_users");

    try {
        const [userSnapshot, businessUserSnapshot] = await Promise.all([
            getDocs(usersRef),
            getDocs(businessUsersRef)
        ]);

        const allUsers = [];

        userSnapshot.forEach(doc => {
            const fullName = doc.data().fullName || "";
            if (fullName.toLowerCase().includes(searchText.toLowerCase())) {
                allUsers.push({ id: doc.id, name: fullName, type: 'User' });
            }
        });

        businessUserSnapshot.forEach(doc => {
            const stallName = doc.data().stallName || "";
            if (stallName.toLowerCase().includes(searchText.toLowerCase())) {
                allUsers.push({ id: doc.id, name: stallName, type: 'Business User' });
            }
        });

        setSearchResults(allUsers);
        setModalVisible(true); 

    } catch (error) {
        console.error("Failed to fetch users:", error);
    }
};

  const handleSelectUser = async (selectedUserId) => {
    const currentUserId = auth.currentUser?.uid;
    const chatsRef = collection(db, "chats");
    const q = query(chatsRef, where("participants", "array-contains", currentUserId));
    const snapshot = await getDocs(q);
    let existingChatId = null;

    snapshot.forEach((doc) => {
        if (doc.data().participants.includes(selectedUserId)) {
            existingChatId = doc.id;
        }
    });

    if (existingChatId) {
        navigation.navigate("chat", { chatId: existingChatId, otherUserId: selectedUserId });
    } else {
        const newChatRef = doc(collection(db, "chats"));
        await setDoc(newChatRef, {
            participants: [currentUserId, selectedUserId]
        });
        navigation.navigate("chat", { chatId: newChatRef.id, otherUserId: selectedUserId });
    }
    setModalVisible(false); 
  };

  const navigateToChat = (chat) => {
    const isBusiness = chat.type === 'Business User';
    const name = isBusiness ? chat.stallName : chat.fullName;
  
    navigation.navigate("chat", {
        chatId: chat.id,
        otherUserId: chat.otherUserId,
        userName: chat.name 
    });
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
      {/* Section Title */}
      <Text style={styles.sectionTitle}>Chats</Text>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {searchResults.map((user) => (
              <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => handleSelectUser(user.id)}>
                <Text style={styles.userText}>{user.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.button, styles.buttonClose]}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Text style={styles.textStyle}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <TextInput
        style={styles.searchInput}
        value={searchText}
        onChangeText={setSearchText}
        placeholder="Search users..."
      />
      <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
        <Text>Search</Text>
      </TouchableOpacity>

      {/* Chat List */}
      <ScrollView style={styles.chatList}>
        {chats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatItem}
            onPress={() => navigateToChat(chat)}
          >
            <View style={styles.avatar}>
            {chat.profileImage ? (
              <Image
                source={{ uri: chat.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{chat.name.charAt(0)}</Text>
            )}
            </View>
            <View>
              <Text style={styles.chatName}>{chat.name}</Text>
              <Text style={styles.chatPreview}>{chat.preview}</Text>
            </View>
          </TouchableOpacity>
        ))}
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 10,
    borderBottomWidth: 0,
    borderBottomColor: "#ddd",
  },
  chatList: {
    flex: 1,
    padding: 10,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007BFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chatPreview: {
    color: "#555",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
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
  userItem: {
    padding: 10,
    marginVertical: 4,
    backgroundColor: "#f8f8f8",
  },
  userText: {
    color: "#000",
    fontSize: 16,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },
  searchInput: {
    height: 40,
    margin: 12,
    padding: 10,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchButton: {
    padding: 10,
    backgroundColor: "#ddd",
  },
});
