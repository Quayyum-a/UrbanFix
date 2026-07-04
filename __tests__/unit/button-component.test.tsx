import React from "react";
import { render, fireEvent } from "@testing-library/react-native";

import { Button } from "@/components/ui/Button";
import { colors, touchTargets, typography } from "@/constants/theme";

function flattenStyle(style: any): Record<string, any> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle));
  }
  return style;
}

describe("Button component", () => {
  it("renders the title and uses the default variant", () => {
    const { getByText } = render(<Button title="Save" onPress={() => {}} />);
    const buttonText = getByText("Save");
    const textStyle = flattenStyle(buttonText.props.style);

    expect(buttonText).toBeTruthy();
    expect(textStyle.fontFamily).toBe(typography.buttonText.fontFamily);
    expect(textStyle.fontSize).toBe(typography.buttonText.fontSize);
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

  it("applies a minimum touch target height from the design system", () => {
    const { getByRole } = render(<Button title="Tap" onPress={() => {}} />);
    const button = getByRole("button");
    const flatStyle = flattenStyle(button.props.style);

    expect(flatStyle.minHeight).toBeGreaterThanOrEqual(touchTargets.minSize);
    expect(flatStyle.minHeight).toBe(touchTargets.buttonHeight);
  });

  it("renders a loading indicator when loading=true", () => {
    const { getByTestId, queryByText } = render(
      <Button title="Saving" onPress={() => {}} loading />,
    );

    expect(getByTestId("button-loading-indicator")).toBeTruthy();
    expect(queryByText("Saving")).toBeNull();
  });

  it("renders secondary variant text in the primary brand color", () => {
    const { getByText } = render(
      <Button title="More" variant="secondary" onPress={() => {}} />,
    );
    const buttonText = getByText("More");
    const flatStyle = flattenStyle(buttonText.props.style);

    expect(flatStyle.color).toBe(colors.primary);
  });
});
