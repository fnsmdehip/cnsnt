/**
 * Type declarations for untyped modules and asset imports.
 */

declare module 'react-native-markdown-display' {
  import React from 'react';
  import { StyleProp, TextStyle, ViewStyle } from 'react-native';

  interface MarkdownProps {
    children: string;
    style?: Record<string, StyleProp<TextStyle | ViewStyle>>;
  }

  const Markdown: React.FC<MarkdownProps>;
  export default Markdown;
}

declare module '*.md' {
  const value: number;
  export default value;
}

declare module '*.png' {
  const value: number;
  export default value;
}
