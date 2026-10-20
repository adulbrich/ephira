import { act } from "@testing-library/react-native";
import { BackHandler } from "react-native";

type BackPressHandler = Parameters<typeof BackHandler.addEventListener>[1];

/**
 * Android's Back dispatch, which the jest preset does not have. Call it
 * before rendering; it returns a function that presses Back.
 *
 * jest-expo runs as iOS, where `BackHandler` is a no-op. Android calls the
 * newest `hardwareBackPress` subscriber first and stops at the first that
 * returns true (`BackHandler.android.js`). That order is what lets an open
 * Paper Dialog, which subscribes when it opens, take Back before the modal
 * it sits in. Android's fallback when nothing handles Back, leaving the app,
 * is not reproduced: a press nothing handles does nothing here.
 *
 * Undo the spy with `jest.restoreAllMocks()` after each test.
 */
export function recordBackPresses() {
  const handlers: BackPressHandler[] = [];
  jest
    .spyOn(BackHandler, "addEventListener")
    .mockImplementation((_eventName, handler) => {
      if (!handlers.includes(handler)) handlers.push(handler);
      return {
        remove: () => {
          const index = handlers.indexOf(handler);
          if (index !== -1) handlers.splice(index, 1);
        },
      };
    });

  return () =>
    act(async () => {
      const event = {} as Parameters<BackPressHandler>[0];
      for (let i = handlers.length - 1; i >= 0; i--) {
        if (handlers[i]?.(event)) return;
      }
    });
}
