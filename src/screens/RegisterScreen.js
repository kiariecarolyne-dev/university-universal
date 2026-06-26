import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, Button, TextInput, View } from "react-native";
import { auth } from "../services/firebase";

// ➕ ADD THESE IMPORTS
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerUser = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    try {
      // ✅ CREATE USER
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ CREATE USER PROFILE IN FIRESTORE
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        university: "Not set yet",
        course: "Not set yet",
        country: "Not set yet",
        year: "Not set yet",
        isPremium: false,
        createdAt: new Date()
      });

      Alert.alert("Success", "Account created successfully");

      navigation.navigate("Login");

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          marginBottom: 10,
          padding: 10
        }}
      />

      <Button title="Register" onPress={registerUser} />

      <Button
        title="Go To Login"
        onPress={() => navigation.navigate("Login")}
      />
    </View>
  );
}