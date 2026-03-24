import { Stack } from 'expo-router';

export default function SharedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="rating" />
      <Stack.Screen name="dispute" />
    </Stack>
  );
}
