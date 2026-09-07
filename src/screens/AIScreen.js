import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import useUser from "../hooks/useUser";
import { askAI } from "../services/ai";
import { canUseAI } from "../utils/aiLimit";

export default function AIScreen() {
  const user = useUser();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleAsk = async () => {
    if (!canUseAI(user)) {
      Alert.alert(
        "Limit reached",
        "You have reached the daily question limit. Please try again tomorrow."
      );
      return;
    }

    const res = await askAI(question, user?.course);
    setAnswer(res.answer);
  };

  return (
    <View style={{ padding: 20, marginTop: 40 }}>
      <TextInput
        placeholder="Ask your question..."
        value={question}
        onChangeText={setQuestion}
        style={{ borderWidth: 1, padding: 10 }}
      />

      <Button title="Ask AI" onPress={handleAsk} />

      <Text style={{ marginTop: 20 }}>{answer}</Text>
    </View>
  );
}