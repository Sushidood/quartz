---
title: Hall Effect Macropad
description: A custom magnetic mini-keyboard designed from the ground up
tags:
  - hardware
  - firmware
links: "[GitHub Repository](https://github.com/Sushidood/qmk_firmware_ezymacropad)"
---
## Overview

This project combines:

- Mixed-signal PCB design
- RP2040 firmware
- Hall-effect sensing
- Analog multiplexing
- Mechanical design
- Sensor characterization

## Hardware

The PCB was designed in KiCad; the following picture is my final PCB design: 

![[Hall Effect Macropad-1791985675634.webp]]

Each key's footprint has a decoupling capacitor, and an (optional) output filtering capacitor for its multiplexer line:

![[Hall Effect Macropad-1791985618317.webp]]

Here is a render of the board plus the switches:

![[Hall Effect Macropad-1791985562696.webp]]

As the brains of the keyboard, I chose the Raspberry Pi 2040 for its accessibility and dual-core architecture, which I plan to take advantage of in the future with threaded optimizations in the firmware.

Due to RP2040 only having one internal analog to digital converter despite its 3 ADC capable pins, I opted to feed every key through one 16:1 multiplexer, and into the RP2040. The hardware stack is pretty simple because this was very much a learning process for me.
### Other hardware considerations:

I hand soldered each sensor, the multiplexer, and the RP2040 because JLCPCB import tariffs would've killed the project otherwise.

In terms of switches, I decided to go with the Gateron Magnetic Jade Pros, based off magnetic flux range and their smooth feel.
## Firmware

The firmware is written in C and handles the analog scanning and sensor processing. It is based off the Keychron QMK fork, and is currently under construction.

Currently, the multiplexer goes through the 16 mux addresses in Gray-code order. The ADC-read value is then compared with the value on boot, with threshold and hysteresis to determine keystroke.  

After remapping the address, the firmware returns the changes in the 4x4 matrix, and QMK handles the rest.
## Case and Plate

Currently, there is no case for the keyboard; the keyboard rests on nylon nuts that go with screws to keep the plate securely seated.

I modeled the plate in Onshape, and used a ribbed underside as opposed to standoffs to remove unnecessary parts.

Here is the model in Onshape:

![[Hall Effect Macropad-1792209034526.webp]]

## Results

The system achieved sub-0.1 mm keystroke resolution during characterization, and costs around 2x less than commercial equivalents.

In terms of latency, I don't have the capabilities to test it unfortunately, but even for games like Geometry Dash with high time sensitivity, I found no perceivable difference compared to my Epomaker HE80 hall effect board.

Here it is realized in real life:

![[Hall Effect Macropad-1792209174497.webp]]


## Future Plans

Unfortunately, the keyboard is limited to a 1000Hz polling rate due to the RP2040's standard speed USB protocol hardware limitation. 

In the future, I will linearize the keystroke curve, and switch to a USB high-speed capable MCU (probably an STM32 variant). 

Right now, even though the board has good latency, I want to optimize it before making any breaking hardware changes like switching to a different MCU. Therefore, I'm going to implement DMA and threaded optimizations to get the current version working smoothly before I start developing v2.
#hardware #firmware