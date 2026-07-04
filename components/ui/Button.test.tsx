import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { Button } from "./Button";
import { colors, touchTargets, typography } from "@/constants/theme";

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle));
  }
  return style;
}

describe("Button Component", () => {
  it("renders the title text", () => {
    const { getByText } = render(<Button title="Save" onPress={() => {}} />);
    expect(getByText("Save")).toBeTruthy();
  });

  it("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button title="Submit" onPress={onPress} disabled />,
    );
    fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a loading indicator when loading", () => {
    const { getByTestId, queryByText } = render(
      <Button title="Submit" onPress={() => {}} loading />,
    );
    expect(getByTestId("button-loading-indicator")).toBeTruthy();
    expect(queryByText("Submit")).toBeNull();
  });

  it("uses the minimum touch target height from the design system", () => {
    const { getByRole } = render(<Button title="Tap" onPress={() => {}} />);
    const button = getByRole("button");
    const flatStyle = flattenStyle(button.props.style);
    expect(flatStyle.minHeight).toBe(touchTargets.minSize);
  });

  it("sets accessibilityLabel to the title when none is provided", () => {
    const { getByRole } = render(<Button title="Go" onPress={() => {}} />);
    expect(getByRole("button").props.accessibilityLabel).toBe("Go");
  });

  it("respects a provided accessibilityLabel", () => {
    const label = "Confirm action";
    const { getByRole } = render(
      <Button title="Go" accessibilityLabel={label} onPress={() => {}} />,
    );
    expect(getByRole("button").props.accessibilityLabel).toBe(label);
  });

  it("applies the primary button text style by default", () => {
    const { getByText } = render(<Button title="Save" onPress={() => {}} />);
    const title = getByText("Save");
    const textStyle = flattenStyle(title.props.style);
    expect(textStyle.fontFamily).toBe(typography.buttonText.fontFamily);
    expect(textStyle.fontSize).toBe(typography.buttonText.fontSize);
  });

  it("renders the secondary variant with the primary brand color text", () => {
    const { getByText } = render(
      <Button title="More" variant="secondary" onPress={() => {}} />,
    );
    const title = getByText("More");
    const textStyle = flattenStyle(title.props.style);
    expect(textStyle.color).toBe(colors.primary);
  });
});
