import { useState } from "react";
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import axios from "axios";

import * as DocumentPicker from "expo-document-picker";

const API_URL = "https://university-universal-backend.onrender.com";

export default function UploadPastPaperScreen() {

  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickDocument = async () => {
    try {

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result.assets[0]);

        Alert.alert(
          "Selected",
          result.assets[0].name
        );
      }

    } catch {
      Alert.alert("Error", "Could not pick file.");
    }
  };

  const uploadPastPaper = async () => {
  if (loading) return;

  if (!name) {
    Alert.alert("Error", "Enter the paper name.");
    return;
  }

  if (!selectedFile) {
    Alert.alert("Error", "Please choose a PDF.");
    return;
  }

  try {
    setLoading(true);

    const formData = new FormData();

    formData.append("name", name);

    formData.append("file", {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: "application/pdf",
    });

    const response = await axios.post(
      `${API_URL}/upload-pastpaper`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response.data.success) {
      Alert.alert(
        "Success",
        "Past paper uploaded successfully."
      );

      setName("");
      setSelectedFile(null);
    }

  } catch (error) {
    console.log(error.response?.data || error);

    Alert.alert(
      "Upload Failed",
      error.response?.data?.error || "Something went wrong."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <View
      style={{
        flex:1,
        backgroundColor:"#0B0F14",
        padding:20,
        paddingTop:60,
      }}
    >

      <Text
        style={{
          color:"#fff",
          fontSize:24,
          fontWeight:"bold",
          marginBottom:20,
        }}
      >
        📤 Upload Past Paper
      </Text>

      <TextInput
        placeholder="Paper name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
        style={{
          backgroundColor:"#111827",
          color:"#fff",
          padding:14,
          borderRadius:10,
          marginBottom:20,
        }}
      />

      <TouchableOpacity
        onPress={pickDocument}
        style={{
          backgroundColor:"#2563EB",
          padding:15,
          borderRadius:10,
          alignItems:"center",
        }}
      >
        <Text
          style={{
            color:"#fff",
            fontWeight:"bold",
          }}
        >
          📄 Choose PDF
        </Text>
      </TouchableOpacity>

      {selectedFile && (
        <Text
          style={{
            color:"#22C55E",
            marginTop:20,
          }}
        >
          {selectedFile.name}
        </Text>
      )}

      <TouchableOpacity
  onPress={uploadPastPaper}
  disabled={loading}
  style={{
    backgroundColor: "#22C55E",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  }}
>
  <Text
    style={{
      color: "#000",
      fontWeight: "bold",
    }}
  >
    {loading ? "Uploading..." : "🚀 Upload Past Paper"}
  </Text>
</TouchableOpacity>

    </View>
  );
}