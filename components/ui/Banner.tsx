import { View } from "react-native"
import { Text, useTheme } from "react-native-paper"
import { Image } from "react-native"

export default function Banner() {
  const theme = useTheme()
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 10,
    }}>
      <Image 
        source={require('@/assets/images/icon.png')} 
        style={{ 
          width: 40, 
          height: 40, 
          marginRight: 10,
          borderRadius: 8
        }} 
      />
      <Text 
        variant="headlineMedium" 
        style={{ 
          fontWeight: 'bold'
        }}
      >
        Ephira
      </Text>
    </View>
  )
} 