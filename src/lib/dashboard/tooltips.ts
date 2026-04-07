// Tooltip descriptions for all dashboard metrics
// Each has 2 sentences: what it is + why it matters

export const TOOLTIPS: Record<string, string> = {
  // === RATES & SPREADS ===
  "US 2Y Yield": "The yield on 2-year US Treasury bonds, reflecting short-term interest rate expectations. Moves closely with Fed policy — a rising 2Y signals the market expects higher rates or tighter policy.",
  "US 10Y Yield": "The yield on 10-year US Treasury bonds, the benchmark for global borrowing costs. Rising 10Y yields increase mortgage rates, corporate borrowing costs, and pressure equity valuations.",
  "US 30Y Yield": "The yield on 30-year US Treasury bonds, reflecting long-term inflation and growth expectations. When 30Y yields rise sharply, it signals markets expect sustained inflation or fiscal concerns.",
  "2s/10s Spread": "The difference between the 10-year and 2-year Treasury yields. When negative (inverted), it has historically preceded every US recession by 12-18 months — the most reliable recession indicator.",
  "Fed Funds Rate": "The interest rate at which banks lend reserves to each other overnight, set by the Federal Reserve. This is the primary tool the Fed uses to control inflation and stimulate or slow the economy.",
  "HY OAS": "The Option-Adjusted Spread on high-yield (junk) corporate bonds over Treasuries, measured in basis points. Widening spreads signal credit stress — investors demanding more compensation for default risk.",
  "BBB OAS": "The spread on investment-grade BBB-rated corporate bonds over Treasuries. BBB is the lowest investment-grade rating — when these spreads widen, it signals broad corporate credit stress.",
  "DXY": "The US Dollar Index, measuring the dollar's value against a basket of major currencies. A strong dollar tightens global financial conditions because most global debt is denominated in dollars.",
  "Credit Stress": "A composite measure of high-yield credit market health based on HY OAS levels. When credit stress rises, it signals that the weakest corporate borrowers are losing access to funding.",
  "Yield Curve": "The relationship between short-term and long-term Treasury yields plotted on a chart. A normal upward-sloping curve indicates healthy growth expectations; an inverted curve signals recession risk.",
  "JGB 10Y": "The yield on 10-year Japanese Government Bonds, a key indicator of global monetary policy. Japan's ultra-low rates anchor global bond markets — if JGB yields rise, it can trigger global bond selling.",

  // === COMMODITIES ===
  "WTI Crude Oil": "West Texas Intermediate, the US benchmark crude oil price. The most liquid energy contract globally — rising WTI signals either supply constraints or growing demand.",
  "Brent Crude Oil": "The international benchmark crude oil price, priced in London. Brent reflects global supply/demand dynamics more than WTI — a wide Brent-WTI spread signals physical supply disruptions.",
  "Natural Gas": "The price of natural gas, critical for power generation and heating. Highly seasonal and supply-sensitive — spikes signal either extreme weather or supply disruptions (e.g., pipeline outages, LNG constraints).",
  "Gold": "The price of gold, the oldest safe-haven asset. Rising gold signals either inflation fears, geopolitical risk, or loss of confidence in fiat currencies — it moves inversely to real interest rates.",
  "Silver": "The price of silver, which serves both as a precious metal and an industrial commodity. Silver's dual role means it can rally on either safe-haven demand OR industrial growth — watch the gold/silver ratio.",
  "Copper Miners": "A proxy for copper prices via the COPX copper mining ETF. Copper is called 'Dr. Copper' because its price is the best real-time indicator of global industrial activity and economic health.",
  "Uranium": "The price of uranium via the Sprott Physical Uranium Trust. Uranium is the fuel for nuclear power — rising prices signal growing demand for nuclear energy as countries seek clean baseload power.",
  "Wheat": "The price of wheat, a critical global food commodity. Wheat price spikes can trigger social instability in import-dependent countries — it's both an inflation input and a geopolitical risk indicator.",
  "Corn": "The price of corn, used for food, animal feed, and ethanol production. Corn competes with energy (via ethanol mandates) — rising corn can signal both food inflation and energy demand.",
  "Gold/Oil Ratio": "Gold price divided by oil price. A rising ratio means gold is outperforming oil — this signals markets are pricing fear/uncertainty more than economic growth.",
  "Copper/Gold Ratio": "Copper price divided by gold price. A rising ratio signals growth expectations (industrial metals outperforming safe havens) — a falling ratio signals recession fears.",

  // === DEMAND DESTRUCTION ===
  "EMHY": "iShares Emerging Market High Yield Bond ETF — tracks EM junk bond health. When EMHY sells off, it signals dollar liquidity tightening and commodity demand destruction in developing economies.",
  "BDI": "The Baltic Dry Index measures the cost of shipping dry bulk commodities globally. A falling BDI means less physical trade is happening — the most direct measure of global commerce activity.",
  "Korea Exports": "South Korea's year-over-year export growth, released monthly. Korea is the 'canary in the coal mine' for global trade — its exports lead global PMI and GDP by 2-3 months.",
  "China PMI": "China's National Bureau of Statistics Manufacturing Purchasing Managers Index. Above 50 = expansion, below 50 = contraction. China is the marginal buyer of most commodities globally.",
  "WTI": "WTI crude oil price as a demand destruction trigger. Above $130/barrel historically breaks the consumer through gasoline prices — the oil price itself becomes the mechanism that destroys demand.",
  "Force Majeures": "Declarations by refineries or petrochemical plants that they cannot fulfill contracts due to uncontrollable events. Force majeures are the fastest real-time signal of physical supply chain stress.",
  "Jobless Claims": "US Initial Jobless Claims, released weekly on Thursdays by the Department of Labor. Rising claims are the earliest signal that employers are cutting jobs — consumers pull back spending 4-6 weeks later.",
  "Copper": "Copper price as a demand destruction canary. When copper falls while oil stays elevated, it signals the industrial economy is breaking before the data confirms it — the most important divergence to watch.",
  "UMich Sentiment": "University of Michigan Consumer Sentiment Index, released monthly. Below 45 means consumers are in active retrenchment — they stop discretionary spending and hoard cash.",
  "Gas Price": "AAA National Average Gasoline Price. The most politically visible inflation indicator — above $5.50/gallon triggers behavioral change in driving, spending, and voting patterns.",

  // === HORMUZ RISK ===
  "Tanker Transit Count": "The number of oil tankers transiting the Strait of Hormuz daily (normal: ~153/day). This is the single most important signal — physical transit data shows whether the strait is actually closed or open.",
  "Mine Status": "Whether naval mines are confirmed in the Strait of Hormuz and their clearance status. Mines add weeks to months to any closure timeline regardless of ceasefire — they are structural, not political.",
  "VLCC Rates": "Very Large Crude Carrier daily charter rates (TD3C benchmark). At ATH levels they confirm physical supply disruption — a 20%+ drop signals the market believes resolution is coming.",
  "TTF Gas": "Title Transfer Facility European natural gas price in EUR/MWh. Qatar exports ~80M tons/year of LNG through Hormuz — disruption spikes European gas prices immediately.",
  "DXY Dollar": "US Dollar Index in the context of Hormuz crisis. Dollar strengthens during energy crises as global trade requires dollar settlement — supports the UUP position in the thesis.",
  "Fed Rhetoric": "Federal Reserve's policy stance in response to the crisis. Holding or hiking = hawkish = dollar thesis intact. Emergency cuts = Fed panicking = different playbook entirely.",
  "Gulf Storage": "Days since crisis began relative to JPM's Day 25 storage exhaustion estimate. Past Day 25 with no resolution = maximum conviction that physical shortage is real and prices must adjust.",
  "Stagflation": "Whether the economy shows rising prices with weakening growth simultaneously. Oil rising + weak economy = stagflation = the thesis is working. Oil falling despite closure = demand destruction overriding supply.",
  "Diplomatic": "Status of diplomatic channels between Iran and the US/allies. Track ACTIONS not WORDS — what Iran physically does (mines, attacks, seizures) matters more than what anyone says.",
  "IEA/SPR": "International Energy Agency and Strategic Petroleum Reserve response. SPR is finite ammunition (~1.2B barrels total) — releases are speed bumps, not solutions to sustained supply disruption.",
  "Conviction": "Overall thesis conviction based on the ratio of green to red signals. Maximum conviction requires 9+ green signals with zero red — thesis broken is triggered by 4+ red signals.",

  // === PRIVATE CREDIT ===
  "HY OAS Score": "High Yield Option-Adjusted Spread scoring for credit stress. Below 4% = calm markets, above 7% = active stress, above 10% = approaching 2008/2020 crisis levels.",
  "CCC-BB Spread": "The difference between CCC-rated (junkiest) and BB-rated (higher quality junk) bond spreads. When CCC blows out relative to BB, the weakest borrowers are being cut off — the key early warning signal.",
  "BIZD 30d": "VanEck BDC Income ETF 30-day price change — tracks the entire Business Development Company sector. A falling BIZD means the private credit market is repricing risk across all players.",
  "BKLN 30d": "Invesco Senior Loan ETF 30-day price change — tracks leveraged loan health. A falling BKLN signals stress in the floating-rate loan market that underlies most private credit structures.",
  "News Signals": "Count of recent news articles mentioning redemptions, gates, or private credit stress. Multiple independent reports of redemption gates or PIK usage signals contagion building across the sector.",

  // === GEOPOLITICAL ===
  "VIX": "The CBOE Volatility Index, measuring expected S&P 500 volatility over the next 30 days. Above 25 = elevated fear, above 35 = panic. VIX is called the 'fear gauge' of global markets.",
  "Defense ETF": "iShares US Aerospace & Defense ETF (ITA) — tracks defense company stock performance. When ITA outperforms SPY, markets are pricing in increased military spending and geopolitical escalation.",
  "SPY": "SPDR S&P 500 ETF — the benchmark for US equity market performance. Falling SPY during geopolitical events signals broad risk-off behavior across global markets.",
  "Geo Risk Score": "Composite geopolitical risk score based on safe-haven flows, defense spending, oil supply risk, and volatility. Higher scores indicate markets are actively pricing geopolitical risk into asset prices.",

  // === EARNINGS ===
  "EPS Estimate": "Wall Street consensus Earnings Per Share estimate for the upcoming quarter. The actual vs estimate comparison determines whether the stock moves up (beat) or down (miss) after reporting.",
  "Days Until": "Countdown to earnings announcement. Position sizing and hedging decisions should be made before this date — earnings are the highest-volatility single-day events for individual stocks.",
};
