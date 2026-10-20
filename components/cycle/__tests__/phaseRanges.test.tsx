import { render, screen } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import PhaseCard from "@/components/cycle/PhaseCard";
import StatusCard from "@/components/cycle/StatusCard";
import { CYCLE_PHASES, type CyclePhaseId } from "@/constants/CyclePhases";

// A 29-day cycle, as in issue #301: day 17 is ovulation, not luteal.
const CYCLE_LENGTH = 29;

describe("phase day ranges for a 29-day cycle", () => {
  it.each<[CyclePhaseId, string]>([
    ["menstrual", "Days 1-5"],
    ["follicular", "Days 6-13"],
    ["ovulation", "Days 14-17"],
    ["luteal", "Days 18-29"],
  ])("the %s phase card shows %s", async (id, range) => {
    await render(
      <PaperProvider>
        <PhaseCard
          phase={CYCLE_PHASES[id]}
          isCurrent
          cycleLength={CYCLE_LENGTH}
        />
      </PaperProvider>,
    );

    expect(screen.getByText(range)).toBeTruthy();
  });

  it.each(Object.keys(CYCLE_PHASES) as CyclePhaseId[])(
    "the %s status card shows no day range of its own",
    async (id) => {
      await render(
        <PaperProvider>
          <StatusCard
            phase={CYCLE_PHASES[id]}
            cycleDay={17}
            cycleLength={CYCLE_LENGTH}
          />
        </PaperProvider>,
      );

      expect(screen.queryByText(/Days \d/)).toBeNull();
    },
  );
});
