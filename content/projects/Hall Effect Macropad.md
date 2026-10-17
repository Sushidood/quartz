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

Each key's footprint has a X ohm decoupling capacitor, and an output filtering capacitor:

![[Hall Effect Macropad-1791985618317.webp]]

Here is a render of the board plus the switches:

![[Hall Effect Macropad-1791985562696.webp]]

As the brains of the keyboard, I chose the Raspberry Pi 2040 for its accessibility and dual-core architecture, which I plan to take advantage of in the future with threaded optimizations in the firmware.

I hand soldered each sensor, the multiplexer, and the RP2040 because JLCPCB tariffs would've killed the project otherwise.

## Firmware

The firmware is written in C and handles the analog scanning and sensor processing. It is based off the Keychron QMK fork, and is currently under construction.

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

#hardware #firmware