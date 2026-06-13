
# AB 1482 (Tenant Protection Act) — Comprehensive Research Document

**Prepared:** June 10, 2026
**Purpose:** Legal calculator reference — all claims require human verification before use in code
**Status:** DRAFT — pending human review for accuracy

---

## 1. COVERAGE AND EXEMPTIONS

**Source:** California Civil Code Section 1947.12 (as amended by SB 567, Stats. 2023, Ch. 290, Sec. 4, operative April 1, 2024)
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1947.12.&lawCode=CIV

### Properties SUBJECT to AB 1482
All residential real property in California UNLESS an exemption applies.

### Exemptions (properties NOT subject to the rent cap):

1. **New construction (15-year rolling exemption):** "Housing that has been issued a certificate of occupancy within the previous 15 years, unless the housing is a mobilehome."
   - As of 2026, properties with certificates of occupancy issued on or after **January 1, 2011** are exempt.
   - This is rolling — each year the cutoff moves forward by one year.
   - **Source:** Civil Code 1947.12(d)(5)

2. **Single-family homes** — exempt IF:
   - The owner is NOT a corporation, real estate investment trust (REIT), or LLC where at least one member is a corporation.
   - The owner provides written notice to the tenant per Civil Code 1946.2(e) that the property is exempt.
   - **Source:** Civil Code 1947.12(d)(4) and 1946.2(e)
   - **URL (1946.2):** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.2.&lawCode=CIV

3. **Owner-occupied duplexes:** Two-unit properties where the owner occupies one unit as their principal place of residence at the time the tenant moved in, and continues to occupy it. The owner must not be a corporation, REIT, or LLC with a corporate member.
   - **Source:** Civil Code 1947.12(d)(4)

4. **Deed-restricted affordable housing:** Units restricted by deed, regulatory restriction, or other recorded document as affordable housing for persons and families of very low, low, or moderate income.
   - **Source:** Civil Code 1947.12(d)(1)

5. **Dormitories:** Housing owned by higher education institutions or K-12 school districts used exclusively as student, faculty, or staff housing.
   - **Source:** Civil Code 1947.12(d)(2)

6. **Already-rent-stabilized units:** Units subject to a local rent control ordinance that is MORE restrictive than AB 1482. If the local ordinance allows higher increases, AB 1482's cap applies as the ceiling.
   - **Source:** Civil Code 1947.12(d)(3)

7. **Government-subsidized housing / Housing authority units:** Housing subject to rent or price control by a government entity (housing authorities, Section 8 project-based, etc.).
   - **Source:** Civil Code 1947.12(d)(1)

8. **Mobilehome spaces:** Mobilehomes are NOT exempt from the new construction exemption (i.e., even new mobilehomes ARE covered), but mobilehome spaces governed by the Mobilehome Residency Law (Civil Code 798 et seq.) have separate protections.
   - **Source:** Civil Code 1947.12(d)(5) carve-out

9. **Transient/tourist housing:** Hotels, motels, and other transient lodging not used as primary residence.

**IMPORTANT NOTE on single-family exemption:** The exemption only applies if the owner gives the tenant written notice in the lease or rental agreement (or as an addendum) that the property is exempt from AB 1482. Per 1946.2(e), this notice must identify the specific exemption and include prescribed language.

---

## 2. THE ANNUAL RENT CAP FORMULA

**Source:** Civil Code 1947.12(a)
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1947.12.&lawCode=CIV

### Formula:
**Maximum allowable annual increase = 5% + CPI change, OR 10%, WHICHEVER IS LOWER**

- The 5% is a fixed component.
- CPI is the April-to-April annual percentage change in the CPI-U for All Items for the relevant metropolitan area.
- The combined total is capped at 10%.
- If the CPI change is negative, it is treated as 0% (floor). The statute does not allow the CPI component to go below zero.

### Which CPI Index:
**"Consumer Price Index for All Urban Consumers for All Items" (CPI-U, All Items)**

### Which Region:
The statute specifies: "the CPI-U for the metropolitan area in which the property is located, as published by the United States Bureau of Labor Statistics."

**Fallback:** If BLS does not publish a CPI-U for the metropolitan area, the California Consumer Price Index for All Urban Consumers for All Items as published by the California Department of Industrial Relations is used.

### Timing:
- For rent increases effective **before August 1**: the percentage change is calculated using April of the immediately preceding year vs. April of the year before that.
- For rent increases effective **on or after August 1**: the percentage change is calculated using the most recently published April-to-April change (i.e., April of the current year vs. April of the prior year).

### Rounding:
"The percentage change shall be rounded to the nearest one-tenth of 1 percent."

---

## 3. CALIFORNIA CPI REGIONS AND VALUES

**Primary Source:** U.S. Bureau of Labor Statistics (BLS) CPI-U data series
**Data retrieved:** June 10, 2026 from BLS data.bls.gov
**Verified by:** Direct web fetch from each BLS timeseries URL

### How AB 1482 Uses CPI — Two Periods Per Year

Per Civil Code 1947.12(g)(3):
- For rent increases effective **before August 1**: use the April-to-April change from the **prior** year (April 2024 → April 2025).
- For rent increases effective **on or after August 1**: use the **most recent** April-to-April change (April 2025 → April 2026).

The calculator must determine which period applies based on the proposed effective date.

### BLS Metropolitan Areas Published for California:

**Source URLs:**
- LA: https://data.bls.gov/timeseries/CUURS49ASA0?output_view=pct_12mths
- SF: https://data.bls.gov/timeseries/CUURS49BSA0?output_view=pct_12mths
- Riverside: https://data.bls.gov/timeseries/CUURS49CSA0?output_view=pct_12mths
- San Diego: https://data.bls.gov/timeseries/CUURS49ESA0?output_view=pct_12mths
- West Region: https://data.bls.gov/timeseries/CUUR0400SA0?output_view=pct_12mths

### PERIOD 1: Increases effective BEFORE August 1, 2026 (April 2024 → April 2025 CPI)

| Metro Area | BLS Series ID | April 2025 CPI-U 12-mo Change | AB 1482 Max (5% + CPI) |
|---|---|---|---|
| Los Angeles-Long Beach-Anaheim | CUURS49ASA0 | **3.0%** | **8.0%** |
| San Francisco-Oakland-Hayward | CUURS49BSA0 | **2.5%** | **7.5%** |
| Riverside-San Bernardino-Ontario | CUURS49CSA0 | **3.5%** | **8.5%** |
| San Diego-Carlsbad | CUURS49ESA0 | **4.0%** | **9.0%** |
| West Region (all urban consumers) | CUUR0400SA0 | **2.1%** | **7.1%** |

All five April 2025 values verified directly against BLS data series on June 10, 2026.

### PERIOD 2: Increases effective ON OR AFTER August 1, 2026 (April 2025 → April 2026 CPI)

| Metro Area | BLS Series ID | April 2026 CPI-U 12-mo Change | AB 1482 Max (5% + CPI) | Status |
|---|---|---|---|---|
| Los Angeles-Long Beach-Anaheim | CUURS49ASA0 | **3.7%** | **8.7%** | Published |
| San Francisco-Oakland-Hayward | CUURS49BSA0 | **Not yet published** | TBD | Bimonthly series; latest is Feb 2026 (3.8%). April expected ~July 2026. |
| Riverside-San Bernardino-Ontario | CUURS49CSA0 | **Not yet published** | TBD | Latest is Mar 2026 (3.4%). |
| San Diego-Carlsbad | CUURS49ESA0 | **Not yet published** | TBD | Latest is Mar 2026 (3.8%). |
| West Region (all urban consumers) | CUUR0400SA0 | **3.5%** | **8.5%** | Published |

**Note:** BLS publishes some metro CPI on a bimonthly schedule. As of June 10, 2026, only LA and West Region have April 2026 data. SF, Riverside, and San Diego April 2026 values are expected by mid-July 2026.

**Calculator behavior for unpublished April 2026 data:**
For regions where April 2026 CPI is not yet available and the user selects an effective date on/after August 1, 2026:
- Show a notice: "The August 2026+ rate for your region has not been published by BLS yet. Showing the pre-August rate. Check back after mid-July 2026."
- Use the Period 1 (April 2025) values as a conservative fallback.
- The config file should be updated as soon as BLS publishes each region's April 2026 data.

### Latest Available Data Points (non-April) for Reference

For regions where April 2026 is not yet published, these are the most recent available 2026 monthly values (for context only — AB 1482 specifically uses the April-to-April change):

| Metro Area | Latest Month | 12-mo Change |
|---|---|---|
| San Francisco-Oakland-Hayward | Feb 2026 | 3.8% |
| Riverside-San Bernardino-Ontario | Mar 2026 | 3.4% |
| San Diego-Carlsbad | Mar 2026 | 3.8% |

### Which CPI Region Applies to Which Properties:

- **Los Angeles County, Orange County, Ventura County** → Los Angeles-Long Beach-Anaheim CPI
- **San Francisco, Alameda, Contra Costa, Marin, San Mateo counties** → San Francisco-Oakland-Hayward CPI
- **Riverside, San Bernardino counties** → Riverside-San Bernardino-Ontario CPI
- **San Diego County** → San Diego-Carlsbad CPI
- **Sacramento and all other California counties** not in a published BLS metro area → **West Region CPI** (per the statutory fallback in Civil Code 1947.12(g)(2))

**Note on SF CPI region naming:** The SF Rent Board references "San Francisco-Oakland-San Jose" which is the older BLS name for the same area now called "San Francisco-Oakland-Hayward." Same data series.

**IMPORTANT NOTE ON BLS DATA GAPS:** Due to the 2025 lapse in federal appropriations, some months show "(X)" for data unavailability. April 2025 data IS available for all major California metros. April 2026 data is available for LA and West Region only as of June 10, 2026.

---

## 4. NOTICE REQUIREMENTS

**Source:** California Civil Code Section 827
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=827.&lawCode=CIV

### 30-Day Notice:
Required for rent increases of **10% or less** of the rental amount within a 12-month period.

### 90-Day Notice:
Required for rent increases **exceeding 10%** of the rental amount within a 12-month period.

### Recent Amendment:
Section 827 was amended by **SB 1103** (Stats. 2024, Ch. 1015, Sec. 1), effective **January 1, 2025**. This amendment expanded notice protections to "qualified commercial tenants" (microenterprises, restaurants with fewer than 10 employees, and nonprofits with fewer than 20 employees).

### Special Exception:
If a rent increase results from a tenant's income or family composition change requiring statutory recertification, the 30-day notice period applies regardless of the percentage of increase.

### Practical Note for AB 1482:
Under AB 1482, rent increases are capped at a maximum of 10% (the hard cap), so the 90-day notice would generally only apply when combining multiple increases within 12 months that cumulatively exceed 10%, or for units not covered by AB 1482.

---

## 5. FREQUENCY RULES

**Source:** Civil Code 1947.12(a)(2)
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1947.12.&lawCode=CIV

- Maximum of **2 rent increases per 12-month period** for existing tenants.
- The **combined total** of all increases within any 12-month period cannot exceed the annual cap (5% + CPI, or 10%, whichever is lower).
- If a landlord gives two increases totaling the full allowable amount, they must wait 12 months from the effective date of the first increase before increasing again.

---

## 6. LOCAL ORDINANCES THAT OVERRIDE AB 1482

AB 1482 does NOT preempt stricter local rent control. Where a local ordinance sets a LOWER cap than AB 1482, the local ordinance controls. Where a local ordinance allows a HIGHER increase, AB 1482's cap applies as a ceiling.

### Cities with Their Own Rent Control (2025-2026 Rates):

| City | Allowable Increase | Effective Period | Formula Basis | Source |
|---|---|---|---|---|
| **Los Angeles (RSO)** | **3%** (+ 1% if landlord pays gas/electric) | Jul 1, 2025 - Jun 30, 2026 | Set by LAHD | DuckDuckGo search results citing LAHD |
| **San Francisco** | **1.4%** | Mar 1, 2025 - Feb 28, 2026 | 60% of SF-Oakland-San Jose CPI (Oct-Oct) | DuckDuckGo search citing SF Rent Board |
| **Oakland** | **0.8%** | Aug 1, 2025 - Jul 31, 2026 | 60% of local CPI, capped at 3% | DuckDuckGo search citing Rent Adjustment Program |
| **Berkeley** | **1.0%** (2026 AGA) | Jan 1, 2026 onward | 65% of CPI | DuckDuckGo search citing Berkeley Rent Board |
| **Santa Monica** | **2.3%** (max $60) | Sep 1, 2025 - Aug 31, 2026 | Determined by Rent Control Board | DuckDuckGo search citing SM Rent Control |
| **West Hollywood** | **2.25%** | Sep 1, 2025 - Aug 31, 2026 | 75% of LA-Long Beach-Anaheim CPI | DuckDuckGo search citing WeHo Rent Stabilization |
| **Beverly Hills** | **3.9%** | Through Jun 2025 | CPI-based (May-May) | DuckDuckGo search citing BH Renters Alliance |
| **San Jose (CSFRA)** | **2.7%** | Sep 1, 2025 onward | CPI-based | DuckDuckGo search citing Rental Housing Committee |
| **Mountain View (CSFRA)** | **2.7%** | Sep 1, 2025 onward | CPI-based | DuckDuckGo search results |
| **Richmond** | **1.62%** | 2025 | AGA set by Rent Board | DuckDuckGo search citing Richmond Rent Board |
| **Alameda** | **1.0%** | Sep 1, 2025 - Aug 31, 2026 | AGA cap | DuckDuckGo search citing Alameda housing |
| **East Palo Alto** | Vacancy control (stricter) | Ongoing | Local ordinance | Wikipedia |
| **Hayward** | Up to 5% | Ongoing | Set by ordinance | Wikipedia |
| **Los Gatos** | Up to 5% | Ongoing | Set by ordinance | Wikipedia |
| **Palm Springs** | Varies | Ongoing | Local ordinance | Wikipedia |
| **Sacramento** | Local protections since 2019 | Varies | Local ordinance | Wikipedia |

**Source for Wikipedia data:** https://en.wikipedia.org/wiki/Rent_control_in_California
**Note:** Beverly Hills rate of 3.9% is "through June 2025" — a newer rate for July 2025+ should be verified.
**Note:** The Hayward, Los Gatos, Palm Springs, and Sacramento rates above are from older Wikipedia data and should be independently verified.

---

## 7. SUNSET DATE

**Current Statutory Text:** "This section shall remain in effect until **January 1, 2030**, and as of that date is repealed."
**Source:** Civil Code 1947.12 (as currently published on leginfo.legislature.ca.gov)
**URL:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1947.12.&lawCode=CIV

### Conflicting Information on Extension to 2035:
- Multiple search results (from DuckDuckGo) claim the sunset has been "extended to January 1, 2035."
- One source states: "AB 1482 was originally scheduled to sunset (expire) on January 1, 2030. However, the California legislature extended the law, and it is now set to expire on January 1, 2035."
- Another source references Governor Newsom signing "a package of bills" on **October 6, 2025**, but does not identify the specific bill number.
- **However**, the current statutory text on leginfo.legislature.ca.gov still reads "January 1, 2030."

### Assessment:
**[REQUIRES HUMAN VERIFICATION]** The discrepancy could mean:
1. An extension bill was signed in late 2025 but the leginfo database has not yet been updated with the new text, OR
2. The search result sources are inaccurate or are citing proposed (not enacted) legislation.

The specific bill number for any extension has NOT been confirmed. AB 1157 (2025-2026 session, introduced Feb 20, 2025, amended Mar 27, 2025) proposes to eliminate the sunset entirely, but its current status is unclear -- it was described as having "stalled in 2025."

**Recommendation:** Check leginfo.legislature.ca.gov directly for the most current text of Section 1947.12, and search for any bills signed in October 2025 that amended this section.

---

## 8. 2025-2026 AMENDMENTS AND PENDING LEGISLATION

### Enacted Changes:

1. **SB 567 (2023, Stats. Ch. 290):** Previously amended Section 1947.12, operative April 1, 2024. This is the most recent amendment reflected in the current statutory text.
   - **Source:** Legislative history line in Section 1947.12

2. **SB 1103 (2024, Stats. Ch. 1015):** Amended Civil Code Section 827 (notice requirements), effective January 1, 2025. Extended commercial tenant notice protections.
   - **Source:** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=827.&lawCode=CIV

3. **AB 846 (2024):** Signed by Governor Newsom September 2024, effective January 1, 2025. Establishes rent increase limits for affordable housing developments (LIHTC properties) where at least 80% of units are restricted as affordable. This is separate from but related to AB 1482.
   - **Source:** DuckDuckGo search results

### Pending / Proposed Legislation (2025-2026 Session):

1. **AB 1157 (Kalra, 2025):** Would make major changes if passed:
   - Reduce rent cap from "5% + CPI or 10%" to **"2% + CPI or 5%"**
   - Remove the single-family home and condo exemption
   - Eliminate the 2030 sunset date entirely (make protections permanent)
   - Introduced Feb 20, 2025; amended Mar 27, 2025
   - Status as of May 2026: **[UNCLEAR — described as "stalled" in one source]**
   - **Source:** https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1157

2. **SB 52 (Perez, 2025):** Prohibits algorithmic rental pricing software that coordinates pricing across multiple landlords. NOT a direct amendment to AB 1482 but affects rent-setting practices.
   - **Source:** https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB52

3. **AB 754 (Connolly, 2025):** Addresses floating home marina rent caps, amending Civil Code 800.40.6.
   - **Source:** Legislative search results

---

## 9. SUMMARY TABLE: AB 1482 RENT CAP BY REGION

### Period 1: Effective before August 1, 2026 (using April 2024 → April 2025 CPI)

| Region | CPI Change | AB 1482 Cap |
|---|---|---|
| Los Angeles-Long Beach-Anaheim | 3.0% | **8.0%** |
| San Francisco-Oakland-Hayward | 2.5% | **7.5%** |
| Riverside-San Bernardino-Ontario | 3.5% | **8.5%** |
| San Diego-Carlsbad | 4.0% | **9.0%** |
| West Region (Sacramento, etc.) | 2.1% | **7.1%** |

### Period 2: Effective August 1, 2026+ (using April 2025 → April 2026 CPI)

| Region | CPI Change | AB 1482 Cap | Status |
|---|---|---|---|
| Los Angeles-Long Beach-Anaheim | 3.7% | **8.7%** | Published |
| San Francisco-Oakland-Hayward | TBD | TBD | Pending (~July 2026) |
| Riverside-San Bernardino-Ontario | TBD | TBD | Pending |
| San Diego-Carlsbad | TBD | TBD | Pending |
| West Region (Sacramento, etc.) | 3.5% | **8.5%** | Published |

All values verified directly against BLS data series on June 10, 2026.

---

## 10. KEY CAVEATS AND ITEMS REQUIRING HUMAN VERIFICATION

1. **Sunset date:** Is it still January 1, 2030, or has it been extended to January 1, 2035? The statute currently says 2030, but multiple secondary sources claim 2035. **This must be resolved before coding.**

2. **Beverly Hills rate:** The 3.9% figure is cited as "through June 2025" -- the rate for July 2025+ needs to be obtained.

3. **Berkeley 2025 AGA vs 2026 AGA:** Search results mention 1.9% for 2024/2025 and 1.0% for 2026. The exact dates and current rate should be confirmed on the Berkeley Rent Board website.

4. **BLS data gaps:** Due to the 2025 appropriations lapse, some months show data gaps. April 2025 data IS available for all California metros, but some secondary sources may be using different months.

5. **Sacramento CPI:** The West Region CPI is used as a fallback, but verify whether the California Department of Industrial Relations publishes a separate California CPI that might be more specific.

6. **Hayward, Los Gatos, Palm Springs, East Palo Alto:** Specific 2025-2026 rates were not successfully retrieved and need manual verification.

7. **AB 1157 status:** Whether this bill has progressed or died in committee is unclear from available sources.

8. **San Francisco CPI note:** The SF Rent Board uses the October-to-October CPI change for its own ordinance, calculated as 60% of SF-Oakland-San Jose CPI. This is a different CPI region name than what BLS publishes ("San Francisco-Oakland-Hayward"). Verify whether these are the same or different series.

9. **"San Francisco-Oakland-San Jose" vs "San Francisco-Oakland-Hayward":** BLS renamed this metro area. The SF Rent Board may still reference the older name. These are the same geographic area / data series.

---

## APPENDIX: DATA SOURCE URLS

| Data Point | URL |
|---|---|
| Civil Code 1947.12 (rent cap) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1947.12.&lawCode=CIV |
| Civil Code 1946.2 (just cause) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1946.2.&lawCode=CIV |
| Civil Code 827 (notice) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=827.&lawCode=CIV |
| BLS CPI-U LA | https://data.bls.gov/timeseries/CUURS49ASA0?output_view=pct_12mths |
| BLS CPI-U SF | https://data.bls.gov/timeseries/CUURS49BSA0?output_view=pct_12mths |
| BLS CPI-U Riverside | https://data.bls.gov/timeseries/CUURS49CSA0?output_view=pct_12mths |
| BLS CPI-U San Diego | https://data.bls.gov/timeseries/CUURS49ESA0?output_view=pct_12mths |
| BLS CPI-U West Region | https://data.bls.gov/timeseries/CUUR0400SA0?output_view=pct_12mths |
| AB 1157 (2025-2026) | https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260AB1157 |
| SB 52 (2025-2026) | https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB52 |
| Wikipedia - CA Rent Control | https://en.wikipedia.org/wiki/Rent_control_in_California |
