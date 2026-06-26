export const askAI = async (question, course) => {
  try {
    const response = await fetch("https://api.duckduckgo.com/?q=" + question + "&format=json");

    return {
      answer:
        "AI response placeholder for " +
        course +
        ": " +
        question
    };
  } catch (error) {
    return { answer: "Error generating response" };
  }
};