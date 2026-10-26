// Contract ABI for EnergyTrade.sol
const ENERGY_TRADE_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "listingId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "energyAmountKwh", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "pricePerKwhWei", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "zoneId", "type": "uint8" }
    ],
    "name": "EnergyListed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "tradeId", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "listingId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "energyAmountKwh", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalCostWei", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "EnergyPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "listingId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "seller", "type": "address" }
    ],
    "name": "ListingCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "household", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "solarGen", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "consumption", "type": "uint256" },
      { "indexed": false, "internalType": "uint8", "name": "zoneId", "type": "uint8" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "MeterUpdated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_listingId", "type": "uint256" },
      { "internalType": "uint256", "name": "_energyAmountKwh", "type": "uint256" }
    ],
    "name": "buyEnergy",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_listingId", "type": "uint256" }
    ],
    "name": "cancelListing",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveListings",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id", "type": "uint256" },
          { "internalType": "address payable", "name": "seller", "type": "address" },
          { "internalType": "uint256", "name": "energyAmountKwh", "type": "uint256" },
          { "internalType": "uint256", "name": "pricePerKwhWei", "type": "uint256" },
          { "internalType": "uint8", "name": "zoneId", "type": "uint8" },
          { "internalType": "bool", "name": "active", "type": "bool" },
          { "internalType": "uint256", "name": "listedAt", "type": "uint256" }
        ],
        "internalType": "struct EnergyTrade.EnergyListing[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_household", "type": "address" }
    ],
    "name": "getMeter",
    "outputs": [
      { "internalType": "uint256", "name": "solarGenKwh", "type": "uint256" },
      { "internalType": "uint256", "name": "consumptionKwh", "type": "uint256" },
      { "internalType": "uint8", "name": "zoneId", "type": "uint8" },
      { "internalType": "uint256", "name": "netSurplusKwh", "type": "uint256" },
      { "internalType": "uint256", "name": "lastUpdated", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTradeHistory",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "tradeId", "type": "uint256" },
          { "internalType": "uint256", "name": "listingId", "type": "uint256" },
          { "internalType": "address", "name": "seller", "type": "address" },
          { "internalType": "address", "name": "buyer", "type": "address" },
          { "internalType": "uint256", "name": "energyPurchasedKwh", "type": "uint256" },
          { "internalType": "uint256", "name": "totalCostWei", "type": "uint256" },
          { "internalType": "uint256", "name": "settledAt", "type": "uint256" }
        ],
        "internalType": "struct EnergyTrade.TradeTransaction[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_energyAmountKwh", "type": "uint256" },
      { "internalType": "uint256", "name": "_pricePerKwhWei", "type": "uint256" },
      { "internalType": "uint8", "name": "_zoneId", "type": "uint8" }
    ],
    "name": "listEnergy",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_solarGen", "type": "uint256" },
      { "internalType": "uint256", "name": "_consumption", "type": "uint256" },
      { "internalType": "uint8", "name": "_zoneId", "type": "uint8" }
    ],
    "name": "updateMeterReading",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
