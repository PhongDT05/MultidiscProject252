#include <WiFi.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <BH1750.h>
#include <HardwareSerial.h>
#include <MyLD2410.h>

// WiFi and MQTT
const char* ssid = "Redmi Note 13 Pro";     
const char* password = "12345678";  
const char* mqtt_server = "broker.hivemq.com";

WiFiClient espClient;
PubSubClient client(espClient);

// OLED Display
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1); //SDA (Data): GPIO 21; SCL (Clock): GPIO 22

// Sensors
#define DHTPIN 4 // DHT22: GPIO 4
//#define DHTPIN 15 // DHT22: GPIO 15
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE); 

BH1750 lightMeter; //SDA (Data): GPIO 21; SCL (Clock): GPIO 22

#define MQ135_PIN 34
// Initialize Serial2 for the radar (RX=16, TX=17)
HardwareSerial radarSerial(2);
MyLD2410 radar(radarSerial);

// RELAY PINS & STATES
const int EXHAUST_FAN_PIN = 13;
const int COOLING_FAN_PIN = 12;
const int LIGHT_SYSTEM_PIN = 14;

// const int EXHAUST_FAN_PIN = 2;
// const int COOLING_FAN_PIN = 5;
// const int LIGHT_SYSTEM_PIN = 4;


// Change to HIGH if your relays are Active High
const int RELAY_ON = LOW;  
const int RELAY_OFF = HIGH;
int presenceCounter = 0;

// Global presence and mode state
bool isPresent = false;
bool isAutoMode = true;
// Sensor Connection Status
bool oledConnected = false;
bool dhtConnected = false;
bool bh1750Connected = false;
bool radarConnected = false;
bool mq135Connected = false;

// Thresholds
struct Thresholds{
  double tempMax, tempMin;
  double humMax, humMin;
  double lightMax, lightMin;
  int airMax, airMin;
  unsigned long msgInterval;
  int counter;
};

Thresholds th = {38, 15, 80, 40, 100, 40, 2000, 200, 5000, 12}; // {C, C, %, %, lx, lx, air, air, ms, counter}

// EEPROM config
#define EEPROM_SIZE sizeof(Thresholds)

void saveThresholds() {
  EEPROM.put(0,th);
  EEPROM.commit();
  Serial.println("Saved");
}

void loadThresholds() {
  EEPROM.get(0,th);
  Serial.println("Loaded");
}
// Timing
unsigned long lastMsg = 0;

// WiFi Connect
void setup_wifi(){
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid,password);
  while(WiFi.status()!=WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());
}

void reconnect(){
  while(!client.connected()){
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32ClientSmartLab")){
      Serial.println("connected");
      client.subscribe("esp32SLG4/commands");   
    } 
    else{
      Serial.print("failed");
      Serial.println(" retrying in 5s");
      delay(5000);
    }
  }
}

 // Command help
void printHelp(){
  Serial.println("\nCommands:");
  Serial.println("mode=auto, mode=manual : Switch control modes");
  Serial.println("exhaust=on, exhaust=off : Manual Exhaust fan control");
  Serial.println("cooling=on, cooling=off : Manual Cooling fan control");
  Serial.println("light=on, light=off : Manual Light control");
  Serial.println("interval=<ms> : Set delay time");
  Serial.println("temp_min=<v>, temp_max=<v> : Set Min/Max temperature");
  Serial.println("hum_min=<v>, hum_max=<v> : Set Min/Max humanity");
  Serial.println("light_min=<v>, light_max=<v> : Set Min/Max light");
  Serial.println("air_min=<v>, air_max=<v> : Set Min/Max air");
  Serial.println("show: display all thresholds");
  Serial.println("reset: reset to default values");
}

// Handle command
void handleCommand(String cmd){
  cmd.trim();
  bool changed = false;
  if(cmd.equalsIgnoreCase("show")){
      Serial.printf("\nMode: %s\n", isAutoMode ? "AUTO" : "MANUAL");
      Serial.printf("\nInterval: %lu ms\n",th.msgInterval);
      Serial.printf("Temp: %.2f - %.2f C\n",th.tempMin,th.tempMax);
      Serial.printf("Hum: %.2f - %.2f %%\n",th.humMin,th.humMax);
      Serial.printf("Light: %.2f - %.2f lx\n",th.lightMin,th.lightMax);
      Serial.printf("Air: %d - %d\n",th.airMin,th.airMax);
      Serial.printf("\nCounter: %d\n",th.counter );
    }
  else if(cmd.equalsIgnoreCase("reset")){
  th = {38, 15, 80, 40, 100, 40, 2000, 200, 5000, 12}; // {C, C, %, %, lx, lx, air, air, ms}

  saveThresholds();
  Serial.println(cmd);
  Serial.println("Reseted to default values");
  }
  //auto and manual
  else if(cmd.equalsIgnoreCase("mode=auto")){ 
    isAutoMode = true; 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("mode=manual")){ 
    isAutoMode = false; 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("exhaust=on")){ 
    isAutoMode = false; 
    digitalWrite(EXHAUST_FAN_PIN, RELAY_ON); 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("exhaust=off")){ 
    isAutoMode = false; 
    digitalWrite(EXHAUST_FAN_PIN, RELAY_OFF); 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("cooling=on")){ 
    isAutoMode = false; 
    digitalWrite(COOLING_FAN_PIN, RELAY_ON); 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("cooling=off")){ 
    isAutoMode = false; 
    digitalWrite(COOLING_FAN_PIN, RELAY_OFF); 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("light=on")){ 
    isAutoMode = false; 
    digitalWrite(LIGHT_SYSTEM_PIN, RELAY_ON); 
    changed = true; 
  }
  else if(cmd.equalsIgnoreCase("light=off")){ 
    isAutoMode = false; 
    digitalWrite(LIGHT_SYSTEM_PIN, RELAY_OFF); 
    changed = true; 
  }
  //threshold
  else if(cmd.startsWith("temp_max=")){ 
    th.tempMax = (cmd.substring(9)).toDouble(); 
    changed = true; 
    }
  else if(cmd.startsWith("temp_min=")){ 
    th.tempMin = (cmd.substring(9)).toDouble(); 
    changed = true; 
    }
  else if(cmd.startsWith("hum_max=")){ 
    th.humMax = (cmd.substring(8)).toDouble(); 
    changed = true; 
    }
  else if(cmd.startsWith("hum_min=")){ 
    th.humMin = (cmd.substring(8)).toDouble(); 
    changed = true; 
    }
  else if(cmd.startsWith("light_max=")){ 
    th.lightMax = (cmd.substring(10)).toDouble(); 
    changed = true; 
    }
  else if(cmd.startsWith("light_min=")){ 
    th.lightMin = (cmd.substring(10)).toDouble(); 
    changed = true; 
    }
  else if(cmd.startsWith("air_max=")){ 
    th.airMax = cmd.substring(8).toInt(); 
    changed = true; 
    }
  else if(cmd.startsWith("air_min=")){ 
    th.airMin = cmd.substring(8).toInt(); 
    changed = true; 
    }
  
  else if(cmd.startsWith("interval=")){ 
    th.msgInterval = cmd.substring(9).toInt(); 
    changed = true; 
    }
  else if(cmd.startsWith("counter=")){ 
    th.counter = cmd.substring(8).toInt(); 
    changed = true; 
    }
  else printHelp();

  if (changed){
    if (cmd.startsWith("temp") || cmd.startsWith("hum") || cmd.startsWith("light") || cmd.startsWith("air") || cmd.startsWith("interval") || cmd.startsWith("counter")){
       saveThresholds();
    }
    String msg = "Executed: " + cmd;
    Serial.println(msg);
    client.publish("esp32SLG4/alerts",msg.c_str());
    client.publish("esp32SLG4/mode", isAutoMode ? "auto" : "manual");
  }
}
//float
//topic
// Presence             esp32SLG4/presence
// Mode                 esp32SLG4/mode
// Temperature data	    esp32SLG4/temperature	
// Humidity data	      esp32SLG4/humidity	
// Light data	          esp32SLG4/light	
// Air quality data	    esp32SLG4/air	
// CounterPresence      esp32SLG4/counter
// Threshold alerts	    esp32SLG4/alertst - temp , esp32SLG4/alertsh - humi, esp32SLG4/alertsl - light,
                     // esp32SLG4/alertsa - air
// Commands	            esp32SLG4/commands      
// Sensor Health Status esp32SLG4/status/oled, esp32SLG4/status/dht, esp32SLG4/status/bh1750, esp32SLG4/status/radar, esp32SLG4/status/mq135

void callback(char* topic,byte* message,unsigned int length){
  String cmd = "";
  for(int i = 0;i < length;i++){
      cmd += (char)message[i];
  }
    Serial.println(cmd);
    handleCommand(cmd);
}

// Setup
void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  loadThresholds();

  // Initialize I2C Bus
  Serial.println("Initializing I2C Bus...");
  Wire.begin();

  // OLED Display (I2C)
  Serial.println("Initializing OLED Display...");
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("FATAL ERROR: OLED display failed to allocate! Check I2C wiring.");
    oledConnected = false;
  }else {
  Serial.println("OLED found!");
  oledConnected = true;
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0,0);
  display.println("System Booting...");
  display.println("Checking sensors...");

  display.display();
  delay(2000);
  }

  // DHT22 Temp/Humidity Sensor (Digital)
  Serial.println("Initializing DHT22...");
  dht.begin();
  if (!isnan(dht.readTemperature())){
    Serial.println("DHT22 found!");
    dhtConnected = true;
  } 
  else{
    Serial.println("ERROR: DHT22 failed to respond. Check wiring.");
    dhtConnected = false;
    display.println("ERR: DHT22 T&H"); 
    display.display();
    delay(2000);
  }
  Serial.println("DHT22 initialized!");

  // BH1750 Light Sensor (I2C)
  Serial.println("Initializing BH1750...");
  if (lightMeter.begin()){
    Serial.println("BH1750 found!");
    bh1750Connected = true;
  } 
  else{
    Serial.println("ERROR: BH1750 failed to respond. Check I2C wiring.");
    bh1750Connected = false;
    display.println("ERR: BH1750 Light"); 
    display.display();
    delay(2000);
  }

  // LD2410 Radar (UART)
  Serial.println("Initializing LD2410 Radar...");
  radarSerial.begin(256000, SERIAL_8N1, 16, 17);
  if (radar.begin()){
    Serial.println("LD2410 found!");
    radarConnected = true;
  } 
  else{
    Serial.println("ERROR: LD2410 failed to respond. Check TX/RX wiring.");
    radarConnected = false;
    display.println("ERR: LD2410 Radar"); 
    display.display();
    
    delay(2000);
  }

  // MQ-135 Air Quality Sensor (Analog)
  Serial.println("Initializing MQ-135...");
  
  int testAir = analogRead(MQ135_PIN);
  if (testAir == 0 || testAir >= 4095){
    Serial.println("WARNING: MQ-135 reading is extreme (0 or 4095). Check wiring!");
    mq135Connected = false;
    display.println("ERR: MQ135 Gas"); 
    display.display();
    
    delay(2000);
  }
  else{
    Serial.printf("MQ-135 initialized.");
    mq135Connected = true;
  }
  
  // Initialize Relays
  Serial.println("Initializing Relays...");
  pinMode(EXHAUST_FAN_PIN, OUTPUT);
  pinMode(COOLING_FAN_PIN, OUTPUT);
  pinMode(LIGHT_SYSTEM_PIN, OUTPUT);

  // Set default state to OFF
  digitalWrite(EXHAUST_FAN_PIN, RELAY_OFF);
  digitalWrite(COOLING_FAN_PIN, RELAY_OFF);
  digitalWrite(LIGHT_SYSTEM_PIN, RELAY_OFF);
  Serial.println("Relays configured and set to OFF.");

  // Update screen to show success
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("Smart Lab Station");
  display.println("All work");
  display.display();
  delay(2000);

  printHelp();
  delay(2000);
}

// Loop
void loop() {
  if(!client.connected()) reconnect();
  client.loop();

  if(Serial.available()){
    String cmd = Serial.readStringUntil('\n');
    handleCommand(cmd);
  }

  // Check Presence Radar Continuously
  if (radar.check() == MyLD2410::DATA) {
    isPresent = radar.presenceDetected();
    
    if (isPresent) {
      Serial.print("Target Detected! ");
      if (radar.movingTargetDetected()) {
        Serial.print("Moving at: ");
        Serial.print(radar.movingTargetDistance());
        Serial.print("cm ");
      }
      if (radar.stationaryTargetDetected()) {
        Serial.print("Stationary at: ");
        Serial.print(radar.stationaryTargetDistance());
        Serial.print("cm");
      }
      Serial.println();
    } 
    else {
      Serial.println("No presence detected.");
    }
  }
  unsigned long now = millis();
  if(now - lastMsg > th.msgInterval){
    lastMsg = now;

    if(!isPresent){
      presenceCounter += 1;
      if (presenceCounter == th.counter){
        isAutoMode = true; 
        presenceCounter = 0;
      }
    }
    else{
      presenceCounter = 0;
    }

    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    float lux = lightMeter.readLightLevel();
    int airValue = analogRead(MQ135_PIN);
  

    // Serial monitor
    Serial.printf("Mode: %s\n", isAutoMode ? "AUTO" : "MANUAL");
    Serial.printf("Temp: %.2f C | Hum: %.2f %% | Light: %.2f lx | Air: %d\n ",
                   temperature,humidity,lux,airValue);
    
    // OLED display
    display.clearDisplay();
    display.setCursor(0, 0);
    display.print("Temp: "); display.print(temperature); display.println(" C");
    display.print("Humi: "); display.print(humidity); display.println(" %");
    display.print("Light: "); display.print(lux); display.println(" lx");
    display.print("Air: "); display.println(airValue);
    display.print("Mode: ");display.println(isAutoMode ? "[A]" : "[M]");

    // display.setCursor(100, 50); display.print(isAutoMode ? "[A]" : "[M]");
    

    // Publish
    client.publish("esp32SLG4/temperature", String(temperature).c_str());
    client.publish("esp32SLG4/humidity", String(humidity).c_str());
    client.publish("esp32SLG4/light", String(lux).c_str());
    client.publish("esp32SLG4/air", String(airValue).c_str());
    client.publish("esp32SLG4/mode", isAutoMode ? "auto" : "manual");
    client.publish("esp32SLG4/presence", isPresent ? "Use" : "Empty");

    // Publish Sensor Health Status
    client.publish("esp32SLG4/status/oled", oledConnected ? "Connected" : "Error");
    client.publish("esp32SLG4/status/dht", dhtConnected ? "Connected" : "Error");
    client.publish("esp32SLG4/status/bh1750", bh1750Connected ? "Connected" : "Error");
    client.publish("esp32SLG4/status/radar", radarConnected ? "Connected" : "Error");
    client.publish("esp32SLG4/status/mq135", mq135Connected ? "Connected" : "Error");

    // AUTOMATION & RELAY CONTROL LOGIC
    if (isAutoMode) {
      
      // 1. Air Quality Control (Ignores Presence)
      // Hysteresis: Turns on > airMax, stays on until it drops 50 units below airMax
      bool isExhaustOn = (digitalRead(EXHAUST_FAN_PIN) == RELAY_ON);
      bool shouldExhaust = (airValue > th.airMax) || (isExhaustOn && airValue > (th.airMax - 50));
      digitalWrite(EXHAUST_FAN_PIN, shouldExhaust ? RELAY_ON : RELAY_OFF);

      // 2. Cooling Fan Control (Requires Presence)
      // Hysteresis: Turns on > tempMax, stays on until it drops 1.0C below tempMax
      bool isCoolingOn = (digitalRead(COOLING_FAN_PIN) == RELAY_ON);
      bool shouldCool = isPresent && ((temperature > th.tempMax) || (isCoolingOn && temperature > (th.tempMax - 1.0)));
      digitalWrite(COOLING_FAN_PIN, shouldCool ? RELAY_ON : RELAY_OFF);

      // 3. Lighting Control (Requires Presence)
      // Hysteresis: Turns on < lightMin, stays on until it gets 20 lux brighter than lightMin
      bool isLightOn = (digitalRead(LIGHT_SYSTEM_PIN) == RELAY_ON);
      bool shouldLight = isPresent && ((lux < th.lightMin) || (isLightOn && lux < (th.lightMin + 20.0)));
      digitalWrite(LIGHT_SYSTEM_PIN, shouldLight ? RELAY_ON : RELAY_OFF);
      
    }

    // Threshold checks
    char alert[32];
    if(th.tempMin>=th.tempMax){
      sprintf(alert,"Set Sai");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertst",alert);
    }
    else if(th.humMin>=th.humMax){
      sprintf(alert,"Set Sai");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsh",alert);
    }
    else if(th.lightMin>=th.lightMax){
      sprintf(alert,"Set Sai");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsl",alert);
    }
    else if(th.airMin>=th.airMax){
      sprintf(alert,"Set Sai");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsa",alert);
    }
    else{
    if(temperature < th.tempMin){
      sprintf(alert,"Too Cold");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertst",alert);
    }

    if(temperature > th.tempMax){
     sprintf(alert,"Too Hot");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertst",alert);
    }

    if(humidity < th.humMin){
     sprintf(alert,"Too Dried");
     Serial.println(alert);
     display.print(alert);
     client.publish("esp32SLG4/alertsh",alert);
    }

    if(humidity > th.humMax){
     sprintf(alert,"Too Humid");
     Serial.println(alert);
     display.print(alert);
     client.publish("esp32SLG4/alertsh",alert);
    }

    if(lux < th.lightMin){
      sprintf(alert,"Too Dark");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsl",alert);
    }
    if(lux > th.lightMax){
      sprintf(alert,"Too Bright");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsl",alert);
    }

    if(airValue < th.airMin){
      sprintf(alert,"Too Clean");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsa",alert);
    }
    if(airValue > th.airMax){
      sprintf(alert,"Too Poor");
      Serial.println(alert);
      display.print(alert);
      client.publish("esp32SLG4/alertsa",alert);
    }
    }
    display.display();
  }
}