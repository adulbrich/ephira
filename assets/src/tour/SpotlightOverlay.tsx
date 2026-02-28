import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, Text, View } from "react-native";
import { useTour } from "./TourContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Rect = { x: number; y: number; width: number; height: number };

function measure(ref: any): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!ref?.current?.measureInWindow) return resolve(null);
    ref.current.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        resolve({ x, y, width, height });
      },
    );
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function SpotlightOverlay() {
  const { isActive, steps, stepIndex, getAnchor, next, prev, stop } = useTour();
  const step = steps[stepIndex];

  const [rect, setRect] = useState<Rect | null>(null);
  const screen = Dimensions.get("window");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isActive || !step) return;

      const anchorRef = getAnchor(step.id);
      if (!anchorRef) {
        setRect(null);
        setTimeout(() => {
          if (!cancelled) void run();
        }, 250);
        return;
      }

      const r = await measure(anchorRef);
      if (!cancelled) setRect(r);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [getAnchor, isActive, step, stepIndex]);

  const overlayParts = useMemo(() => {
    if (!rect) return null;

    const pad = clamp(Math.round(screen.height * 0.01), 6, 12);

    const isTabArea = rect.y > screen.height * 0.75;
    const extraHeight = isTabArea
      ? clamp(Math.round(screen.height * 0.04), 18, 44)
      : 0;
    const shiftUp = isTabArea
      ? clamp(Math.round(screen.height * 0.008), 4, 10)
      : 0;

    const x = Math.max(rect.x - pad, 0);
    const y = Math.max(rect.y - pad - shiftUp, 0);
    const w = Math.min(rect.width + pad * 2, screen.width - x);
    const h = Math.min(rect.height + pad * 2 + extraHeight, screen.height - y);

    return {
      hole: { x, y, w, h },
      top: { left: 0, top: 0, width: screen.width, height: y },
      left: { left: 0, top: y, width: x, height: h },
      right: { left: x + w, top: y, width: screen.width - (x + w), height: h },
      bottom: {
        left: 0,
        top: y + h,
        width: screen.width,
        height: screen.height - (y + h),
      },
    };
  }, [rect, screen.height, screen.width]);

  const tooltipBottom = useMemo(() => {
    const base = insets.bottom + 16;
    if (!overlayParts) return base;

    const holeBottom = overlayParts.hole.y + overlayParts.hole.h;
    const nearBottom = holeBottom > screen.height * 0.72;

    const raisedOffset = clamp(Math.round(screen.height * 0.14), 84, 160);
    return nearBottom ? insets.bottom + raisedOffset : base;
  }, [insets.bottom, overlayParts, screen.height]);

  if (!isActive || !step) return null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={{ flex: 1 }}>
        {overlayParts && (
          <>
            {[
              overlayParts.top,
              overlayParts.left,
              overlayParts.right,
              overlayParts.bottom,
            ].map((p, i) => (
              <Pressable
                key={i}
                onPress={next}
                style={[
                  {
                    position: "absolute",
                    backgroundColor: "rgba(0,0,0,0.65)",
                  },
                  p,
                ]}
              />
            ))}

            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: overlayParts.hole.x,
                top: overlayParts.hole.y,
                width: overlayParts.hole.w,
                height: overlayParts.hole.h,
                borderRadius: 14,
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.9)",
              }}
            />
          </>
        )}

        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: tooltipBottom,
            borderRadius: 16,
            padding: 16,
            backgroundColor: "rgba(20,20,20,0.95)",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            {step.title}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 14,
              marginBottom: 12,
            }}
          >
            {step.text}
          </Text>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              justifyContent: "space-between",
            }}
          >
            <Pressable
              onPress={stop}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.85)" }}>Skip</Text>
            </Pressable>

            <View style={{ flexDirection: "row", gap: 10 }}>
              {stepIndex > 0 && (
                <Pressable
                  onPress={prev}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: "white" }}>Back</Text>
                </Pressable>
              )}

              <Pressable
                onPress={next}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.12)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {stepIndex === steps.length - 1 ? "Done" : "Next"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
