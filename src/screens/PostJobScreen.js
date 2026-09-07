import { useEffect, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

import useUser from "../hooks/useUser";
import { isAdminUser } from "../utils/access";

export default function PostJobScreen({ navigation, route }) {
  const user = useUser();

  const editingJob = route?.params?.job || null;

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [description, setDescription] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [source, setSource] = useState("");
  const [deadline, setDeadline] = useState("");
  // Optional extra fields
  const [salary, setSalary] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [applicationInstructions, setApplicationInstructions] = useState("");

  const [loading, setLoading] = useState(false);

  /* ------------------------------------------------
     EDIT MODE: PRE-FILL THE FORM
  ------------------------------------------------ */

  useEffect(() => {
    if (!editingJob) return;

    setTitle(editingJob.title || "");
    setCompany(editingJob.company || "");
    setLocation(editingJob.location || "");
    setType(editingJob.type || "");
    setCategory(editingJob.category || "");
    setWorkMode(editingJob.workMode || "");
    setDescription(editingJob.description || "");
    setApplyUrl(
      editingJob.applyUrl || ""
    );
    setSource(editingJob.source || "");
    setDeadline(editingJob.deadline || "");
    setSalary(editingJob.salary || "");
    setApplicationEmail(
      editingJob.applicationEmail || ""
    );
    setApplicationInstructions(
      editingJob.applicationInstructions || ""
    );
  }, [editingJob]);

  const postJob = async () => {
    // =========================
    // VALIDATE
    // =========================

    if (
      !title.trim() ||
      !company.trim() ||
      !location.trim() ||
      !type.trim() ||
      !category.trim() ||
      !workMode.trim() ||
      !description.trim() ||
      !applyUrl.trim() ||
      !deadline
    ) {
      Alert.alert(
        "Missing Information",
        "Please fill in all job details."
      );
      return;
    }

    const cleanApplyUrl = applyUrl.trim();

    if (
      !cleanApplyUrl.startsWith("https://") &&
      !cleanApplyUrl.startsWith("http://")
    ) {
      Alert.alert(
        "Invalid Application Link",
        "Please enter a complete link starting with https:// or http://"
      );
      return;
    }

    // =========================
    // CHECK USER
    // =========================

    if (!auth.currentUser) {
      Alert.alert(
        "Error",
        "You must be logged in to post a job."
      );
      return;
    }

    if (!isAdminUser(user)) {
      Alert.alert(
        "Admin Only",
        "Only admin accounts can post or edit jobs."
      );
      return;
    }

    const payload = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      type: type.trim(),
      category: category.trim(),
      workMode: workMode.trim(),
      description: description.trim(),
      applyUrl: applyUrl.trim(),
      source: source.trim(),
      deadline: deadline,
      salary: salary.trim() || null,
      applicationEmail:
        applicationEmail.trim() || null,
      applicationInstructions:
        applicationInstructions.trim() || null,
    };

    try {
      setLoading(true);

      if (editingJob) {
        // =====================
        // UPDATE EXISTING JOB
        // =====================

        await updateDoc(
          doc(db, "jobs", editingJob.id),
          {
            ...payload,
            updatedAt: serverTimestamp(),
          }
        );

        Alert.alert(
          "Job Updated 🎉",
          "The job has been updated successfully.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // =====================
        // SAVE JOB TO FIRESTORE
        // =====================

        await addDoc(collection(db, "jobs"), {
          ...payload,
          // Job management
          active: true,

          // Admin who posted it
          postedBy: auth.currentUser.uid,

          // Firestore timestamp
          createdAt: serverTimestamp(),
        });

        Alert.alert(
          "Job Posted 🎉",
          "The job has been successfully added to University Universal.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );

        // Clear form
        setTitle("");
        setCompany("");
        setLocation("");
        setType("");
        setCategory("");
        setWorkMode("");
        setDescription("");
        setApplyUrl("");
        setSource("");
        setDeadline("");
        setSalary("");
        setApplicationEmail("");
        setApplicationInstructions("");
      }
    } catch (error) {
      console.log("POST JOB ERROR:", error);

      Alert.alert(
        "Error",
        "Unable to save the job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------
     GATE: ADMIN ONLY
  ------------------------------------------------ */

  if (!user) return null;

  if (!isAdminUser(user)) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedEmoji}>
          🔐
        </Text>

        <Text style={styles.lockedTitle}>
          Admin only
        </Text>

        <Text style={styles.lockedText}>
          You need an admin account to post or
          edit job vacancies.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <Text style={styles.title}>
          {editingJob
            ? "✏️ Edit Job"
            : "💼 Post a Job"}
        </Text>

        <Text style={styles.subtitle}>
          {editingJob
            ? "Update the vacancy details below."
            : "Share a job opportunity with University Universal students."}
        </Text>
      </View>

      {/* JOB TITLE */}

      <Text style={styles.label}>
        Job Title
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Software Developer Intern"
        placeholderTextColor="#6B7280"
        value={title}
        onChangeText={setTitle}
      />

      {/* COMPANY */}

      <Text style={styles.label}>
        Company
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Safaricom"
        placeholderTextColor="#6B7280"
        value={company}
        onChangeText={setCompany}
      />

      {/* LOCATION */}

      <Text style={styles.label}>
        Location
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. Nairobi, Kenya"
        placeholderTextColor="#6B7280"
        value={location}
        onChangeText={setLocation}
      />

      {/* JOB TYPE */}

      <Text style={styles.label}>
  Job Type
</Text>

<View style={styles.optionsRow}>
  {[
    "Full-time",
    "Part-time",
    "Internship",
    "Graduate",
    "Contract",
  ].map((option) => (
    <TouchableOpacity
      key={option}
      onPress={() => setType(option)}
      style={[
        styles.optionButton,
        type === option && styles.optionButtonActive,
      ]}
    >
      <Text
        style={[
          styles.optionText,
          type === option && styles.optionTextActive,
        ]}
      >
        {option}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {/* CATEGORY */}

      <Text style={styles.label}>
  Job Category
</Text>

<View style={styles.optionsRow}>
  {[
    "IT",
    "Business",
    "Health",
    "Engineering",
    "Education",
    "Design",
    "Marketing",
    "Law",
    "Finance",
    "Other",
  ].map((option) => (
    <TouchableOpacity
      key={option}
      onPress={() => setCategory(option)}
      style={[
        styles.optionButton,
        category === option && styles.optionButtonActive,
      ]}
    >
      <Text
        style={[
          styles.optionText,
          category === option && styles.optionTextActive,
        ]}
      >
        {option}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {/* WORK MODE */}

      <Text style={styles.label}>
  Work Mode
</Text>

<View style={styles.optionsRow}>
  {[
    "On-site",
    "Remote",
    "Hybrid",
  ].map((option) => (
    <TouchableOpacity
      key={option}
      onPress={() => setWorkMode(option)}
      style={[
        styles.optionButton,
        workMode === option && styles.optionButtonActive,
      ]}
    >
      <Text
        style={[
          styles.optionText,
          workMode === option && styles.optionTextActive,
        ]}
      >
        {option}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {/* DESCRIPTION */}

      <Text style={styles.label}>
        Job Description
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.descriptionInput,
        ]}
        placeholder="Describe the opportunity..."
        placeholderTextColor="#6B7280"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      {/* APPLICATION LINK */}

      <Text style={styles.label}>
        Application Link
      </Text>

      <TextInput
        style={styles.input}
        placeholder="https://company.com/careers/job"
        placeholderTextColor="#6B7280"
        value={applyUrl}
        onChangeText={setApplyUrl}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.linkHint}>
        Paste the original application link where students should apply.
      </Text>

      <Text style={styles.label}>
  Original Source
</Text>

<TextInput
  style={styles.input}
  placeholder="e.g. Safaricom Careers, LinkedIn, BrighterMonday"
  placeholderTextColor="#6B7280"
  value={source}
  onChangeText={setSource}
/>

<Text style={styles.linkHint}>
  Tell students where this vacancy was originally found.
</Text>

<Text style={styles.label}>
  Application Deadline
</Text>

{Platform.OS === "web" ? (
  <input
    type="date"
    value={deadline}
    min={new Date().toISOString().split("T")[0]}
    onChange={(e) => setDeadline(e.target.value)}
    style={{
      width: "100%",
      boxSizing: "border-box",
      backgroundColor: "#111827",
      border: "1px solid #1F2937",
      borderRadius: 12,
      padding: 14,
      color: "#FFFFFF",
      fontSize: 14,
      outline: "none",
    }}
  />
) : (
  <TextInput
    style={styles.input}
    placeholder="e.g. 15 September 2026"
    placeholderTextColor="#6B7280"
    value={deadline}
    onChangeText={setDeadline}
  />
)}

<Text style={styles.linkHint}>
  Select the deadline shown on the original job listing.
</Text>

      {/* OPTIONAL: SALARY */}

      <Text style={styles.label}>
        Salary (optional)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. KES 40,000/month"
        placeholderTextColor="#6B7280"
        value={salary}
        onChangeText={setSalary}
      />

      {/* OPTIONAL: APPLICATION EMAIL */}

      <Text style={styles.label}>
        Application Email (optional)
      </Text>

      <TextInput
        style={styles.input}
        placeholder="hello@company.com"
        placeholderTextColor="#6B7280"
        value={applicationEmail}
        onChangeText={setApplicationEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.linkHint}>
        If set, students can also apply by email.
      </Text>

      {/* OPTIONAL: APPLICATION INSTRUCTIONS */}

      <Text style={styles.label}>
        Application Instructions (optional)
      </Text>

      <TextInput
        style={[
          styles.input,
          styles.descriptionInput,
        ]}
        placeholder="e.g. Send your CV and cover letter..."
        placeholderTextColor="#6B7280"
        value={applicationInstructions}
        onChangeText={setApplicationInstructions}
        multiline
        textAlignVertical="top"
      />

      {/* POST / SAVE BUTTON */}

      <TouchableOpacity
        style={styles.postButton}
        onPress={postJob}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.postButtonText}>
            {editingJob
              ? "💾 Save Changes"
              : "🚀 Post Job"}
          </Text>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  content: {
    padding: 16,
    paddingBottom: 50,
  },

  header: {
    marginTop: 20,
    marginBottom: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  label: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 14,
  },

  descriptionInput: {
    height: 130,
  },

  linkHint: {
    color: "#6B7280",
    fontSize: 11,
    marginTop: 6,
    lineHeight: 17,
  },

  postButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    padding: 16,
    marginTop: 25,
    alignItems: "center",
  },

  postButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  optionsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginTop: 2,
},

optionButton: {
  backgroundColor: "#111827",
  borderWidth: 1,
  borderColor: "#1F2937",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 9,
  marginRight: 8,
  marginBottom: 8,
},

optionButtonActive: {
  backgroundColor: "#4F46E5",
  borderColor: "#4F46E5",
},

optionText: {
  color: "#9CA3AF",
  fontSize: 12,
  fontWeight: "700",
},

optionTextActive: {
  color: "#FFFFFF",
},

locked: {
  flex: 1,
  backgroundColor: "#05070A",
  justifyContent: "center",
  alignItems: "center",
  padding: 30,
},

lockedEmoji: {
  fontSize: 50,
  marginBottom: 12,
},

lockedTitle: {
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "900",
  textAlign: "center",
},

lockedText: {
  color: "#9CA3AF",
  textAlign: "center",
  marginTop: 8,
  lineHeight: 20,
},
});