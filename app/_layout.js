import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, View, StyleSheet, Image } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider } from '@react-navigation/native';
import merge from 'deepmerge';
import { Colors } from '../constants/Colors';

const customDarkTheme = { ...MD3DarkTheme, colors: Colors.dark };
const customLightTheme = { ...MD3LightTheme, colors: Colors.light };

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedDefaultTheme = merge(LightTheme, customLightTheme);
const CombinedDarkTheme = merge(DarkTheme, customDarkTheme);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const paperTheme =
    colorScheme === 'dark' ? CombinedDarkTheme : CombinedDefaultTheme;

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={paperTheme}>
        

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="signup_user" />
          <Stack.Screen name="signup_business" />
          <Stack.Screen name="signup_login" />
          <Stack.Screen name="login" />
          <Stack.Screen name="profile_business" />
          <Stack.Screen name="profile_user" />
          <Stack.Screen name="search_result" />
          <Stack.Screen name="search_result_review" />
          <Stack.Screen name="search_result_recipe" />
          <Stack.Screen name="recipe" />
          <Stack.Screen name="review" />
          <Stack.Screen name="upload_review" />
          <Stack.Screen name="upload_recipe" />
          <Stack.Screen name="saved" />
          <Stack.Screen name="message" />
          <Stack.Screen name="chat" />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}






