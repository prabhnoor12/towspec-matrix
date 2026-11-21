const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

// Base Vehicle Lineup Templates with Historical Generation Adjustments (2015 - 2026)
const LINEUP_TEMPLATES = [
  {
    brand: 'Ford',
    model: 'F-150',
    trim: 'SuperCrew 3.5L EcoBoost V6 4WD',
    slugKey: 'ford-f150-35l-ecoboost-4wd',
    category: 'Half-Ton Truck',
    engine: '3.5L Twin-Turbo EcoBoost V6',
    drivetrain: '4WD',
    axleRatio: '3.55',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 145,
    fuelEconomyMpg: '18 City / 23 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2016
        ? { hp: 365, tq: 420, tow: 12200, payload: 2250, gvwr: 7000, gcwr: 17900, curb: 4750 }
        : y <= 2020
        ? { hp: 375, tq: 470, tow: 13200, payload: 2320, gvwr: 7050, gcwr: 18700, curb: 4730 }
        : { hp: 400, tq: 500, tow: 13500, payload: 2445, gvwr: 7100, gcwr: 19400, curb: 4950 }
  },
  {
    brand: 'Ford',
    model: 'F-150',
    trim: 'SuperCrew 5.0L Coyote V8 4WD',
    slugKey: 'ford-f150-50l-v8-4wd',
    category: 'Half-Ton Truck',
    engine: '5.0L Ti-VCT Coyote V8',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 145,
    fuelEconomyMpg: '16 City / 22 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2017
        ? { hp: 385, tq: 387, tow: 11100, payload: 2180, gvwr: 7000, gcwr: 16600, curb: 4820 }
        : y <= 2020
        ? { hp: 395, tq: 400, tow: 11500, payload: 2210, gvwr: 7000, gcwr: 17000, curb: 4790 }
        : { hp: 400, tq: 410, tow: 12900, payload: 2230, gvwr: 7050, gcwr: 18400, curb: 4915 }
  },
  {
    brand: 'Ford',
    model: 'F-150',
    trim: 'SuperCrew 2.7L EcoBoost V6 4WD',
    slugKey: 'ford-f150-27l-ecoboost-4wd',
    category: 'Half-Ton Truck',
    engine: '2.7L Twin-Turbo EcoBoost V6',
    drivetrain: '4WD',
    axleRatio: '3.55',
    hitchClass: 'Class IV',
    wheelbaseIn: 145,
    fuelEconomyMpg: '19 City / 25 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2017
        ? { hp: 325, tq: 375, tow: 8100, payload: 1710, gvwr: 6500, gcwr: 13300, curb: 4790 }
        : { hp: 325, tq: 400, tow: 8400, payload: 1785, gvwr: 6600, gcwr: 13600, curb: 4815 }
  },
  {
    brand: 'Ford',
    model: 'F-150',
    trim: 'SuperCrew 3.5L PowerBoost Hybrid 4WD',
    slugKey: 'ford-f150-powerboost-hybrid-4wd',
    category: 'Half-Ton Truck',
    engine: '3.5L PowerBoost Full Hybrid V6',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 145,
    fuelEconomyMpg: '22 City / 24 Hwy',
    years: [2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2023
        ? { hp: 430, tq: 570, tow: 12400, payload: 1810, gvwr: 7350, gcwr: 18100, curb: 5540 }
        : { hp: 430, tq: 570, tow: 11200, payload: 1750, gvwr: 7350, gcwr: 17100, curb: 5600 }
  },
  {
    brand: 'Ford',
    model: 'F-150 Lightning',
    trim: 'Extended Range Dual-Motor AWD',
    slugKey: 'ford-f150-lightning-extended-range',
    category: 'Electric Truck',
    engine: 'Dual Electric Motors (131 kWh)',
    drivetrain: 'AWD',
    axleRatio: '9.61',
    hitchClass: 'Class IV',
    wheelbaseIn: 145.5,
    fuelEconomyMpg: '78 MPGe / 68 Hwy',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 580, tq: 775, tow: 10000, payload: 1952, gvwr: 8550, gcwr: 17500, curb: 6598 })
  },
  {
    brand: 'Ford',
    model: 'F-250 Super Duty',
    trim: 'Crew Cab 6.7L Power Stroke Turbo Diesel 4WD',
    slugKey: 'ford-f250-67l-powerstroke-diesel',
    category: 'Heavy-Duty Truck',
    engine: '6.7L Power Stroke V8 Turbo Diesel',
    drivetrain: '4WD',
    axleRatio: '3.55',
    hitchClass: 'Class V / 5th-Wheel Prep',
    wheelbaseIn: 160,
    fuelEconomyMpg: '15 City / 19 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2016
        ? { hp: 440, tq: 860, tow: 16600, payload: 3040, gvwr: 10000, gcwr: 25700, curb: 6960 }
        : y <= 2019
        ? { hp: 450, tq: 935, tow: 18000, payload: 3250, gvwr: 10400, gcwr: 27500, curb: 7150 }
        : y <= 2022
        ? { hp: 475, tq: 1050, tow: 20000, payload: 3390, gvwr: 10600, gcwr: 28800, curb: 7210 }
        : { hp: 475, tq: 1050, tow: 22000, payload: 3470, gvwr: 10800, gcwr: 30000, curb: 7330 }
  },
  {
    brand: 'Ford',
    model: 'F-250 Super Duty',
    trim: 'Crew Cab 7.3L Godzilla Gas V8 4WD',
    slugKey: 'ford-f250-73l-godzilla-v8',
    category: 'Heavy-Duty Truck',
    engine: '7.3L OHV PFI Gas V8',
    drivetrain: '4WD',
    axleRatio: '4.30',
    hitchClass: 'Class V',
    wheelbaseIn: 160,
    fuelEconomyMpg: '13 City / 17 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 430, tq: 485, tow: 17200, payload: 3940, gvwr: 10600, gcwr: 24800, curb: 6660 })
  },
  {
    brand: 'Ford',
    model: 'F-350 Super Duty',
    trim: 'Crew Cab DRW 6.7L High-Output Diesel 4WD',
    slugKey: 'ford-f350-67l-high-output-drw',
    category: 'Heavy-Duty Truck',
    engine: '6.7L High-Output Power Stroke V8 Diesel',
    drivetrain: '4WD',
    axleRatio: '4.10',
    hitchClass: 'Class V / Gooseneck',
    wheelbaseIn: 176,
    fuelEconomyMpg: '14 City / 17 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2022
        ? { hp: 475, tq: 1050, tow: 31200, payload: 6050, gvwr: 14000, gcwr: 41000, curb: 7950 }
        : { hp: 500, tq: 1200, tow: 32900, payload: 6210, gvwr: 14000, gcwr: 43000, curb: 7790 }
  },
  {
    brand: 'Ford',
    model: 'Ranger',
    trim: 'SuperCrew 2.3L EcoBoost 4WD',
    slugKey: 'ford-ranger-23l-ecoboost-4wd',
    category: 'Midsize Truck',
    engine: '2.3L EcoBoost Turbo I-4',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class IV',
    wheelbaseIn: 128.7,
    fuelEconomyMpg: '20 City / 24 Hwy',
    years: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 270, tq: 310, tow: 7500, payload: 1711, gvwr: 6170, gcwr: 12650, curb: 4459 })
  },
  {
    brand: 'Ford',
    model: 'Maverick',
    trim: 'SuperCrew 2.0L EcoBoost AWD (4K Tow Pkg)',
    slugKey: 'ford-maverick-20l-ecoboost-4k-tow',
    category: 'Midsize Truck',
    engine: '2.0L EcoBoost Turbo I-4',
    drivetrain: 'AWD',
    axleRatio: '3.81',
    hitchClass: 'Class III',
    wheelbaseIn: 121.1,
    fuelEconomyMpg: '22 City / 29 Hwy',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 250, tq: 277, tow: 4000, payload: 1500, gvwr: 5205, gcwr: 8145, curb: 3705 })
  },
  {
    brand: 'Ford',
    model: 'Expedition',
    trim: '4WD 3.5L EcoBoost w/ Heavy-Duty Trailer Tow',
    slugKey: 'ford-expedition-35l-ecoboost-hd-tow',
    category: 'Full-Size SUV',
    engine: '3.5L EcoBoost Twin-Turbo V6',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class IV',
    wheelbaseIn: 122.5,
    fuelEconomyMpg: '16 City / 22 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 400, tq: 480, tow: 9200, payload: 1758, gvwr: 7450, gcwr: 15300, curb: 5692 })
  },
  {
    brand: 'Ford',
    model: 'Explorer',
    trim: '3.0L EcoBoost V6 4WD',
    slugKey: 'ford-explorer-30l-ecoboost-4wd',
    category: 'Midsize SUV',
    engine: '3.0L Twin-Turbo EcoBoost V6',
    drivetrain: '4WD',
    axleRatio: '3.58',
    hitchClass: 'Class III',
    wheelbaseIn: 119.1,
    fuelEconomyMpg: '18 City / 24 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 400, tq: 415, tow: 5600, payload: 1410, gvwr: 6160, gcwr: 10700, curb: 4750 })
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'Crew Cab 5.3L EcoTec3 V8 4WD',
    slugKey: 'chevy-silverado-1500-53l-v8-4wd',
    category: 'Half-Ton Truck',
    engine: '5.3L EcoTec3 V8',
    drivetrain: '4WD',
    axleRatio: '3.23',
    hitchClass: 'Class IV',
    wheelbaseIn: 147.4,
    fuelEconomyMpg: '15 City / 20 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2018
        ? { hp: 355, tq: 383, tow: 10800, payload: 1940, gvwr: 7200, gcwr: 16300, curb: 5260 }
        : { hp: 355, tq: 383, tow: 11300, payload: 2040, gvwr: 7100, gcwr: 16800, curb: 5060 }
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'Crew Cab 6.2L V8 4WD Max Trailering',
    slugKey: 'chevy-silverado-1500-62l-v8-max-tow',
    category: 'Half-Ton Truck',
    engine: '6.2L EcoTec3 V8',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 147.4,
    fuelEconomyMpg: '14 City / 19 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2018
        ? { hp: 420, tq: 460, tow: 12500, payload: 1910, gvwr: 7200, gcwr: 17900, curb: 5290 }
        : { hp: 420, tq: 460, tow: 13300, payload: 1980, gvwr: 7300, gcwr: 18700, curb: 5320 }
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'Crew Cab 3.0L Duramax Turbo-Diesel 4WD',
    slugKey: 'chevy-silverado-1500-30l-duramax-diesel',
    category: 'Half-Ton Truck',
    engine: '3.0L Duramax Inline-6 Turbo-Diesel',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 147.4,
    fuelEconomyMpg: '23 City / 27 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2022
        ? { hp: 277, tq: 460, tow: 9500, payload: 1870, gvwr: 7200, gcwr: 15000, curb: 5330 }
        : { hp: 305, tq: 495, tow: 13000, payload: 1900, gvwr: 7200, gcwr: 18500, curb: 5300 }
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado 1500',
    trim: 'Crew Cab 2.7L TurboMax 4WD',
    slugKey: 'chevy-silverado-1500-27l-turbomax',
    category: 'Half-Ton Truck',
    engine: '2.7L TurboMax High-Output I-4',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class IV',
    wheelbaseIn: 147.4,
    fuelEconomyMpg: '18 City / 21 Hwy',
    years: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2021
        ? { hp: 310, tq: 348, tow: 7000, payload: 2050, gvwr: 6950, gcwr: 12400, curb: 4900 }
        : { hp: 310, tq: 430, tow: 9200, payload: 2120, gvwr: 7000, gcwr: 14500, curb: 4880 }
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado 2500HD',
    trim: 'Crew Cab 6.6L Duramax Turbo-Diesel 4WD',
    slugKey: 'chevy-silverado-2500hd-66l-duramax',
    category: 'Heavy-Duty Truck',
    engine: '6.6L Duramax V8 Turbo-Diesel (Allison 10-Spd)',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class V / Gooseneck Prep',
    wheelbaseIn: 159,
    fuelEconomyMpg: '15 City / 19 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2019
        ? { hp: 445, tq: 910, tow: 15400, payload: 3160, gvwr: 10000, gcwr: 25300, curb: 6840 }
        : y <= 2023
        ? { hp: 445, tq: 910, tow: 18500, payload: 3530, gvwr: 11150, gcwr: 27500, curb: 7620 }
        : { hp: 470, tq: 975, tow: 22070, payload: 3615, gvwr: 11350, gcwr: 30000, curb: 7735 }
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado 2500HD',
    trim: 'Crew Cab 6.6L Gas V8 4WD',
    slugKey: 'chevy-silverado-2500hd-66l-gas-v8',
    category: 'Heavy-Duty Truck',
    engine: '6.6L Direct-Injection Gas V8',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class V',
    wheelbaseIn: 159,
    fuelEconomyMpg: '13 City / 17 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 401, tq: 464, tow: 16000, payload: 3759, gvwr: 10650, gcwr: 24000, curb: 6891 })
  },
  {
    brand: 'Chevrolet',
    model: 'Colorado',
    trim: 'Crew Cab 4WD Max Trailering',
    slugKey: 'chevy-colorado-27l-turbomax-4wd',
    category: 'Midsize Truck',
    engine: '2.7L TurboMax I-4 / 3.6L V6',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class IV',
    wheelbaseIn: 131.4,
    fuelEconomyMpg: '17 City / 21 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2022
        ? { hp: 308, tq: 275, tow: 7000, payload: 1540, gvwr: 6000, gcwr: 12200, curb: 4460 }
        : { hp: 310, tq: 430, tow: 7700, payload: 1587, gvwr: 6250, gcwr: 13100, curb: 4663 }
  },
  {
    brand: 'Chevrolet',
    model: 'Tahoe',
    trim: '4WD 5.3L V8 w/ Max Trailering Package',
    slugKey: 'chevy-tahoe-53l-v8-max-trailering',
    category: 'Full-Size SUV',
    engine: '5.3L EcoTec3 V8',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class IV',
    wheelbaseIn: 120.9,
    fuelEconomyMpg: '15 City / 20 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 355, tq: 383, tow: 8200, payload: 1746, gvwr: 7500, gcwr: 14500, curb: 5754 })
  },
  {
    brand: 'Chevrolet',
    model: 'Suburban',
    trim: '4WD 3.0L Duramax / 5.3L V8 Max Trailering',
    slugKey: 'chevy-suburban-30l-duramax-4wd',
    category: 'Full-Size SUV',
    engine: '3.0L Duramax Inline-6 / 5.3L V8',
    drivetrain: '4WD',
    axleRatio: '3.23',
    hitchClass: 'Class IV',
    wheelbaseIn: 134.1,
    fuelEconomyMpg: '20 City / 26 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 277, tq: 460, tow: 7800, payload: 1612, gvwr: 7700, gcwr: 14000, curb: 6088 })
  },
  {
    brand: 'GMC',
    model: 'Sierra 1500',
    trim: 'SLT / Denali Crew Cab 6.2L V8 4WD',
    slugKey: 'gmc-sierra-1500-62l-v8-4wd',
    category: 'Half-Ton Truck',
    engine: '6.2L EcoTec3 V8',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 147.4,
    fuelEconomyMpg: '15 City / 19 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 420, tq: 460, tow: 13000, payload: 1890, gvwr: 7300, gcwr: 18500, curb: 5410 })
  },
  {
    brand: 'GMC',
    model: 'Sierra 1500',
    trim: 'AT4 / Elevation 3.0L Duramax Diesel 4WD',
    slugKey: 'gmc-sierra-1500-30l-duramax-at4',
    category: 'Half-Ton Truck',
    engine: '3.0L Duramax Turbo-Diesel I-6',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 147.4,
    fuelEconomyMpg: '23 City / 27 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 305, tq: 495, tow: 13000, payload: 1860, gvwr: 7200, gcwr: 18500, curb: 5340 })
  },
  {
    brand: 'GMC',
    model: 'Sierra 2500HD',
    trim: 'Denali Crew Cab 6.6L Duramax Diesel 4WD',
    slugKey: 'gmc-sierra-2500hd-66l-duramax-denali',
    category: 'Heavy-Duty Truck',
    engine: '6.6L Duramax V8 Turbo-Diesel',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class V / 5th-Wheel Prep',
    wheelbaseIn: 159,
    fuelEconomyMpg: '15 City / 18 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2019
        ? { hp: 445, tq: 910, tow: 15400, payload: 3090, gvwr: 10000, gcwr: 25300, curb: 6910 }
        : { hp: 470, tq: 975, tow: 21870, payload: 3490, gvwr: 11350, gcwr: 30000, curb: 7860 }
  },
  {
    brand: 'GMC',
    model: 'Canyon',
    trim: 'AT4 / Denali 4WD',
    slugKey: 'gmc-canyon-at4-27l-turbomax',
    category: 'Midsize Truck',
    engine: '2.7L TurboMax High-Output I-4',
    drivetrain: '4WD',
    axleRatio: '3.42',
    hitchClass: 'Class IV',
    wheelbaseIn: 131.4,
    fuelEconomyMpg: '17 City / 21 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 310, tq: 430, tow: 7700, payload: 1550, gvwr: 6250, gcwr: 13100, curb: 4700 })
  },
  {
    brand: 'GMC',
    model: 'Yukon',
    trim: 'Denali 6.2L V8 4WD w/ Max Trailering',
    slugKey: 'gmc-yukon-62l-v8-4wd',
    category: 'Full-Size SUV',
    engine: '6.2L EcoTec3 V8',
    drivetrain: '4WD',
    axleRatio: '3.23',
    hitchClass: 'Class IV',
    wheelbaseIn: 120.9,
    fuelEconomyMpg: '14 City / 18 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 420, tq: 460, tow: 8200, payload: 1655, gvwr: 7500, gcwr: 14500, curb: 5845 })
  },
  {
    brand: 'Ram',
    model: '1500',
    trim: 'Crew Cab 5.7L HEMI V8 4WD (3.92 Axle)',
    slugKey: 'ram-1500-57l-hemi-v8-4wd',
    category: 'Half-Ton Truck',
    engine: '5.7L HEMI V8 w/ eTorque',
    drivetrain: '4WD',
    axleRatio: '3.92',
    hitchClass: 'Class IV',
    wheelbaseIn: 144.5,
    fuelEconomyMpg: '17 City / 22 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    specByYear: (y) =>
      y <= 2018
        ? { hp: 395, tq: 410, tow: 10350, payload: 1680, gvwr: 6900, gcwr: 15950, curb: 5220 }
        : { hp: 395, tq: 410, tow: 11410, payload: 1830, gvwr: 7100, gcwr: 17000, curb: 5270 }
  },
  {
    brand: 'Ram',
    model: '1500',
    trim: 'Crew Cab 3.0L Hurricane Standard Output 4WD',
    slugKey: 'ram-1500-30l-hurricane-so-4wd',
    category: 'Half-Ton Truck',
    engine: '3.0L Hurricane Twin-Turbo I-6 (SO)',
    drivetrain: '4WD',
    axleRatio: '3.92',
    hitchClass: 'Class IV',
    wheelbaseIn: 144.5,
    fuelEconomyMpg: '17 City / 24 Hwy',
    years: [2025, 2026],
    specByYear: () => ({ hp: 420, tq: 469, tow: 11550, payload: 1910, gvwr: 7100, gcwr: 17200, curb: 5190 })
  },
  {
    brand: 'Ram',
    model: '1500',
    trim: 'Limited Crew Cab 3.0L Hurricane High-Output 4WD',
    slugKey: 'ram-1500-30l-hurricane-ho-4wd',
    category: 'Half-Ton Truck',
    engine: '3.0L Hurricane Twin-Turbo I-6 (HO)',
    drivetrain: '4WD',
    axleRatio: '3.92',
    hitchClass: 'Class IV',
    wheelbaseIn: 144.5,
    fuelEconomyMpg: '15 City / 21 Hwy',
    years: [2025, 2026],
    specByYear: () => ({ hp: 540, tq: 521, tow: 9920, payload: 1520, gvwr: 7100, gcwr: 16000, curb: 5580 })
  },
  {
    brand: 'Ram',
    model: '1500',
    trim: 'Big Horn Crew Cab 3.6L Pentastar V6 4WD',
    slugKey: 'ram-1500-36l-pentastar-v6-4wd',
    category: 'Half-Ton Truck',
    engine: '3.6L Pentastar V6 w/ eTorque',
    drivetrain: '4WD',
    axleRatio: '3.55',
    hitchClass: 'Class IV',
    wheelbaseIn: 144.5,
    fuelEconomyMpg: '19 City / 24 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 305, tq: 269, tow: 7710, payload: 2110, gvwr: 6900, gcwr: 12900, curb: 4790 })
  },
  {
    brand: 'Ram',
    model: '2500 Heavy Duty',
    trim: 'Crew Cab 6.7L Cummins Turbo-Diesel 4WD',
    slugKey: 'ram-2500-67l-cummins-diesel-4wd',
    category: 'Heavy-Duty Truck',
    engine: '6.7L Cummins Inline-6 Turbo-Diesel',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class V / 5th-Wheel Prep',
    wheelbaseIn: 149,
    fuelEconomyMpg: '14 City / 18 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2018
        ? { hp: 370, tq: 800, tow: 17980, payload: 2210, gvwr: 10000, gcwr: 25300, curb: 7790 }
        : { hp: 370, tq: 850, tow: 19990, payload: 2380, gvwr: 10000, gcwr: 27600, curb: 7620 }
  },
  {
    brand: 'Ram',
    model: '2500 Heavy Duty',
    trim: 'Crew Cab 6.4L HEMI Gas V8 4WD',
    slugKey: 'ram-2500-64l-hemi-v8-4wd',
    category: 'Heavy-Duty Truck',
    engine: '6.4L Heavy-Duty HEMI V8',
    drivetrain: '4WD',
    axleRatio: '4.10',
    hitchClass: 'Class V',
    wheelbaseIn: 149,
    fuelEconomyMpg: '12 City / 16 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 410, tq: 429, tow: 17540, payload: 3240, gvwr: 10000, gcwr: 24500, curb: 6760 })
  },
  {
    brand: 'Ram',
    model: '3500 Heavy Duty',
    trim: 'Crew Cab SRW 6.7L High-Output Cummins 4WD',
    slugKey: 'ram-3500-67l-cummins-ho-srw',
    category: 'Heavy-Duty Truck',
    engine: '6.7L High-Output Cummins I-6 Diesel',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class V / Gooseneck',
    wheelbaseIn: 169,
    fuelEconomyMpg: '14 City / 17 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 420, tq: 1075, tow: 25890, payload: 4250, gvwr: 12300, gcwr: 33900, curb: 8050 })
  },
  {
    brand: 'Toyota',
    model: 'Tundra',
    trim: 'CrewMax 4WD (3.4L Twin-Turbo V6 / 5.7L i-FORCE V8)',
    slugKey: 'toyota-tundra-34l-twin-turbo-v6-4wd',
    category: 'Half-Ton Truck',
    engine: '3.4L i-FORCE Twin-Turbo V6 / 5.7L V8',
    drivetrain: '4WD',
    axleRatio: '3.31',
    hitchClass: 'Class IV',
    wheelbaseIn: 145.7,
    fuelEconomyMpg: '17 City / 22 Hwy',
    years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2021
        ? { hp: 381, tq: 401, tow: 9800, payload: 1560, gvwr: 7200, gcwr: 16000, curb: 5640 }
        : { hp: 389, tq: 479, tow: 11200, payload: 1740, gvwr: 7230, gcwr: 17200, curb: 5490 }
  },
  {
    brand: 'Toyota',
    model: 'Tundra',
    trim: 'CrewMax Platinum i-FORCE MAX Hybrid 4WD',
    slugKey: 'toyota-tundra-iforce-max-hybrid-4wd',
    category: 'Half-Ton Truck',
    engine: '3.4L i-FORCE MAX Twin-Turbo Hybrid V6',
    drivetrain: '4WD',
    axleRatio: '3.31',
    hitchClass: 'Class IV',
    wheelbaseIn: 145.7,
    fuelEconomyMpg: '19 City / 22 Hwy',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 437, tq: 583, tow: 11170, payload: 1600, gvwr: 7660, gcwr: 17600, curb: 6060 })
  },
  {
    brand: 'Toyota',
    model: 'Tacoma',
    trim: 'Double Cab TRD Off-Road / SR5 4WD',
    slugKey: 'toyota-tacoma-24l-turbo-4wd',
    category: 'Midsize Truck',
    engine: '2.4L i-FORCE Turbo I-4 / 3.5L V6',
    drivetrain: '4WD',
    axleRatio: '3.58',
    hitchClass: 'Class IV',
    wheelbaseIn: 131.9,
    fuelEconomyMpg: '19 City / 24 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2023
        ? { hp: 278, tq: 265, tow: 6400, payload: 1155, gvwr: 5600, gcwr: 11360, curb: 4445 }
        : { hp: 278, tq: 317, tow: 6400, payload: 1465, gvwr: 6005, gcwr: 11340, curb: 4540 }
  },
  {
    brand: 'Toyota',
    model: 'Tacoma',
    trim: 'Double Cab TRD Pro / Trailhunter i-FORCE MAX 4WD',
    slugKey: 'toyota-tacoma-iforce-max-hybrid',
    category: 'Midsize Truck',
    engine: '2.4L i-FORCE MAX Turbo Hybrid I-4',
    drivetrain: '4WD',
    axleRatio: '3.58',
    hitchClass: 'Class IV',
    wheelbaseIn: 131.9,
    fuelEconomyMpg: '22 City / 24 Hwy',
    years: [2024, 2025, 2026],
    specByYear: () => ({ hp: 326, tq: 465, tow: 6000, payload: 1575, gvwr: 6550, gcwr: 11600, curb: 4975 })
  },
  {
    brand: 'Toyota',
    model: 'Sequoia',
    trim: 'Limited / Platinum 4WD',
    slugKey: 'toyota-sequoia-iforce-max-4wd',
    category: 'Full-Size SUV',
    engine: '3.4L i-FORCE MAX Hybrid V6 / 5.7L V8',
    drivetrain: '4WD',
    axleRatio: '3.31',
    hitchClass: 'Class IV',
    wheelbaseIn: 122,
    fuelEconomyMpg: '19 City / 22 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2022
        ? { hp: 381, tq: 401, tow: 7100, payload: 1310, gvwr: 7300, gcwr: 13600, curb: 5990 }
        : { hp: 437, tq: 583, tow: 9120, payload: 1420, gvwr: 7570, gcwr: 15800, curb: 6150 }
  },
  {
    brand: 'Toyota',
    model: '4Runner',
    trim: 'SR5 / TRD Off-Road 4WD',
    slugKey: 'toyota-4runner-40l-v6-4wd',
    category: 'Midsize SUV',
    engine: '4.0L V6 / 2.4L i-FORCE Turbo',
    drivetrain: '4WD',
    axleRatio: '3.73',
    hitchClass: 'Class III',
    wheelbaseIn: 109.8,
    fuelEconomyMpg: '16 City / 19 Hwy',
    years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2024
        ? { hp: 270, tq: 278, tow: 5000, payload: 1550, gvwr: 6300, gcwr: 10050, curb: 4750 }
        : { hp: 278, tq: 317, tow: 6000, payload: 1575, gvwr: 6400, gcwr: 11200, curb: 4825 }
  },
  {
    brand: 'Toyota',
    model: 'Grand Highlander',
    trim: 'XLE / Limited 2.4L Turbo AWD',
    slugKey: 'toyota-grand-highlander-24l-turbo-awd',
    category: 'Midsize SUV',
    engine: '2.4L Turbocharged Inline-4',
    drivetrain: 'AWD',
    axleRatio: '3.33',
    hitchClass: 'Class III',
    wheelbaseIn: 116.1,
    fuelEconomyMpg: '21 City / 27 Hwy',
    years: [2024, 2025, 2026],
    specByYear: () => ({ hp: 265, tq: 310, tow: 5000, payload: 1410, gvwr: 6020, gcwr: 10200, curb: 4610 })
  },
  {
    brand: 'Jeep',
    model: 'Gladiator',
    trim: 'Sport S 3.6L Pentastar V6 4WD w/ Max Tow',
    slugKey: 'jeep-gladiator-36l-v6-max-tow',
    category: 'Midsize Truck',
    engine: '3.6L Pentastar V6',
    drivetrain: '4WD',
    axleRatio: '4.10',
    hitchClass: 'Class IV',
    wheelbaseIn: 137.3,
    fuelEconomyMpg: '17 City / 22 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 285, tq: 260, tow: 7700, payload: 1725, gvwr: 6500, gcwr: 12800, curb: 4775 })
  },
  {
    brand: 'Jeep',
    model: 'Grand Cherokee',
    trim: 'Laredo / Limited 3.6L V6 4WD',
    slugKey: 'jeep-grand-cherokee-36l-v6-4wd',
    category: 'Midsize SUV',
    engine: '3.6L Pentastar V6',
    drivetrain: '4WD',
    axleRatio: '3.45',
    hitchClass: 'Class IV',
    wheelbaseIn: 116.7,
    fuelEconomyMpg: '19 City / 26 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 293, tq: 260, tow: 6200, payload: 1280, gvwr: 6050, gcwr: 11100, curb: 4770 })
  },
  {
    brand: 'Jeep',
    model: 'Grand Cherokee L',
    trim: 'Overland / Summit 5.7L HEMI V8 4WD',
    slugKey: 'jeep-grand-cherokee-l-57l-v8-4wd',
    category: 'Full-Size SUV',
    engine: '5.7L HEMI V8',
    drivetrain: '4WD',
    axleRatio: '3.45',
    hitchClass: 'Class IV',
    wheelbaseIn: 121.7,
    fuelEconomyMpg: '14 City / 22 Hwy',
    years: [2021, 2022, 2023, 2024],
    specByYear: () => ({ hp: 357, tq: 390, tow: 7200, payload: 1360, gvwr: 6700, gcwr: 12700, curb: 5340 })
  },
  {
    brand: 'Jeep',
    model: 'Wagoneer',
    trim: 'Series II 3.0L Hurricane Twin-Turbo 4WD',
    slugKey: 'jeep-wagoneer-30l-hurricane-4wd',
    category: 'Full-Size SUV',
    engine: '3.0L Hurricane Twin-Turbo I-6',
    drivetrain: '4WD',
    axleRatio: '3.92',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 123,
    fuelEconomyMpg: '16 City / 23 Hwy',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 420, tq: 468, tow: 10000, payload: 1490, gvwr: 7500, gcwr: 16500, curb: 6010 })
  },
  {
    brand: 'Jeep',
    model: 'Wrangler Unlimited',
    trim: '4-Door Rubicon 3.6L V6 4WD',
    slugKey: 'jeep-wrangler-unlimited-rubicon-4wd',
    category: 'Midsize SUV',
    engine: '3.6L Pentastar V6',
    drivetrain: '4WD',
    axleRatio: '4.10',
    hitchClass: 'Class III',
    wheelbaseIn: 118.4,
    fuelEconomyMpg: '17 City / 23 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2023
        ? { hp: 285, tq: 260, tow: 3500, payload: 1180, gvwr: 5800, gcwr: 8800, curb: 4620 }
        : { hp: 285, tq: 260, tow: 5000, payload: 1223, gvwr: 5800, gcwr: 9700, curb: 4577 }
  },
  {
    brand: 'Nissan',
    model: 'Titan',
    trim: 'Crew Cab SV / PRO-4X 5.6L Endurance V8 4WD',
    slugKey: 'nissan-titan-56l-v8-4wd',
    category: 'Half-Ton Truck',
    engine: '5.6L Direct-Injection Endurance V8',
    drivetrain: '4WD',
    axleRatio: '3.69',
    hitchClass: 'Class IV',
    wheelbaseIn: 139.8,
    fuelEconomyMpg: '15 City / 21 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    specByYear: () => ({ hp: 400, tq: 413, tow: 9290, payload: 1600, gvwr: 7300, gcwr: 15300, curb: 5700 })
  },
  {
    brand: 'Nissan',
    model: 'Titan XD',
    trim: 'Crew Cab Platinum Reserve 5.6L V8 4WD',
    slugKey: 'nissan-titan-xd-56l-v8-4wd',
    category: 'Heavy-Duty Truck',
    engine: '5.6L Endurance V8',
    drivetrain: '4WD',
    axleRatio: '4.08',
    hitchClass: 'Class IV / Gooseneck',
    wheelbaseIn: 151.6,
    fuelEconomyMpg: '14 City / 19 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    specByYear: () => ({ hp: 400, tq: 413, tow: 11050, payload: 2360, gvwr: 8800, gcwr: 17500, curb: 6440 })
  },
  {
    brand: 'Nissan',
    model: 'Frontier',
    trim: 'Crew Cab SV / PRO-4X 3.8L V6 4WD',
    slugKey: 'nissan-frontier-38l-v6-4wd',
    category: 'Midsize Truck',
    engine: '3.8L Direct-Injection V6',
    drivetrain: '4WD',
    axleRatio: '3.69',
    hitchClass: 'Class IV',
    wheelbaseIn: 126,
    fuelEconomyMpg: '18 City / 22 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 310, tq: 281, tow: 6490, payload: 1430, gvwr: 6012, gcwr: 11230, curb: 4582 })
  },
  {
    brand: 'Nissan',
    model: 'Pathfinder',
    trim: 'Rock Creek / Platinum 3.5L V6 4WD',
    slugKey: 'nissan-pathfinder-35l-v6-4wd',
    category: 'Midsize SUV',
    engine: '3.5L Direct-Injection V6',
    drivetrain: '4WD',
    axleRatio: '4.33',
    hitchClass: 'Class III',
    wheelbaseIn: 114.2,
    fuelEconomyMpg: '20 City / 25 Hwy',
    years: [2018, 2019, 2020, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 295, tq: 270, tow: 6000, payload: 1354, gvwr: 5986, gcwr: 11000, curb: 4632 })
  },
  {
    brand: 'Nissan',
    model: 'Armada',
    trim: 'SL / Platinum 4WD',
    slugKey: 'nissan-armada-56l-v8-4wd',
    category: 'Full-Size SUV',
    engine: '5.6L Endurance V8 / 3.5L Twin-Turbo V6',
    drivetrain: '4WD',
    axleRatio: '2.94',
    hitchClass: 'Class IV',
    wheelbaseIn: 121.1,
    fuelEconomyMpg: '13 City / 18 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 400, tq: 413, tow: 8500, payload: 1570, gvwr: 7500, gcwr: 14500, curb: 5930 })
  },
  {
    brand: 'Honda',
    model: 'Ridgeline',
    trim: 'TrailSport / RTL-E 3.5L V6 i-VTM4 AWD',
    slugKey: 'honda-ridgeline-35l-v6-awd',
    category: 'Midsize Truck',
    engine: '3.5L SOHC i-VTEC V6',
    drivetrain: 'AWD',
    axleRatio: '4.33',
    hitchClass: 'Class III',
    wheelbaseIn: 125.2,
    fuelEconomyMpg: '18 City / 24 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 280, tq: 262, tow: 5000, payload: 1583, gvwr: 6019, gcwr: 10064, curb: 4436 })
  },
  {
    brand: 'Honda',
    model: 'Pilot',
    trim: 'TrailSport / Elite 3.5L V6 AWD',
    slugKey: 'honda-pilot-35l-v6-awd',
    category: 'Midsize SUV',
    engine: '3.5L DOHC V6',
    drivetrain: 'AWD',
    axleRatio: '4.16',
    hitchClass: 'Class III',
    wheelbaseIn: 113.8,
    fuelEconomyMpg: '19 City / 25 Hwy',
    years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 285, tq: 262, tow: 5000, payload: 1460, gvwr: 6139, gcwr: 10251, curb: 4679 })
  },
  {
    brand: 'Subaru',
    model: 'Ascent',
    trim: 'Onyx / Limited 2.4L Turbo BOXER AWD',
    slugKey: 'subaru-ascent-24l-turbo-awd',
    category: 'Midsize SUV',
    engine: '2.4L Turbocharged SUBARU BOXER 4-Cyl',
    drivetrain: 'AWD',
    axleRatio: '4.44',
    hitchClass: 'Class III',
    wheelbaseIn: 113.8,
    fuelEconomyMpg: '19 City / 25 Hwy',
    years: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 260, tq: 277, tow: 5000, payload: 1440, gvwr: 6000, gcwr: 10100, curb: 4560 })
  },
  {
    brand: 'Subaru',
    model: 'Outback',
    trim: 'Wilderness / XT 2.4L Turbo AWD',
    slugKey: 'subaru-outback-wilderness-24l-turbo',
    category: 'Midsize SUV',
    engine: '2.4L Turbocharged SUBARU BOXER 4-Cyl',
    drivetrain: 'AWD',
    axleRatio: '4.44',
    hitchClass: 'Class II / III',
    wheelbaseIn: 108.1,
    fuelEconomyMpg: '21 City / 26 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 260, tq: 277, tow: 3500, payload: 1090, gvwr: 5004, gcwr: 7800, curb: 3914 })
  },
  {
    brand: 'Rivian',
    model: 'R1T',
    trim: 'Dual-Motor AWD Large Pack (135 kWh)',
    slugKey: 'rivian-r1t-dual-motor-large-pack',
    category: 'Electric Truck',
    engine: 'Enduro Dual-Motor AWD Electric',
    drivetrain: 'AWD',
    axleRatio: '12.6',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 135.8,
    fuelEconomyMpg: '78 MPGe Combined',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 665, tq: 829, tow: 11000, payload: 1764, gvwr: 8532, gcwr: 18200, curb: 6768 })
  },
  {
    brand: 'Rivian',
    model: 'R1S',
    trim: 'Dual-Motor AWD Large Pack SUV',
    slugKey: 'rivian-r1s-dual-motor-awd',
    category: 'Full-Size SUV',
    engine: 'Enduro Dual-Motor AWD Electric',
    drivetrain: 'AWD',
    axleRatio: '12.6',
    hitchClass: 'Class IV',
    wheelbaseIn: 121.1,
    fuelEconomyMpg: '75 MPGe Combined',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 665, tq: 829, tow: 7700, payload: 1660, gvwr: 8532, gcwr: 15200, curb: 6872 })
  },
  {
    brand: 'Tesla',
    model: 'Cybertruck',
    trim: 'Dual-Motor All-Wheel Drive (123 kWh)',
    slugKey: 'tesla-cybertruck-all-wheel-drive',
    category: 'Electric Truck',
    engine: 'Dual-Motor Electric AWD',
    drivetrain: 'AWD',
    axleRatio: '15.0',
    hitchClass: 'Class IV Heavy-Duty',
    wheelbaseIn: 143.1,
    fuelEconomyMpg: '82 MPGe Combined',
    years: [2024, 2025, 2026],
    specByYear: () => ({ hp: 600, tq: 743, tow: 11000, payload: 2500, gvwr: 9169, gcwr: 18500, curb: 6669 })
  },
  {
    brand: 'Chevrolet',
    model: 'Silverado EV',
    trim: 'RST / 4WT Extended Range Dual-Motor e4WD',
    slugKey: 'chevy-silverado-ev-rst-first-edition',
    category: 'Electric Truck',
    engine: 'Ultium Dual-Motor Electric (200+ kWh)',
    drivetrain: 'AWD',
    axleRatio: '11.5',
    hitchClass: 'Class IV',
    wheelbaseIn: 145.7,
    fuelEconomyMpg: '67 MPGe Combined',
    years: [2024, 2025, 2026],
    specByYear: () => ({ hp: 754, tq: 785, tow: 10000, payload: 1500, gvwr: 10300, gcwr: 19500, curb: 8800 })
  },
  {
    brand: 'Dodge',
    model: 'Durango',
    trim: 'R/T 5.7L HEMI V8 AWD w/ Tow N Go',
    slugKey: 'dodge-durango-rt-57l-hemi-awd',
    category: 'Midsize SUV',
    engine: '5.7L HEMI V8',
    drivetrain: 'AWD',
    axleRatio: '3.09',
    hitchClass: 'Class IV',
    wheelbaseIn: 119.8,
    fuelEconomyMpg: '14 City / 22 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 360, tq: 390, tow: 8700, payload: 1420, gvwr: 7100, gcwr: 14600, curb: 5680 })
  },
  {
    brand: 'Dodge',
    model: 'Durango',
    trim: 'GT / Citadel 3.6L Pentastar V6 AWD',
    slugKey: 'dodge-durango-gt-36l-v6-awd',
    category: 'Midsize SUV',
    engine: '3.6L Pentastar V6',
    drivetrain: 'AWD',
    axleRatio: '3.45',
    hitchClass: 'Class IV',
    wheelbaseIn: 119.8,
    fuelEconomyMpg: '18 City / 25 Hwy',
    years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 295, tq: 260, tow: 6200, payload: 1390, gvwr: 6500, gcwr: 11500, curb: 5110 })
  },
  {
    brand: 'Hyundai',
    model: 'Santa Cruz',
    trim: 'Night / Limited 2.5L Turbo HTRAC AWD',
    slugKey: 'hyundai-santa-cruz-25l-turbo-awd',
    category: 'Midsize Truck',
    engine: '2.5L Turbocharged GDI I-4',
    drivetrain: 'AWD',
    axleRatio: '3.32',
    hitchClass: 'Class III',
    wheelbaseIn: 118.3,
    fuelEconomyMpg: '19 City / 27 Hwy',
    years: [2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 281, tq: 311, tow: 5000, payload: 1411, gvwr: 5688, gcwr: 9700, curb: 4277 })
  },
  {
    brand: 'Hyundai',
    model: 'Palisade',
    trim: 'SEL / Calligraphy 3.8L V6 HTRAC AWD',
    slugKey: 'hyundai-palisade-38l-v6-awd',
    category: 'Midsize SUV',
    engine: '3.8L Atkinson-Cycle GDI V6',
    drivetrain: 'AWD',
    axleRatio: '3.65',
    hitchClass: 'Class III',
    wheelbaseIn: 114.2,
    fuelEconomyMpg: '19 City / 24 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: () => ({ hp: 291, tq: 262, tow: 5000, payload: 1365, gvwr: 5871, gcwr: 10050, curb: 4506 })
  },
  {
    brand: 'Kia',
    model: 'Telluride',
    trim: 'SX-Prestige X-Pro 3.8L V6 AWD',
    slugKey: 'kia-telluride-38l-v6-x-pro-awd',
    category: 'Midsize SUV',
    engine: '3.8L Lambda II GDI V6',
    drivetrain: 'AWD',
    axleRatio: '3.65',
    hitchClass: 'Class III',
    wheelbaseIn: 114.2,
    fuelEconomyMpg: '18 City / 24 Hwy',
    years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    specByYear: (y) =>
      y <= 2022
        ? { hp: 291, tq: 262, tow: 5000, payload: 1350, gvwr: 5917, gcwr: 10000, curb: 4567 }
        : { hp: 291, tq: 262, tow: 5500, payload: 1380, gvwr: 5917, gcwr: 10450, curb: 4537 }
  }
];

const expandedVehicles = [];

for (const tmpl of LINEUP_TEMPLATES) {
  for (const year of tmpl.years) {
    const spec = tmpl.specByYear(year);
    expandedVehicles.push({
      slug: `${year}-${tmpl.slugKey}`,
      year,
      brand: tmpl.brand,
      model: tmpl.model,
      trim: tmpl.trim,
      category: tmpl.category,
      engine: tmpl.engine,
      horsepower: spec.hp,
      torqueLbFt: spec.tq,
      drivetrain: tmpl.drivetrain,
      axleRatio: tmpl.axleRatio,
      maxTowLbs: spec.tow,
      maxPayloadLbs: spec.payload,
      gvwrLbs: spec.gvwr,
      gcwrLbs: spec.gcwr,
      curbWeightLbs: spec.curb,
      maxTongueWeightLbs: Math.round(spec.tow * 0.1),
      hitchClass: tmpl.hitchClass,
      wheelbaseIn: tmpl.wheelbaseIn,
      fuelEconomyMpg: tmpl.fuelEconomyMpg
    });
  }
}

fs.writeFileSync(path.join(DATA_DIR, 'vehicles.json'), JSON.stringify(expandedVehicles, null, 2), 'utf8');
console.log(`Generated ${expandedVehicles.length} historical & current vehicle trims (2015 - 2026) in data/vehicles.json!`);
