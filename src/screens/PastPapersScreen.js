import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import {
  collection,
  doc,
  getDocs,
  increment,
  updateDoc,
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { auth, db } from "../services/firebase";


export default function PastPapersScreen({ navigation }) {
  const user = useUser();

  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "pastPapers"));

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPapers(data);
      setFilteredPapers(data);

    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const searchPapers = (text) => {
  setSearch(text);

  const results = papers.filter((paper) =>
    (paper.name || "")
      .toLowerCase()
      .includes(text.toLowerCase())
  );

  setFilteredPapers(results);
};


const downloadPDF = async (paper) => {
  try {
    // --------------------------------
    // CHECK USER
    // --------------------------------
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(
        "Login Required",
        "Please log in to download past papers."
      );
      return;
    }

    // --------------------------------
    // CHECK PREMIUM STATUS
    // --------------------------------
    const isPremium = user?.isPremium === true;

    const freeDownloadsUsed =
      user?.pastPaperDownloads || 0;

    // --------------------------------
    // FREE USER LIMIT
    // --------------------------------
    if (!isPremium && freeDownloadsUsed >= 1) {
      Alert.alert(
        "Premium Required",
        "You have used your free past-paper download. Upgrade to Premium to download unlimited past papers.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Upgrade to Premium",
            onPress: () =>
              navigation.navigate("Premium"),
          },
        ]
      );

      return;
    }

    // --------------------------------
    // DOWNLOAD PDF
    // --------------------------------
    const fileUri =
      FileSystem.documentDirectory + paper.name;

    const { uri } = await FileSystem.downloadAsync(
      paper.fileUrl,
      fileUri
    );

    // --------------------------------
    // INCREMENT USER'S FREE DOWNLOAD
    // --------------------------------
    if (!isPremium) {
      await updateDoc(
        doc(db, "users", currentUser.uid),
        {
          pastPaperDownloads: increment(1),
        }
      );
    }

    // --------------------------------
    // INCREASE PAPER DOWNLOAD COUNT
    // --------------------------------
    await updateDoc(
      doc(db, "pastPapers", paper.id),
      {
        downloads: increment(1),
      }
    );

    // --------------------------------
    // SHARE / OPEN PDF
    // --------------------------------
    const canShare =
      await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(uri);
    }

  } catch (error) {
    console.log("Past paper download error:", error);

    Alert.alert(
      "Download Failed",
      "Could not download the past paper. Please try again."
    );
  }
};


  if (loading) {
    return (
      <View style={{
        flex:1,
        justifyContent:"center",
        alignItems:"center",
        backgroundColor:"#0B0F14"
      }}>
        <ActivityIndicator size="large" color="#22C55E" />
      </View>
    );
  }

  return (
    <View style={{
      flex:1,
      backgroundColor:"#0B0F14",
      padding:16,
      paddingTop:60
    }}>

      <View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  }}
>
  <Text
    style={{
      color: "#fff",
      fontSize: 26,
      fontWeight: "bold",
    }}
  >
    📝 Past Papers
  </Text>

  {user?.isAdmin && (
    <TouchableOpacity
      onPress={() => navigation.navigate("UploadPastPaper")}
      style={{
        backgroundColor: "#22C55E",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        + Upload
      </Text>
    </TouchableOpacity>
  )}
</View>

      <TextInput
        placeholder="Search past papers..."
        placeholderTextColor="#888"
        value={search}
        onChangeText={searchPapers}
        style={{
          backgroundColor:"#111827",
          color:"#fff",
          padding:14,
          borderRadius:10,
          marginTop:20,
          marginBottom:20
        }}
      />

      <FlatList
        data={filteredPapers}
        keyExtractor={(item)=>item.id}
        renderItem={({ item }) => (
  <View
    style={{
      backgroundColor: "#111827",
      padding: 16,
      borderRadius: 10,
      marginBottom: 10,
    }}
  >
    <Text
      style={{
        color: "#fff",
        fontSize: 16,
        marginBottom: 12,
      }}
    >
      📄 {item.name}
    </Text>

    <TouchableOpacity
      onPress={() => downloadPDF(item)}
      style={{
        backgroundColor: "#2563EB",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        ⬇ Download
      </Text>
    </TouchableOpacity>
  </View>
)}
/>

</View>
);
}