import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Alert, Button, TextInput, View } from "react-native";

import { auth } from "../services/firebase";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginUser = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Fill all fields");
      return;
    }

    try {
      // LOGIN USER
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      Alert.alert(
        "Success",
        "Logged in successfully"
      );

      navigation.navigate("Home");

    } catch (error) {
      Alert.alert(
        "Login Error",
        error.message
      );
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 20
      }}
    >
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

      <Button
        title="Login"
        onPress={loginUser}
      />

      <Button
        title="Go To Register"
        onPress={() =>
          navigation.navigate("Register")
        }
      />
    </View>
  );
}