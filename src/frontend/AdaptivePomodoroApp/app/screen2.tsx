import { useRouter } from "expo-router";
import { View, Text, Button } from "react-native";

export default function Screen2() {
    const router = useRouter();

    return(
        <View style={{ flex:1, justifyContent: 'center', alignItems: 'center'}}>
            <Text> Estamos en la página 2</Text>
            <Button title="Volver a la página 1" onPress={() => router.back()}></Button>
        </View>
    )
}