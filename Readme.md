#Raspberry Pi Scratch Alarm System

A simple alarm system build with the Scratch programming language and controlled by a web interface, homebridge or any device that can control a web service, such as Amazon Echo Bridge.  Build the hardware using a HC-SR501 PIR motion sensor and some LEDs.

## File Setup
* Copy Alarm System.sb to /home/pi/Documents/Scratch Projects/
* Copy AlarmSystemStart.sh to /home/pi/Scratch to automatically open Scratch project
* Copy AlarmSystemStart.desktop to /home/pi/.config/autostart to run above script at startup
* Copy .scratch.ini to /home/pi to disable Scratch "Remote sensor connections enabled" dialog

## Config
Update config.json with your settings

ifttt maker key optional
homebridge-http-webhooks port is optional

## Web Interface
* http://localhost
Shows Arm and Disarm buttons.  Flashes red when motion detected.

##Web Service URIs
* http://localhost/setState/disarmed
* http://localhost/setState/armed
* http://localhost/getState (returns either a 1 or a 0 for armed or disarmed)

## IFTTT
IFTTT maker event name is "motion-alarm"