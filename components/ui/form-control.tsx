import React from "react";
import { Text, TextProps, View, ViewProps } from "react-native";

// FormControl Root Component
type IFormControlProps = ViewProps & {
  isInvalid?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
};

export const FormControl = React.forwardRef<
  React.ComponentRef<typeof View>,
  IFormControlProps
>(function FormControl({ children, ...props }, ref) {
  return (
    <View ref={ref} {...props}>
      {children}
    </View>
  );
});

// FormControlLabel Component
type IFormControlLabelProps = ViewProps;

export const FormControlLabel = React.forwardRef<
  React.ComponentRef<typeof View>,
  IFormControlLabelProps
>(function FormControlLabel({ children, ...props }, ref) {
  return (
    <View ref={ref} {...props}>
      {children}
    </View>
  );
});

// FormControlLabelText Component
type IFormControlLabelTextProps = TextProps;

export const FormControlLabelText = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IFormControlLabelTextProps
>(function FormControlLabelText({ children, ...props }, ref) {
  return (
    <Text ref={ref} {...props}>
      {children}
    </Text>
  );
});

// FormControlError Component
type IFormControlErrorProps = ViewProps;

export const FormControlError = React.forwardRef<
  React.ComponentRef<typeof View>,
  IFormControlErrorProps
>(function FormControlError({ children, ...props }, ref) {
  return (
    <View
      ref={ref}
      style={{ flexDirection: "row", alignItems: "center" }}
      {...props}
    >
      {children}
    </View>
  );
});

// FormControlErrorText Component
type IFormControlErrorTextProps = TextProps;

export const FormControlErrorText = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IFormControlErrorTextProps
>(function FormControlErrorText({ children, ...props }, ref) {
  return (
    <Text ref={ref} {...props}>
      {children}
    </Text>
  );
});

// FormControlErrorIcon Component
type IFormControlErrorIconProps = ViewProps & {
  as?: React.ComponentType<any>;
  size?: "sm" | "md" | "lg";
};

export const FormControlErrorIcon = React.forwardRef<
  React.ComponentRef<typeof View>,
  IFormControlErrorIconProps
>(function FormControlErrorIcon({ as: Icon, size = "md", ...props }, ref) {
  if (!Icon) return null;
  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  return (
    <View ref={ref} {...props}>
      <Icon size={iconSize} color="#DC2626" />
    </View>
  );
});

FormControl.displayName = "FormControl";
FormControlLabel.displayName = "FormControlLabel";
FormControlLabelText.displayName = "FormControlLabelText";
FormControlError.displayName = "FormControlError";
FormControlErrorText.displayName = "FormControlErrorText";
FormControlErrorIcon.displayName = "FormControlErrorIcon";
