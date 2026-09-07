import { createNavigationContainerRef } from "@react-navigation/native";

// Allows navigation from anywhere (e.g. the global incoming-call
// handler) even outside of a screen component.
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}