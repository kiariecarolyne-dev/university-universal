import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  updateDoc,
} from "firebase/firestore";

import useUser from "../hooks/useUser";
import { db } from "../services/firebase";


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
    const fileUri =
      FileSystem.documentDirectory + paper.name;

    const { uri } = await FileSystem.downloadAsync(
      paper.fileUrl,
      fileUri
    );

    // Increase download count
    await updateDoc(doc(db, "pastPapers", paper.id), {
      downloads: (paper.downloads || 0) + 1,
    });

    const canShare = await Sharing.isAvailableAsync();

    if (canShare) {
      await Sharing.shareAsync(uri);
    }

  } catch (error) {
    console.log(error);
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