import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function Banner() {
  const router = useRouter();

  const navigateToHome = () => {
    // Leads to the home page (index.tsx)
    router.push('/');
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
      }}
    >
      <TouchableOpacity onPress={navigateToHome} style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image
          source={require('@/assets/images/capstone-app-logo-transparent.png')}
          style={{
            width: 40,
            height: 40,
            marginRight: 10,
          }}
        />
        <Text
          variant="headlineMedium"
          style={{
            fontWeight: '600',
          }}
        >
          ephira
        </Text>
      </TouchableOpacity>
    </View>
  );
}
