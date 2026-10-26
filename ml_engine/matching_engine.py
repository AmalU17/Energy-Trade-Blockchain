"""
P2P Microgrid Multi-Objective Matching Engine
Matches energy buyers and sellers based on:
1. Economic Score: Normalized unit price per kWh
2. Physical Transmission Distance: Zone proximity loss penalty L = alpha * |Zone_seller - Zone_buyer|^1.5
3. Volume Compatibility: Proximity to requested purchase volume

Produces an optimal ranking score: S in [0, 100]
"""

class MicrogridMatchingEngine:
    def __init__(self, transmission_loss_factor=0.04):
        # 4% transmission loss per adjacent zone distance
        self.alpha = transmission_loss_factor

    def compute_transmission_loss(self, buyer_zone, seller_zone):
        zone_diff = abs(buyer_zone - seller_zone)
        # Power line resistance & substation loss increases non-linearly with zone distance
        loss_pct = min(0.25, self.alpha * (zone_diff ** 1.3))
        return round(loss_pct, 4)

    def calculate_match_score(self, buyer_zone, requested_kwh, listing):
        seller_zone = listing.get("zoneId", 1)
        price_wei = listing.get("pricePerKwhWei", 1e14)
        available_kwh = listing.get("energyAmountKwh", 0)

        # 1. Transmission loss
        loss_pct = self.compute_transmission_loss(buyer_zone, seller_zone)
        loss_score = max(0, 100 - (loss_pct * 300)) # Closer zones get up to 100

        # 2. Price competitiveness (assume reference base price ~ 0.0001 ETH / 1e14 Wei)
        # Lower price gets higher score
        ref_price = 1e14
        price_ratio = price_wei / ref_price
        price_score = max(10, min(100, 100 - (price_ratio - 1.0) * 40))

        # 3. Volume fulfillment capability
        if available_kwh >= requested_kwh:
            volume_score = 100
        else:
            volume_score = (available_kwh / requested_kwh) * 80

        # Weighted composite score: 40% price, 35% proximity/grid efficiency, 25% volume match
        composite_score = round(0.40 * price_score + 0.35 * loss_score + 0.25 * volume_score, 1)

        return {
            "listing_id": listing.get("id"),
            "seller": listing.get("seller"),
            "price_wei": price_wei,
            "available_kwh": available_kwh,
            "seller_zone": seller_zone,
            "buyer_zone": buyer_zone,
            "transmission_loss_pct": round(loss_pct * 100, 2),
            "effective_kwh_delivered": round(requested_kwh * (1 - loss_pct), 2),
            "match_score": composite_score,
            "rank_label": "BEST_MATCH" if composite_score >= 85 else ("GOOD_MATCH" if composite_score >= 70 else "STANDARD")
        }

    def rank_listings_for_buyer(self, buyer_zone, requested_kwh, listings):
        scored = []
        for l in listings:
            if l.get("active", True) and l.get("energyAmountKwh", 0) > 0:
                scored.append(self.calculate_match_score(buyer_zone, requested_kwh, l))
        
        # Sort descending by match_score
        scored.sort(key=lambda x: x["match_score"], reverse=True)
        return scored

if __name__ == "__main__":
    matcher = MicrogridMatchingEngine()
    sample_listings = [
        {"id": 1, "seller": "0x1111...1111", "energyAmountKwh": 15, "pricePerKwhWei": 1.1e14, "zoneId": 1},
        {"id": 2, "seller": "0x2222...2222", "energyAmountKwh": 50, "pricePerKwhWei": 0.9e14, "zoneId": 4},
        {"id": 3, "seller": "0x3333...3333", "energyAmountKwh": 20, "pricePerKwhWei": 0.95e14, "zoneId": 2},
    ]
    buyer_zone = 1
    requested = 10
    ranked = matcher.rank_listings_for_buyer(buyer_zone, requested, sample_listings)
    print("Ranked P2P Matches for Buyer in Zone 1 requesting 10 kWh:")
    for r in ranked:
        print(f"Listing #{r['listing_id']} -> Score: {r['match_score']}/100 | Loss: {r['transmission_loss_pct']}% | Label: {r['rank_label']}")
