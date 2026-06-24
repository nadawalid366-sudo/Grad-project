import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

/**
 * Blocks the Android hardware back press while the screen is focused.
 * Use on "root" screens such as the patient/doctor dashboards where there
 * is no meaningful place to go back to (we don't want back to exit the app
 * or fall through to the welcome screen). No-op on iOS, which has no
 * hardware back button.
 */
export function useBlockBack(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true, // returning true prevents the default back action
      );

      return () => subscription.remove();
    }, [enabled]),
  );
}
