import {
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";

import { db } from "../services/firebase";

export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  fromUserId,
  fromUserName,
  fromUserPhoto = "",
  postId = null,
  commentId = null,
  chatId = null,
  groupId = null,
}) => {
  if (!recipientId || !fromUserId) {
    return;
  }

  // Don't notify yourself
  if (recipientId === fromUserId) {
    return;
  }

  try {
    await addDoc(
      collection(
        db,
        "users",
        recipientId,
        "notifications"
      ),
      {
        type,

        title,
        message,

        fromUserId,
        fromUserName,
        fromUserPhoto,

        postId,
        commentId,
        chatId,
        groupId,

        read: false,

        createdAt: serverTimestamp(),
      }
    );
  } catch (error) {
    console.log(
      "Create notification error:",
      error
    );
  }
};