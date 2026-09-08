import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../services/firebase";

import EmptyState from "../components/EmptyState";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import useUser from "../hooks/useUser";
import { isInTrialPeriod, isPremiumUser } from "../utils/access";
import { getRecommendedGroups } from "../utils/matchGroups";

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("All");
  const [onlineStudents, setOnlineStudents] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const user = useUser();

  const loadGroups = async () => {
    try {
      if (!user) return;

      setLoading(true);
      setLoadError(false);

      const recommended = await getRecommendedGroups(user);
      setGroups(recommended || []);
    } catch (error) {
      console.log("Groups load error:", error);

      setLoadError(true);

      Alert.alert(
        "Couldn't load groups",
        "Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    await loadGroups();

    setRefreshing(false);
  };

  useEffect(() => {
    loadGroups();
  }, [user]);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("online", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOnlineStudents(snapshot.size);
      },
      (error) => {
        console.log("Online count listener error:", error);
      }
    );

    return unsubscribe;
  }, []);

  const recommended = useMemo(() => {
    if (!user) return [];

    return groups.filter(
      (group) =>
        group.course === user.course ||
        group.university === user.university
    );
  }, [groups, user]);

  const filteredGroups = useMemo(() => {
    const text = search.trim().toLowerCase();
    const isMyCourse = courseFilter === "My Course";

    return groups.filter((group) => {
      if (isMyCourse && group.course !== user?.course) {
        return false;
      }

      if (!text) return true;

      const haystack = [
        group.name,
        group.course,
        group.university,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");

      return haystack.includes(text);
    });
  }, [groups, search, courseFilter, user]);

  if (!user) return null;

  const handleOpenGroup = (group) => {
    if (isPremiumUser(user) || isInTrialPeriod(user)) {
      navigation.navigate("Chat", { group });
      return;
    }

    Alert.alert(
      "Trial Expired",
      "Your free trial has ended. Upgrade to Premium to participate in study groups."
    );

    navigation.navigate("Premium");
  };

  const showRecommended =
    recommended.length > 0 &&
    !search.trim() &&
    courseFilter === "All";

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>
                Study Groups
              </Text>

              <Text style={styles.subtitle}>
                Learn, discuss and connect with students.
              </Text>
            </View>

            {/* SEARCH */}
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>

              <TextInput
                style={styles.searchInput}
                placeholder="Search groups..."
                placeholderTextColor="#6B7280"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />

              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* LIVE NOW */}
            <View style={styles.liveCard}>
              <View style={styles.liveDot} />

              <Text style={styles.liveTitle}>
                Students studying right now
              </Text>

              <Text style={styles.liveNumber}>
                {onlineStudents}
              </Text>
            </View>

            {/* FILTER CHIPS */}
            <View style={styles.filtersRow}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={["All", "My Course"]}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      courseFilter === item && styles.activeChip,
                    ]}
                    onPress={() => setCourseFilter(item)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        courseFilter === item &&
                          styles.activeFilterText,
                      ]}
                    >
                      {item === "All" ? "All Groups" : item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* RECOMMENDED FOR YOU */}
            {showRecommended && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Recommended for you
                  </Text>

                  <Text style={styles.sectionHint}>
                    Matched to your course
                  </Text>
                </View>

                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={recommended}
                  keyExtractor={(item) => `rec-${item.id}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.recCard}
                      onPress={() => handleOpenGroup(item)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.recIcon}>
                        <Text style={styles.recIconEmoji}>📚</Text>
                      </View>

                      <Text
                        numberOfLines={1}
                        style={styles.recName}
                      >
                        {item.name || "Study Group"}
                      </Text>

                      <Text
                        numberOfLines={1}
                        style={styles.recCourse}
                      >
                        {item.course || "General"}
                      </Text>

                      <Text style={styles.recMembers}>
                        👥 {item.memberCount || 0} members
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            {/* ALL GROUPS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {search.trim() ? "Results" : "All groups"}
              </Text>

              <Text style={styles.sectionHint}>
                {filteredGroups.length} group
                {filteredGroups.length === 1 ? "" : "s"}
              </Text>
            </View>

            {loading && groups.length > 0 && (
              <View style={styles.reloadingRow}>
                <ActivityIndicator
                  size="small"
                  color="#4F46E5"
                />

                <Text style={styles.reloadingText}>
                  Updating groups...
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator
                size="small"
                color="#4F46E5"
              />

              <Text style={styles.stateText}>
                Loading study groups...
              </Text>
            </View>
          ) : loadError ? (
            <EmptyState
              emoji="😕"
              title="Couldn't load groups"
              text="Check your connection and try again."
              actionLabel="Try Again"
              onAction={loadGroups}
              card={false}
            />
          ) : search.trim() || courseFilter !== "All" ? (
            <EmptyState
              emoji="👥"
              title="No groups match your search"
              text="Try a different search or filter to see more groups."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch("");
                setCourseFilter("All");
              }}
              card={false}
            />
          ) : (
            <EmptyState
              emoji="👥"
              title="Your community is waiting"
              text="Join a group related to your course, interests, or goals."
              card={false}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.groupCard}
            onPress={() => handleOpenGroup(item)}
            activeOpacity={0.85}
          >
            <View style={styles.groupIcon}>
              <Text style={styles.groupIconEmoji}>📚</Text>
            </View>

            <View style={styles.groupInfo}>
              <View style={styles.groupNameRow}>
                <Text
                  numberOfLines={1}
                  style={styles.groupName}
                >
                  {item.name || "Study Group"}
                </Text>

                {item.course === user.course && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>
                      Recommended
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.groupMetaRow}>
                <View style={styles.tag}>
                  <Text
                    numberOfLines={1}
                    style={styles.tagText}
                  >
                    {item.course || "General"}
                  </Text>
                </View>

                <Text style={styles.members}>
                  👥 {item.memberCount || 0}
                </Text>
              </View>

              {item.description ? (
                <Text
                  numberOfLines={1}
                  style={styles.description}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.openAction}>
              <Text style={styles.openActionText}>Open</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/* =========================
   DARK MODERN STYLE
========================= */
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#05070A",
  },

  list: {
    padding: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    marginBottom: 16,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  /* SEARCH */

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 44,
    marginBottom: 12,
  },

  searchIcon: {
    fontSize: 15,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    padding: 0,
  },

  clearIcon: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 4,
  },

  /* LIVE NOW */

  liveCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginRight: 10,
  },

  liveTitle: {
    color: "#D1D5DB",
    fontSize: 13,
    flex: 1,
  },

  liveNumber: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  /* FILTER CHIPS */

  filtersRow: {
    marginBottom: 10,
  },

  filterChip: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
  },

  activeChip: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },

  filterText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },

  activeFilterText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* SECTIONS */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  sectionHint: {
    color: "#6B7280",
    fontSize: 12,
  },

  /* RECOMMENDED CARD */

  recCard: {
    width: 196,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
    marginBottom: 4,
  },

  recIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  recIconEmoji: {
    fontSize: 20,
  },

  recName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  recCourse: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 3,
  },

  recMembers: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },

  /* GROUP CARD */

  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },

  groupIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
  },

  groupIconEmoji: {
    fontSize: 22,
  },

  groupInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  groupNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  groupName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },

  recommendedBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginLeft: 8,
  },

  recommendedText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },

  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  tag: {
    backgroundColor: "#1F2937",
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 20,
    maxWidth: 150,
  },

  tagText: {
    color: "#9CA3AF",
    fontSize: 11,
  },

  members: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 10,
  },

  description: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 5,
  },

  openAction: {
    flexDirection: "row",
    alignItems: "center",
  },

  openActionText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "700",
  },

  chevron: {
    color: "#4F46E5",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 2,
  },

  /* EMPTY / LOADING STATE */

  stateBox: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  reloadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    marginBottom: 8,
  },

  reloadingText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginLeft: 8,
  },

  stateEmoji: {
    fontSize: 34,
    marginBottom: 12,
  },

  stateTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  stateHint: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },

  stateText: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 12,
  },
};