# FlowChart Gradient Tests

This document describes the test coverage for the FlowChart gradient functionality.

## Overview

The FlowChart component displays a circular gradient that represents flow data for the current month. The gradient dynamically changes based on the flow types logged, creating a visual representation of the flow progression.

## Test Coverage

The test file `FlowChart.gradient.test.ts` covers the following scenarios:

### 1. No Flow Data
- ✅ Default gradient when no flow data exists
- ✅ Default gradient when flow data array is empty
- ✅ Uses default colors (spotting to heavy) with tail fade

### 2. Single Flow Type
- ✅ Solid color gradient for single flow type (spotting)
- ✅ Solid color gradient for single flow type (light)
- ✅ Solid color gradient for single flow type (medium)
- ✅ Solid color gradient for single flow type (heavy)

### 3. Multiple Flow Types - Chronological Order
- ✅ Gradient in chronological order (spotting -> light)
- ✅ Gradient in chronological order (light -> medium -> heavy)
- ✅ Maintains chronological order even when data is unsorted
- ✅ Correct offset calculations for 2, 3, and 4 flow types

### 4. Flow Type Deduplication
- ✅ Only includes unique flow types in chronological order
- ✅ Handles multiple occurrences of same flow type correctly

### 5. Zero/Invalid Flow Intensity
- ✅ Ignores flow entries with intensity 0
- ✅ Ignores flow entries with undefined intensity
- ✅ Ignores flow entries with null intensity
- ✅ Handles all zero intensities by using default gradient

### 6. Gradient Stop Calculations
- ✅ Correct offsets for two flow types (0%, 90%, 95%)
- ✅ Correct offsets for three flow types (0%, 45%, 90%, 95%)
- ✅ Correct offsets for four flow types (0%, 30%, 60%, 90%, 95%)

### 7. Tail Fade Color
- ✅ Always includes tail fade color at 95% offset
- ✅ Tail fade color is consistent across all scenarios

### 8. Color Validation
- ✅ Uses valid FlowColors for all gradient stops
- ✅ Matches FlowColors exactly
- ✅ All colors are valid hex format

### 9. Edge Cases
- ✅ Handles flow data with mixed valid and invalid entries
- ✅ Handles dates in different formats
- ✅ Handles single day with multiple flow types gracefully

## Gradient Logic

The gradient generation follows these rules:

1. **Chronological Sorting**: Flow data is sorted by date to ensure chronological order
2. **Unique Flow Types**: Only the first occurrence of each flow type is included
3. **Zero Intensity Exclusion**: Flow entries with intensity 0, null, or undefined are excluded
4. **Proportional Offsets**: Multiple flow types are distributed proportionally from 0% to 90%
5. **Tail Fade**: A purple tail fade is always added at 95% for smooth transition

## Color Mapping

Flow intensities map to colors as follows:
- `1` → `spotting` → `#ffafaf` (light pink)
- `2` → `light` → `#ff7272` (pink)
- `3` → `medium` → `#e62929` (red)
- `4` → `heavy` → `#990000` (dark red)
- Tail fade → `#c6a4dbff` (purple)

## Running Tests

To run the gradient tests:

```bash
npm test -- FlowChart.gradient.test.ts
```

Or run all tests:

```bash
npm test
```

## Implementation Details

The gradient is implemented in `FlowChart.tsx` using:
- `useMemo` for performance optimization
- SVG `LinearGradient` and `Stop` components
- Dynamic gradient stop generation based on flow data
- Chronological sorting to maintain flow progression order
