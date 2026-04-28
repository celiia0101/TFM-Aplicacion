import { useRouter } from "expo-router";
import { View, Text, Button, StyleSheet } from "react-native";
import logo from '../assets/images/logo.png';

export default function Screen1(){
    const router = useRouter()
    return (<View>
        <Text style={styles.text}> Hola desde screen 1</Text>

        <Button title="Ir a pantalla 2" onPress={()=>router.push("/screen2")}></Button>
    </View>)
}

const styles = StyleSheet.create({
    text:{
        color:"rgb(206, 83, 2)",
        fontSize:45
    }
})