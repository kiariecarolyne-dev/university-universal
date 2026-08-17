import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import axios from "axios";

import * as DocumentPicker from "expo-document-picker";

const API_URL =
  "https://university-universal-backend.onrender.com";

export default function UploadPastPaperScreen() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickDocuments = async () => {
    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: "application/pdf",
          multiple: true,
          copyToCacheDirectory: true,
        });

      if (!result.canceled) {
        const files = result.assets || [];

        setSelectedFiles(files);
        setUploadProgress(0);

        Alert.alert(
          "Files Selected",
          `${files.length} PDF${
            files.length === 1 ? "" : "s"
          } selected.`
        );
      }
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Error",
        "Could not select files."
      );
    }
  };

  const uploadPastPapers = async () => {
    if (loading) return;

    if (selectedFiles.length === 0) {
      Alert.alert(
        "Error",
        "Please choose one or more PDFs."
      );
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("files", {
          uri: file.uri,
          name: file.name,
          type: "application/pdf",
        });
      });

      const response = await axios.post(
        `${API_URL}/upload-pastpapers`,
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },

          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;

            const percent = Math.round(
              (progressEvent.loaded /
                progressEvent.total) *
                100
            );

            setUploadProgress(percent);
          },
        }
      );

      if (response.data.success) {
        const {
          uploaded,
          failed,
          total,
        } = response.data;

        Alert.alert(
          "Upload Complete",
          `${uploaded} of ${total} past papers uploaded successfully.${
            failed > 0
              ? ` ${failed} failed.`
              : ""
          }`
        );

        setSelectedFiles([]);
        setUploadProgress(100);
      }

    } catch (error) {
      console.log(
        error.response?.data || error
      );

      Alert.alert(
        "Upload Failed",
        error.response?.data?.error ||
          "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0B0F14",
        padding: 20,
        paddingTop: 60,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
        }}
      >
        📤 Upload Past Papers
      </Text>

      <TouchableOpacity
        onPress={pickDocuments}
        disabled={loading}
        style={{
          backgroundColor: "#2563EB",
          padding: 15,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          📄 Select PDF Files
        </Text>
      </TouchableOpacity>

      {selectedFiles.length > 0 && (
        <Text
          style={{
            color: "#22C55E",
            marginTop: 20,
            marginBottom: 10,
            fontWeight: "bold",
          }}
        >
          {selectedFiles.length} PDF
          {selectedFiles.length === 1
            ? ""
            : "s"}{" "}
          selected
        </Text>
      )}

      <FlatList
        data={selectedFiles}
        keyExtractor={(item, index) =>
          `${item.name}-${index}`
        }
        style={{
          marginTop: 10,
        }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#111827",
              padding: 12,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                color: "#fff",
              }}
            >
              📄{" "}
              {item.name.replace(
                /\.pdf$/i,
                ""
              )}
            </Text>
          </View>
        )}
      />

      {loading && (
        <View
          style={{
            marginTop: 15,
          }}
        >
          <ActivityIndicator
            size="large"
            color="#22C55E"
          />

          <Text
            style={{
              color: "#fff",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Uploading... {uploadProgress}%
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={uploadPastPapers}
        disabled={
          loading ||
          selectedFiles.length === 0
        }
        style={{
          backgroundColor:
            loading ||
            selectedFiles.length === 0
              ? "#555"
              : "#22C55E",
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
          {loading
            ? "Uploading..."
            : `🚀 Upload ${
                selectedFiles.length
              } Past Paper${
                selectedFiles.length === 1
                  ? ""
                  : "s"
              }`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}