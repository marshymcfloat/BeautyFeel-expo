import React from "react";
import { TextInput, TextInputProps, View, ViewProps } from "react-native";

// Input Root Component
type IInputProps = ViewProps & {
  variant?: "outline" | "underlined" | "rounded" | "unstyled";
  size?: "sm" | "md" | "lg" | "xl";
};

export const Input = React.forwardRef<
  React.ComponentRef<typeof View>,
  IInputProps
>(function Input({ children, ...props }, ref) {
  return (
    <View ref={ref} {...props}>
      {children}
    </View>
  );
});

// InputField Component
type IInputFieldProps = TextInputProps;

export const InputField = React.forwardRef<
  React.ComponentRef<typeof TextInput>,
  IInputFieldProps
>(function InputField({ ...props }, ref) {
  return <TextInput ref={ref} {...props} />;
});

// InputSlot Component
type IInputSlotProps = ViewProps;

export const InputSlot = React.forwardRef<
  React.ComponentRef<typeof View>,
  IInputSlotProps
>(function InputSlot({ children, ...props }, ref) {
  return (
    <View ref={ref} {...props}>
      {children}
    </View>
  );
});

// InputIcon Component
type IInputIconProps = ViewProps & {
  as?: React.ComponentType<any>;
  size?: "sm" | "md" | "lg";
};

export const InputIcon = React.forwardRef<
  React.ComponentRef<typeof View>,
  IInputIconProps
>(function InputIcon({ as: Icon, size = "md", ...props }, ref) {
  if (!Icon) return null;
  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  return (
    <View ref={ref} {...props}>
      <Icon size={iconSize} />
    </View>
  );
});

Input.displayName = "Input";
InputField.displayName = "InputField";
InputSlot.displayName = "InputSlot";
InputIcon.displayName = "InputIcon";
