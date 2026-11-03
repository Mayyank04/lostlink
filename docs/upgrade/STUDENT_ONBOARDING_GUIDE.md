# LostLink 2.0 — Student User Guide

> **Tagline:** *"Lost something? Let's find it together."*  
> **Audience:** Students, Faculty, and Campus Community Members  

---

## 1. Registering Your Student Account

1. Navigate to `/auth/register`.
2. Enter your **Full Name** and select your **Enrolled College / University** from the dropdown menu.
   - *Note:* The dropdown is dynamically connected to the live institution registry.
3. Enter your official university email address (e.g. `maya.lin@apex.edu`).
   - If your email domain matches your university's approved list, an instant confirmation badge appears: **"Domain verified for instant access"**.
4. Create a secure password (at least 8 characters).
5. Click **Continue to Institutional Verification**.

---

## 2. Reporting a Lost Belonging

1. From your student dashboard (`/dashboard`), click **+ Report Lost Item**.
2. Fill out the report form:
   - **Item Category:** Electronics, Bags, Keys, IDs, Clothing, etc.
   - **Item Name & Brand:** e.g., *Sony WH-1000XM5 Headphones (Silver)*.
   - **Colors:** Primary and secondary colors.
   - **Date & Approximate Time:** When you last had the item.
   - **Campus Location & Building:** e.g., *Main Library, 2nd Floor Quiet Study Area*.
3. **Private Evidence (Zero-Knowledge):**
   - Provide secret details only the true owner would know (e.g., serial number, internal sticker, passcode hint, lock screen wallpaper description).
   - *Privacy Guarantee:* These private verification details are encrypted and hidden from other students and the general public.
4. Click **Submit Lost Report**.

---

## 3. Reporting a Found Item

1. Click **+ Report Found Item**.
2. Enter the item description, category, and where you discovered it.
3. Upload clear photos of the item.
4. **Campus Desk Deposit:**
   - Indicate whether you are turning the item in to the Campus Security Return Desk or holding onto it safely until the verified owner is identified.
5. Submit the report.

---

## 4. Smart Matching Engine

Immediately after submitting a report, LostLink's rule-based engine compares:
- Item Category & Subcategory
- Brand, Color, and Secondary Color
- Date & Time Incident Window
- Campus Building & Specific Location

If a match scores above the platform confidence threshold (>= 0.65), a **Potential Match Notification** is delivered to both the owner and the finder.

---

## 5. Claiming Ownership & Secure Handover

1. View the potential match on your dashboard or `/matches` page.
2. Click **Submit Ownership Claim**.
3. Answer the blind security questions to prove you are the genuine owner.
4. Once the college administrator or finder reviews and approves the claim:
   - You can chat securely via in-app end-to-end messaging to coordinate a meetup.
   - A **6-Digit One-Time Password (OTP)** will appear on your device screen.
5. Present the 6-digit code at the campus return desk or to the finder to verify the handover. Once entered, the item is marked as officially **RETURNED**.

