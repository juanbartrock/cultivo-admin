// TEST MINIMO - Solo para verificar que el ESP32 arranca
// Si esto funciona, agregaremos las demás funciones

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("=== ESP32-C3 TEST ===");
  Serial.println("Si ves esto, el ESP32 funciona!");
}

void loop() {
  Serial.println("Tick...");
  delay(2000);
}
